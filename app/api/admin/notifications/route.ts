/**
 * GET /api/admin/notifications - List all notifications (admin view)
 * POST /api/admin/notifications - Broadcast notification to users
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";
import { z } from "zod";
import webpush from "web-push";

const NOTIFICATIONS_CACHE_TTL = 30;

const broadcastSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  accent: z.string().default("bg-blue-400"),
  targetUserIds: z.array(z.string()).optional(), // if empty, broadcast to all
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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, unread, archived
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    logAuditEvent({
      action: "ADMIN_NOTIFICATIONS_LIST",
      userId: user.id,
      metadata: { filter, page },
      request,
    });

    const cacheKey = `admin:notifications:${filter}:${page}:${limit}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), { headers: { "X-Cache": "HIT" } });
      }
    } catch {
      // Redis unavailable
    }

    const where: Record<string, unknown> = {};
    if (filter === "unread") {
      where.read = false;
      where.archived = false;
    } else if (filter === "archived") {
      where.archived = true;
    }

    const [notifications, total, stats] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { email: true } },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.groupBy({
        by: ["read", "archived"],
        _count: true,
      }),
    ]);

    const totalNotifications = await prisma.notification.count();
    const unreadCount = await prisma.notification.count({ where: { read: false, archived: false } });
    const archivedCount = await prisma.notification.count({ where: { archived: true } });

    const totalPages = Math.ceil(total / limit);
    const response = {
      data: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        read: n.read,
        archived: n.archived,
        createdAt: n.createdAt,
        userEmail: n.user.email,
      })),
      stats: { totalNotifications, unreadCount, archivedCount },
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    try {
      await redis.setex(cacheKey, NOTIFICATIONS_CACHE_TTL, JSON.stringify(response));
    } catch {
      // Redis unavailable
    }

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin notifications list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch notifications" } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = broadcastSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation_error", message: parsed.error.issues } },
        { status: 400 },
      );
    }

    const { title, description, accent, targetUserIds } = parsed.data;

    // Get users to notify
    const users = targetUserIds?.length
      ? await prisma.user.findMany({ where: { id: { in: targetUserIds } }, select: { id: true } })
      : await prisma.user.findMany({ select: { id: true } });

    // Create notifications for each user
    const notificationData = users.map((u) => ({
      userId: u.id,
      title,
      description,
      accent,
    }));

    await prisma.notification.createMany({ data: notificationData });

    // Send web push notifications
    try {
      const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

      if (vapidPublicKey && vapidPrivateKey) {
        webpush.setVapidDetails(
          `mailto:${process.env.VAPID_EMAIL || "admin@eryx.app"}`,
          vapidPublicKey,
          vapidPrivateKey,
        );

        const pushSubs = await prisma.pushSubscription.findMany({
          where: { userId: { in: users.map((u) => u.id) } },
        });

        const pushPromises = pushSubs.map((sub) =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({ title, body: description, icon: "/icon.png" }),
          ).catch(() => {}), // Ignore individual push failures
        );

        await Promise.allSettled(pushPromises);
      }
    } catch {
      // Push notifications are best-effort
    }

    logAuditEvent({
      action: "ADMIN_NOTIFICATION_BROADCAST",
      userId: user.id,
      metadata: { title, recipientCount: users.length },
      request,
    });

    await invalidateNotificationsCache();

    return NextResponse.json(
      { success: true, recipientCount: users.length },
      { status: 201 },
    );
  } catch (error) {
    console.error("Admin broadcast notification error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to broadcast notification" } },
      { status: 500 },
    );
  }
}
