/**
 * AI Stream Endpoint
 * GET /api/chats/:id/ai-stream - Resume AI streaming for a chat
 *
 * Handles stream resumption when page reloads with active streaming
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { getChatMessages } from "@/lib/stack-server";
import { createResumableUIMessageStream } from "ai-resumable-stream";
import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { differenceInSeconds } from "date-fns";
import { createClient } from "redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return createClient({ url: "redis://localhost:6380" });
  }
  return createClient({ url: redisUrl });
}

const globalForResumable = global as unknown as {
  resumableRedis: ReturnType<typeof createClient>;
  resumableRedisSub: ReturnType<typeof createClient>;
};

if (!globalForResumable.resumableRedis) {
  globalForResumable.resumableRedis = createRedisClient();
  globalForResumable.resumableRedisSub = createRedisClient();
}

const redisResumable = globalForResumable.resumableRedis;
const redisResumableSub = globalForResumable.resumableRedisSub;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: chatId } = await params;

    // Get the latest stream ID for this chat from Redis
    // For now, try to resume the stream
    try {
      const context = await createResumableUIMessageStream({
        streamId: `chat:${chatId}:stream`,
        publisher: redisResumable,
        subscriber: redisResumableSub,
      });

      const stream = await context.resumeStream();

      // No active stream - check if there's a recent message to restore
      if (!stream) {
        // Get the most recent message from DB
        const messages = await getChatMessages(chatId, user.id, 1, undefined, "before");
        const mostRecentMessage = messages.messages[0];

        if (!mostRecentMessage) {
          return new NextResponse(null, { status: 204 });
        }

        // Only restore if message is recent (within 15 seconds)
        // This prevents showing old messages as "streaming"
        const messageCreatedAt = new Date(mostRecentMessage.createdAt);
        const now = new Date();
        const secondsSinceCreation = differenceInSeconds(now, messageCreatedAt);

        if (secondsSinceCreation > 15) {
          return new NextResponse(null, { status: 204 });
        }

        if (mostRecentMessage.role !== "assistant") {
          return new NextResponse(null, { status: 204 });
        }

        // Restore the message as a completed stream
        const restoredStream = createUIMessageStream({
          execute: ({ writer }) => {
            writer.write({
              type: "data-appendMessage",
              data: JSON.stringify(mostRecentMessage),
              transient: true,
            });
          },
        });

        return new Response(
          restoredStream.pipeThrough(new JsonToSseTransformStream()),
          {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          }
        );
      }

      // Stream exists and is active - return it
      return new Response((stream as ReadableStream).pipeThrough(new JsonToSseTransformStream()), {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      console.error("[AIStream] Resume error:", error);
      return new NextResponse(null, { status: 204 });
    }
  } catch (error) {
    console.error("[AIStream] Error:", error);
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
