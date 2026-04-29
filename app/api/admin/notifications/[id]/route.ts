/**
 * PATCH /api/admin/notifications/[id] - Update notification (mark read/archived)
 * DELETE /api/admin/notifications/[id] - Delete notification
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";
import { z } from "zod";

const updateNotificationSchema = z.object({
  read: z.boolean().optional(),
  archived: z.boolean().optional(),
});

async function invalidateNotificationsCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:notifications:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable
  }
}

export async function PATCH(
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
    const body = await request.json();
    const parsed = updateNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation_error", message: parsed.error.issues } },
        { status: 400 },
      );
    }

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Notification not found" } },
        { status: 404 },
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: parsed.data,
    });

    logAuditEvent({
      action: "ADMIN_NOTIFICATION_UPDATE",
      userId: user.id,
      metadata: { notificationId: id, updates: parsed.data },
      request,
    });

    await invalidateNotificationsCache();

    return NextResponse.json({ notification: updated });
  } catch (error) {
    console.error("Admin update notification error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to update notification" } },
      { status: 500 },
    );
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

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Notification not found" } },
        { status: 404 },
      );
    }

    await prisma.notification.delete({ where: { id } });

    logAuditEvent({
      action: "ADMIN_NOTIFICATION_DELETE",
      userId: user.id,
      metadata: { notificationId: id },
      request,
    });

    await invalidateNotificationsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete notification error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete notification" } },
      { status: 500 },
    );
  }
}
