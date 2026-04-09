import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { redisPubSub, CHANNELS } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await stackServerApp.getUser({ tokenStore: request });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const channel = CHANNELS.sidebar(user.id);
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

      const subscriber = (message: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${message}\n\n`)
          );
        } catch {
          // Controller closed
        }
      };

      // Subscribe to Redis channel - don't await, let it run in background
      redisPubSub.subscribe(channel).catch(console.error);

      // Handle incoming messages
      const messageHandler = (ch: string, msg: string) => {
        if (ch === channel) {
          subscriber(msg);
        }
      };

      redisPubSub.on("message", messageHandler);

      // Send keepalive every 30 seconds
      const keepalive = setInterval(() => {
        if (isClosed) {
          clearInterval(keepalive);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener("abort", async () => {
        clearInterval(keepalive);
        redisPubSub.off("message", messageHandler);
        redisPubSub.unsubscribe(channel).catch(() => {});
        safeClose();
      });

      // Send initial connection event immediately
      try {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
        );
      } catch {
        // Controller closed
      }
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
