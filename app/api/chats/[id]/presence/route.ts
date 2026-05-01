import { NextRequest, NextResponse } from "next/server";
import redis, { KEYS } from "@/lib/redis";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import { requireChatAccess } from "@/lib/chat-access";
import { ChatRole } from "@/src/generated/prisma/client";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

const PRESENCE_TTL = 60; // 60 seconds

/**
 * GET /api/chats/:id/presence - Get active users in a chat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;

    // Check access
    await requireChatAccess(user.id, chatId, "VIEWER");

    // Get presence from Redis
    const presenceKey = KEYS.chatPresence(chatId);
    const presenceData = await redis.hgetall(presenceKey);

    const now = Date.now();
    const activeUsers: { userId: string; lastSeen: number }[] = [];
    const staleUserIds: string[] = [];

    for (const [userId, lastSeen] of Object.entries(presenceData)) {
      const lastSeenNum = parseInt(lastSeen, 10);
      // Only include users seen in the last 60 seconds
      if (now - lastSeenNum < PRESENCE_TTL * 1000) {
        activeUsers.push({ userId, lastSeen: lastSeenNum });
      } else {
        // Collect stale entries for batch deletion
        staleUserIds.push(userId);
      }
    }

    // Batch delete stale entries using pipeline
    if (staleUserIds.length > 0) {
      const pipeline = redis.pipeline();
      for (const userId of staleUserIds) {
        pipeline.hdel(presenceKey, userId);
      }
      await pipeline.exec();
    }

    // Sort by last seen (most recent first)
    activeUsers.sort((a, b) => b.lastSeen - a.lastSeen);

    return NextResponse.json({ activeUsers });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Get presence error:", error);
    return NextResponse.json({ error: "Failed to get presence" }, { status: 500 });
  }
}

/**
 * POST /api/chats/:id/presence - Update presence (heartbeat)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;

    // Check access (any role)
    await requireChatAccess(user.id, chatId, "VIEWER");

    // Update presence in Redis
    const presenceKey = KEYS.chatPresence(chatId);
    await redis.hset(presenceKey, user.id, Date.now().toString());
    await redis.expire(presenceKey, PRESENCE_TTL);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Update presence error:", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}