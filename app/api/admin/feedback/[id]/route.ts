/**
 * DELETE /api/admin/feedback/[id] - Delete feedback
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

async function invalidateFeedbackCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:feedback:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { type: "authentication_required", message: "Authentication required" } },
        { status: 401 },
      );
    }

    if (!(await isAdminOrModerator(user.id))) {
      return NextResponse.json(
        { error: { type: "forbidden", message: "Admin or moderator role required" } },
        { status: 403 },
      );
    }

    const { id } = await params;

    const existing = await prisma.feedback.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Feedback not found" } },
        { status: 404 },
      );
    }

    await prisma.feedback.delete({ where: { id } });

    logAuditEvent({
      action: "ADMIN_FEEDBACK_DELETE",
      userId: user.id,
      targetUserId: existing.userId,
      metadata: { feedbackId: id },
      request,
    });

    await invalidateFeedbackCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete feedback error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete feedback" } },
      { status: 500 },
    );
  }
}