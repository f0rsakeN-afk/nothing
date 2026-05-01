import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis, { KEYS } from "@/lib/redis";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import {
  requireChatAccess,
  invalidateMemberCache,
  invalidateRoleCache,
} from "@/lib/chat-access";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import { publishMemberAdded } from "@/services/chat-pubsub.service";

const PRESENCE_TTL = 60; // 60 seconds - must match presence route

/**
 * GET /api/chats/:id/members - List all members of a chat
 *
 * Cache: First page cached for 30 seconds
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    // Any authenticated member can view the member list
    await requireChatAccess(user.id, chatId, "VIEWER");

    const members = await prisma.chatMember.findMany({
      where: { chatId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    // Get presence data from Redis
    const presenceKey = KEYS.chatPresence(chatId);
    const presenceData = await redis.hgetall(presenceKey);
    const now = Date.now();

    // Add lastActive to each member
    const membersWithPresence = members.map((member) => {
      const lastSeenStr = presenceData[member.userId];
      const lastSeen = lastSeenStr ? parseInt(lastSeenStr, 10) : null;
      const isActive = lastSeen && (now - lastSeen < PRESENCE_TTL * 1000);

      return {
        ...member,
        lastActive: lastSeen ? new Date(lastSeen).toISOString() : null,
        isActive: isActive || false,
      };
    });

    const hasMore = membersWithPresence.length > limit;
    const results = hasMore ? membersWithPresence.slice(0, -1) : membersWithPresence;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    return NextResponse.json({
      members: results,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Get chat members error:", error);
    return NextResponse.json({ error: "Failed to get members" }, { status: 500 });
  }
}

/**
 * POST /api/chats/:id/members - Add a member directly (bypass invitation)
 * Body: { userId: string, role?: "VIEWER" | "EDITOR" }
 *
 * Security:
 * - Rate limited to prevent member spam
 * - Uses transaction for atomic add
 * - Validates target user exists
 * - Idempotent - returns existing member if already added
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimitWithAuth(request, "chat");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const body = await request.json().catch(() => ({}));
    const { userId: targetUserId, role = "VIEWER" } = body;

    // Input validation
    if (!targetUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!["VIEWER", "EDITOR"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Cannot add yourself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Cannot add yourself as a member" }, { status: 400 });
    }

    // Check user's permission to invite
    const userRole = await requireChatAccess(user.id, chatId, "EDITOR");
    // Editors and Owners can add members, Viewers cannot
    if (userRole === "VIEWER") {
      return NextResponse.json({ error: "You cannot add members" }, { status: 403 });
    }

    // Use transaction for atomic add
    const member = await prisma.$transaction(async (tx) => {
      // Verify target user exists
      const targetUser = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });

      if (!targetUser) {
        throw new Error("USER_NOT_FOUND");
      }

      // Check if already a member (idempotent)
      const existing = await tx.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId: targetUserId } },
        include: {
          user: { select: { id: true, email: true } },
        },
      });

      if (existing) {
        throw new Error("ALREADY_MEMBER");
      }

      // Add member
      return tx.chatMember.create({
        data: {
          chatId,
          userId: targetUserId,
          role: role as "VIEWER" | "EDITOR",
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });
    }, {
      maxWait: 5000,
      timeout: 10000,
    });

    // Invalidate caches
    await Promise.all([
      invalidateMemberCache(chatId),
      invalidateRoleCache(chatId, targetUserId),
    ]);

    // Publish member added event for real-time collaboration updates
    await publishMemberAdded(chatId, member.userId);

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (error.message === "ALREADY_MEMBER") {
        return NextResponse.json({ error: "User is already a member" }, { status: 409 });
      }
      if (error.message.startsWith("Access denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Add chat member error:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}