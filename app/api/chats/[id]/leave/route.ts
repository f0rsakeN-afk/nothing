import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis, { KEYS } from "@/lib/redis";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import {
  requireChatAccess,
  invalidateMemberCache,
  invalidateRoleCache,
} from "@/lib/chat-access";
import { checkApiRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { publishMemberRemoved } from "@/services/chat-pubsub.service";

/**
 * POST /api/chats/:id/leave - Leave a chat (voluntary departure)
 *
 * Security:
 * - Any member can leave (except owner cannot leave their own chat)
 * - Uses transaction for atomic delete
 * - Idempotent - returns success if already not a member
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimit = await checkApiRateLimit(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;

    // Must be a member to leave (VIEWER or EDITOR)
    await requireChatAccess(user.id, chatId, "VIEWER");

    // Use transaction for atomic delete with checks
    await prisma.$transaction(async (tx) => {
      // Check if trying to leave as owner (owner cannot leave their own chat)
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: { userId: true },
      });

      if (chat?.userId === user.id) {
        throw new Error("OWNER_CANNOT_LEAVE");
      }

      // Verify member exists (idempotent)
      const existing = await tx.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId: user.id } },
      });

      if (!existing) {
        throw new Error("MEMBER_NOT_FOUND");
      }

      // Delete member
      await tx.chatMember.delete({
        where: { chatId_userId: { chatId, userId: user.id } },
      });
    }, {
      maxWait: 5000,
      timeout: 10000,
    });

    // Invalidate caches
    await Promise.all([
      invalidateMemberCache(chatId),
      invalidateRoleCache(chatId, user.id),
    ]);

    // Clean up presence data immediately
    try {
      await redis.hdel(KEYS.chatPresence(chatId), user.id);
    } catch {
      // Redis error, presence will expire naturally via TTL
    }

    // Publish member removed event for real-time collaboration updates
    await publishMemberRemoved(chatId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "OWNER_CANNOT_LEAVE") {
        return NextResponse.json({ error: "Chat owner cannot leave the chat. Transfer ownership first." }, { status: 400 });
      }
      if (error.message === "MEMBER_NOT_FOUND") {
        // Idempotent - already not a member
        return NextResponse.json({ success: true });
      }
      if (error.message.startsWith("Access denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Leave chat error:", error);
    return NextResponse.json({ error: "Failed to leave chat" }, { status: 500 });
  }
}