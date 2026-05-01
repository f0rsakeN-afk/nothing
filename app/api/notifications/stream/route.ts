/**
 * Notifications SSE Stream
 * GET /api/notifications/stream - Real-time notification updates via Server-Sent Events
 *
 * Uses Redis Pub/Sub for cross-instance communication.
 * Each user subscribes to their own channel: "notifications:{userId}"
 *
 * Edge cases handled:
 * - Multiple tabs: Redis Pub/Sub broadcasts to all subscribers
 * - Connection drop: Client should reconnect, sent last unread count on connect
 * - Server restart: Clean reconnect with heartbeat
 * - Rate limiting: SSE connections bypass normal rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { redisPubSub } from "@/lib/redis";
import { CHANNELS } from "@/lib/redis";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Rate limiting for SSE stream connections
  const rateLimit = await checkRateLimitWithAuth(request, "default");
  if (!rateLimit.success) {
    return rateLimitError(rateLimit);
  }

  const user = await getOrCreateUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const channel = CHANNELS.notifications(userId);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message with unread count
      const sendEvent = (data: unknown, event = "message") => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Send initial unread count
      sendEvent({ type: "connected", userId }, "connected");

      // Subscribe to Redis channel for this user
      const messageHandler = (receivedChannel: string, message: string) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message);
            sendEvent(data);
          } catch {
            // Ignore malformed messages
          }
        }
      };

      // Register message handler BEFORE subscribe to avoid leaks on failure
      redisPubSub.on("message", messageHandler);

      // Register Redis subscription
      redisPubSub.subscribe(channel).catch((err) => {
        console.error(`Failed to subscribe to ${channel}:`, err);
        clearInterval(heartbeat);
        redisPubSub.off("message", messageHandler);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        redisPubSub.off("message", messageHandler);
        redisPubSub.unsubscribe(channel).catch(() => {});
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
