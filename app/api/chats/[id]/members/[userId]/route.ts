import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import {
  requireChatAccess,
  invalidateMemberCache,
  invalidateRoleCache,
} from "@/lib/chat-access";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import { publishMemberAdded, publishMemberRemoved, publishMemberRoleChanged } from "@/services/chat-pubsub.service";

/**
 * PATCH /api/chats/:id/members/:userId - Update a member's role
 * Body: { role: "VIEWER" | "EDITOR" }
 *
 * Security:
 * - Only OWNER can change roles
 * - Cannot change OWNER's role (they're stored as chat.userId, not in ChatMember)
 * - Cannot change your own role
 * - Uses transaction for atomic update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId, userId: targetUserId } = await params;
    const body = await request.json().catch(() => ({}));
    const { role } = body;

    // Input validation
    if (!["VIEWER", "EDITOR"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Must be OWNER to change roles
    await requireChatAccess(user.id, chatId, "OWNER");

    // Cannot modify owner (chat.userId, not a ChatMember)
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { userId: true },
    });

    if (chat?.userId === targetUserId) {
      return NextResponse.json({ error: "Cannot modify the chat owner's role" }, { status: 400 });
    }

    // Cannot modify your own role (prevents accidental self-demotion)
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Cannot modify your own role" }, { status: 400 });
    }

    // Use transaction for atomic update
    const member = await prisma.$transaction(async (tx) => {
      // Verify member exists
      const existing = await tx.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId: targetUserId } },
      });

      if (!existing) {
        throw new Error("MEMBER_NOT_FOUND");
      }

      // Cannot change owner's role (redundant check but explicit)
      if (existing.role === "OWNER") {
        throw new Error("CANNOT_MODIFY_OWNER");
      }

      // Update role
      return tx.chatMember.update({
        where: { chatId_userId: { chatId, userId: targetUserId } },
        data: { role: role as "VIEWER" | "EDITOR" },
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

    // Publish role changed event for real-time collaboration updates
    await publishMemberRoleChanged(chatId, targetUserId, role);

    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "MEMBER_NOT_FOUND") {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      if (error.message === "CANNOT_MODIFY_OWNER") {
        return NextResponse.json({ error: "Cannot modify the chat owner's role" }, { status: 400 });
      }
      if (error.message.startsWith("Access denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Update chat member error:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

/**
 * POST /api/chats/:id/members/:userId/transfer - Transfer ownership to another member
 *
 * Security:
 * - Only OWNER can transfer ownership
 * - Target must be an existing member (EDITOR or VIEWER)
 * - Uses transaction for atomic update
 * - Old owner becomes EDITOR
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId, userId: targetUserId } = await params;

    // Must be OWNER to transfer ownership
    await requireChatAccess(user.id, chatId, "OWNER");

    // Cannot transfer to yourself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Cannot transfer ownership to yourself" }, { status: 400 });
    }

    // Use transaction for atomic update
    const updatedMember = await prisma.$transaction(async (tx) => {
      // Verify target member exists
      const targetMember = await tx.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId: targetUserId } },
      });

      if (!targetMember) {
        throw new Error("MEMBER_NOT_FOUND");
      }

      // Verify current user is the owner
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: { userId: true },
      });

      if (chat?.userId !== user.id) {
        throw new Error("NOT_OWNER");
      }

      // Update target member to OWNER
      const updated = await tx.chatMember.update({
        where: { chatId_userId: { chatId, userId: targetUserId } },
        data: { role: "OWNER" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      // Update chat's userId to new owner
      await tx.chat.update({
        where: { id: chatId },
        data: { userId: targetUserId },
      });

      // Add old owner as a member with EDITOR role if not already there
      const existingOldOwnerMember = await tx.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId: user.id } },
      });

      if (!existingOldOwnerMember) {
        await tx.chatMember.create({
          data: {
            chatId,
            userId: user.id,
            role: "EDITOR",
          },
        });
      }

      return updated;
    }, {
      maxWait: 5000,
      timeout: 10000,
    });

    // Invalidate caches
    await Promise.all([
      invalidateMemberCache(chatId),
      invalidateRoleCache(chatId, targetUserId),
      invalidateRoleCache(chatId, user.id),
    ]);

    // Publish role changed events
    await publishMemberRoleChanged(chatId, targetUserId, "OWNER");

    return NextResponse.json({ success: true, newOwner: updatedMember });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "MEMBER_NOT_FOUND") {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      if (error.message === "NOT_OWNER") {
        return NextResponse.json({ error: "Only the current owner can transfer ownership" }, { status: 403 });
      }
      if (error.message.startsWith("Access denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Transfer ownership error:", error);
    return NextResponse.json({ error: "Failed to transfer ownership" }, { status: 500 });
  }
}

/**
 * DELETE /api/chats/:id/members/:userId - Remove a member from a chat
 *
 * Security:
 * - Only OWNER can remove members
 * - Cannot remove owner (chat.userId)
 * - Cannot remove yourself (prevents accidental self-removal)
 * - Idempotent - returns success if already removed
 * - Uses transaction for atomic delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId, userId: targetUserId } = await params;

    // Must be OWNER to remove members
    await requireChatAccess(user.id, chatId, "OWNER");

    // Use transaction for atomic delete with checks
    await prisma.$transaction(async (tx) => {
      // Check if trying to remove owner
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: { userId: true },
      });

      if (chat?.userId === targetUserId) {
        throw new Error("CANNOT_REMOVE_OWNER");
      }

      // Cannot remove yourself
      if (targetUserId === user.id) {
        throw new Error("CANNOT_REMOVE_SELF");
      }

      // Verify member exists (idempotent)
      const existing = await tx.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId: targetUserId } },
      });

      if (!existing) {
        throw new Error("MEMBER_NOT_FOUND");
      }

      // Delete member
      await tx.chatMember.delete({
        where: { chatId_userId: { chatId, userId: targetUserId } },
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

    // Publish member removed event for real-time collaboration updates
    await publishMemberRemoved(chatId, targetUserId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "CANNOT_REMOVE_OWNER") {
        return NextResponse.json({ error: "Cannot remove the chat owner" }, { status: 400 });
      }
      if (error.message === "CANNOT_REMOVE_SELF") {
        return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
      }
      if (error.message === "MEMBER_NOT_FOUND") {
        // Idempotent - already removed
        return NextResponse.json({ success: true });
      }
      if (error.message.startsWith("Access denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Remove chat member error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}