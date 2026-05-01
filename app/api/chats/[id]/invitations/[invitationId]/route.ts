import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import { requireChatAccess } from "@/lib/chat-access";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";

/**
 * DELETE /api/chats/:id/invitations/:invitationId - Cancel a pending invitation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    // Rate limit to prevent brute force
    const rateLimit = await checkRateLimitWithAuth(request, "chat");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId, invitationId } = await params;

    // Must be owner to cancel invitations
    await requireChatAccess(user.id, chatId, "OWNER");

    const invitation = await prisma.chatInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.chatId !== chatId) {
      return NextResponse.json({ error: "Invitation does not belong to this chat" }, { status: 400 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 400 });
    }

    await prisma.chatInvitation.update({
      where: { id: invitationId },
      data: { status: "expired" },
    });

    // Invalidate invitations cache
    try {
      await redis.del(`chat:${chatId}:invitations`);
    } catch {
      // Redis unavailable
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Cancel invitation error:", error);
    return NextResponse.json({ error: "Failed to cancel invitation" }, { status: 500 });
  }
}