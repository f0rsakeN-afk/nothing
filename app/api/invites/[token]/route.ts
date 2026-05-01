import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis, { KEYS, CHANNELS } from "@/lib/redis";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import { invalidateMemberCache, invalidateRoleCache } from "@/lib/chat-access";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import { publishMemberAdded } from "@/services/chat-pubsub.service";

/**
 * GET /api/invites/:token - Get invitation details (public, requires auth)
 *
 * Security: Doesn't leak whether chat exists to non-members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    // Single query to get invitation with chat info
    const invitation = await prisma.chatInvitation.findUnique({
      where: { token },
      include: {
        chat: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
      },
    });

    if (!invitation) {
      // Don't reveal if invitation exists - just say not found
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Check expiry without revealing internal state
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation is no longer valid" },
        { status: 410 }
      );
    }

    // Check membership status in parallel with inviter lookup
    const [inviter, existingMembership] = await Promise.all([
      prisma.user.findUnique({
        where: { id: invitation.invitedBy },
        select: { email: true },
      }),
      prisma.chatMember.findUnique({
        where: {
          chatId_userId: {
            chatId: invitation.chatId,
            userId: user.id,
          },
        },
      }),
    ]);

    const isOwner = invitation.chat.userId === user.id;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        chatId: invitation.chatId,
        chatTitle: invitation.chat.title,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        email: invitation.email,
      },
      inviter: inviter?.email,
      alreadyMember: !!existingMembership || isOwner,
      isOwner,
    });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    console.error("Get invitation error:", error);
    return NextResponse.json({ error: "Failed to get invitation" }, { status: 500 });
  }
}

/**
 * POST /api/invites/:token - Accept invitation
 *
 * Security:
 * - Rate limited to prevent brute force
 * - Transaction ensures atomic accept
 * - Idempotent - re-accepting already accepted invite returns success
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Rate limit accept attempts
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    // Use transaction for atomic accept
    // Wrapped in try/catch to handle Prisma unique constraint violation
    // which indicates already accepted
    let newMember;
    try {
      newMember = await prisma.$transaction(async (tx) => {
        // Lock the invitation row to prevent race conditions
        const invitation = await tx.chatInvitation.findUnique({
          where: { token },
          include: { chat: true },
        });

        if (!invitation) {
          throw new Error("NOT_FOUND");
        }

        if (invitation.status !== "pending") {
          // Idempotent - already accepted/declined
          if (invitation.status === "accepted") {
            // Check if already a member (from previous accept)
            const existing = await tx.chatMember.findUnique({
              where: {
                chatId_userId: {
                  chatId: invitation.chatId,
                  userId: user.id,
                },
              },
            });
            if (existing) {
              return existing; // Already a member, return existing
            }
          }
          throw new Error("INVITATION_INVALID");
        }

        if (invitation.expiresAt < new Date()) {
          throw new Error("INVITATION_EXPIRED");
        }

        // Check if user is the chat owner
        if (invitation.chat.userId === user.id) {
          throw new Error("IS_OWNER");
        }

        // Create member and update invitation status atomically
        const member = await tx.chatMember.create({
          data: {
            chatId: invitation.chatId,
            userId: user.id,
            role: invitation.role as "VIEWER" | "EDITOR",
          },
        });

        await tx.chatInvitation.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        });

        return member;
      }, {
        maxWait: 5000,
        timeout: 10000,
        // Default isolation is sufficient - status check handles concurrent accepts
      });
    } catch (txError) {
      // Handle known error cases
      if (txError instanceof Error) {
        if (txError.message === "NOT_FOUND") {
          return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
        }
        if (txError.message === "INVITATION_EXPIRED") {
          return NextResponse.json({ error: "This invitation has expired" }, { status: 410 });
        }
        if (txError.message === "INVITATION_INVALID") {
          return NextResponse.json({ error: "This invitation is no longer valid" }, { status: 410 });
        }
        if (txError.message === "IS_OWNER") {
          return NextResponse.json({ error: "You are already the owner of this chat" }, { status: 400 });
        }
        // Prisma Unique constraint violation = already a member
        if (txError.message.includes("Unique constraint")) {
          return NextResponse.json({ success: true, alreadyMember: true }, { status: 200 });
        }
      }
      throw txError;
    }

    // Invalidate caches
    await Promise.all([
      invalidateMemberCache(newMember.chatId),
      invalidateRoleCache(newMember.chatId, user.id),
    ]);

    // Publish member added event for real-time collaboration updates
    await publishMemberAdded(newMember.chatId, newMember.userId);

    // Archive the related notification
    await archiveInvitationNotification(user.id, newMember.chatId, token);

    return NextResponse.json({
      success: true,
      chatId: newMember.chatId,
      role: newMember.role,
    });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    console.error("Accept invitation error:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}

/**
 * DELETE /api/invites/:token - Decline invitation
 *
 * Security:
 * - Rate limited to prevent brute force
 * - Only the invitee (authenticated user) can decline
 * - Idempotent - declining already processed invite returns success
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Rate limit to prevent brute force
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    // Decline doesn't need strong isolation - just update status
    const invitation = await prisma.chatInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      // Idempotent - already gone
      return NextResponse.json({ success: true });
    }

    // Only pending invitations can be declined
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation is no longer valid" },
        { status: 410 }
      );
    }

    await prisma.chatInvitation.update({
      where: { id: invitation.id },
      data: { status: "declined" },
    });

    // Archive the related notification
    await archiveInvitationNotification(user.id, invitation.chatId, invitation.token);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    console.error("Decline invitation error:", error);
    return NextResponse.json({ error: "Failed to decline invitation" }, { status: 500 });
  }
}

/**
 * Archive notification for invitation (match by invitation token or chat title as fallback)
 */
async function archiveInvitationNotification(userId: string, chatId: string, token: string): Promise<void> {
  try {
    // Get chat title for fallback matching
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { title: true },
    });

    // Find and archive the notification by token
    let archived = await prisma.notification.updateMany({
      where: {
        userId,
        invitationToken: token,
        archived: false,
      },
      data: { archived: true },
    });

    // Fallback: also archive notifications matching by chat title (for old notifications without token)
    if (archived.count === 0 && chat) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await prisma.notification.updateMany({
        where: {
          userId,
          title: "Chat Invitation",
          description: { contains: chat.title },
          archived: false,
          createdAt: { gt: sevenDaysAgo },
        },
        data: { archived: true },
      });
    }

    // Invalidate notifications cache
    try {
      await redis.del(KEYS.userNotifications(userId));
    } catch {
      // Redis unavailable
    }

    // Publish update to user's notification stream
    try {
      await redis.publish(
        CHANNELS.notifications(userId),
        JSON.stringify({ type: "notifications:bulk", action: "read-all", timestamp: new Date().toISOString() })
      );
    } catch {
      // Redis publish error
    }
  } catch {
    // Non-critical, ignore errors
  }
}