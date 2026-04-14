/**
 * Credits SSE Stream
 * GET /api/credits/stream - Real-time credit updates via Server-Sent Events
 *
 * Uses Redis Pub/Sub for cross-instance communication.
 * Each user subscribes to their own channel: "credits:{userId}"
 *
 * Edge cases handled:
 * - Multiple tabs: Redis Pub/Sub broadcasts to all subscribers
 * - Connection drop: Client should reconnect with exponential backoff
 * - Server restart: Clean reconnect with heartbeat
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { redisPubSub } from "@/lib/redis";
import { CHANNELS } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getOrCreateUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const channel = CHANNELS.credits(userId);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      let encoder = new TextEncoder();

      // Send initial connection message
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

      // Send initial connected event
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

      // Register Redis subscription
      redisPubSub.subscribe(channel).catch((err) => {
        console.error(`Failed to subscribe to ${channel}:`, err);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      redisPubSub.on("message", messageHandler);

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
