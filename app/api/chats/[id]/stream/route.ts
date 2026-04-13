/**
 * Chat SSE Stream
 * GET /api/chats/:id/stream - Real-time updates for a specific chat
 *
 * Subscribe to: new messages, message updates, typing indicators
 * Uses Redis Pub/Sub to broadcast to all user's devices viewing this chat
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser, AccountDeactivatedError } from "@/lib/auth";
import { redisPubSub } from "@/lib/redis";
import { CHANNELS } from "@/lib/redis";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id: chatId } = await params;

  // Verify user owns this chat
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: user.id },
    select: { id: true, title: true },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const channel = CHANNELS.chat(chatId);

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
      sendEvent({ type: "connected", chatId }, "connected");

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
        console.error(`[ChatStream] Subscribe failed:`, err);
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
