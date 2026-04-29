/**
 * DELETE /api/admin/push/[id] - Delete push subscription
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

async function invalidatePushCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:push:*");
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

    const existing = await prisma.pushSubscription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Push subscription not found" } },
        { status: 404 },
      );
    }

    await prisma.pushSubscription.delete({ where: { id } });

    logAuditEvent({
      action: "ADMIN_PUSH_DELETE",
      userId: user.id,
      metadata: { pushSubscriptionId: id, endpoint: existing.endpoint.slice(0, 50) },
      request,
    });

    await invalidatePushCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete push subscription error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete push subscription" } },
      { status: 500 },
    );
  }
}
