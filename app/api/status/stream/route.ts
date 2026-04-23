/**
 * Status SSE Stream - Real-time status updates
 * Requires authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { redisPubSub, CHANNELS } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await validateAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const channel = CHANNELS.status();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      const safeClose = () => {
        if (!isClosed) {
          isClosed = true;
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      };

      const sendEvent = (data: object) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          safeClose();
        }
      };

      // Subscribe without waiting
      redisPubSub.subscribe(channel).catch(() => {});

      const messageHandler = (ch: string, msg: string) => {
        if (ch === channel) {
          try {
            const data = JSON.parse(msg);
            sendEvent(data);
          } catch {
            // Ignore
          }
        }
      };

      redisPubSub.on("message", messageHandler);

      // Keepalive every 25s
      const keepalive = setInterval(() => {
        if (isClosed) {
          clearInterval(keepalive);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepalive);
          safeClose();
        }
      }, 25000);

      // Send initial connected
      sendEvent({ type: "connected", timestamp: new Date().toISOString() });

      // Cleanup on abort
      return () => {
        clearInterval(keepalive);
        redisPubSub.off("message", messageHandler);
        redisPubSub.unsubscribe(channel).catch(() => {});
        safeClose();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
