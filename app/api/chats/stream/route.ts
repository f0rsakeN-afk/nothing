/**
 * Chat List SSE Stream
 * GET /api/chats/stream - Real-time updates to chat list
 *
 * Subscribe to: new chats, renamed chats, archived/deleted chats
 * Uses Redis Pub/Sub to broadcast to all user's devices
 *
 * Edge cases:
 * - Multiple tabs: All get updates via Redis Pub/Sub
 * - Connection drop: Client reconnects automatically
 * - User logs out: Invalidate session
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser, AccountDeactivatedError } from "@/lib/auth";
import { redisPubSub } from "@/lib/redis";
import { CHANNELS } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Rate limiting for SSE stream
  const rateLimit = await checkRateLimitWithAuth(request, "default");
  if (!rateLimit.success) {
    return rateLimitError(rateLimit);
  }

  let user;
  try {
    user = await getOrCreateUser(request);
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const channel = CHANNELS.sidebar(userId);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: unknown, event = "message") => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Send connected event
      sendEvent({ type: "connected", userId }, "connected");

      // Message handler
      const messageHandler = (receivedChannel: string, message: string) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message);
            sendEvent(data);
          } catch {
            // Ignore malformed
          }
        }
      };

      // Subscribe
      redisPubSub.subscribe(channel).catch((err) => {
        logger.error("[ChatsStream] Subscribe failed", err);
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
      "X-Accel-Buffering": "no",
    },
  });
}
