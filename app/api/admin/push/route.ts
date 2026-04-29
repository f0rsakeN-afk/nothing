/**
 * GET /api/admin/push - List all push subscriptions
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const PUSH_CACHE_TTL = 60;

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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    logAuditEvent({ action: "ADMIN_PUSH_LIST", userId: user.id, metadata: { page }, request });

    const cacheKey = `admin:push:${page}:${limit}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), { headers: { "X-Cache": "HIT" } });
      }
    } catch {
      // Redis unavailable
    }

    const [subscriptions, total] = await Promise.all([
      prisma.pushSubscription.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.pushSubscription.count(),
    ]);

    const userIds = [...new Set(subscriptions.map((s) => s.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.email]));

    const totalPages = Math.ceil(total / limit);
    const response = {
      data: subscriptions.map((sub) => ({
        id: sub.id,
        endpoint: sub.endpoint,
        userEmail: userMap.get(sub.userId) ?? "Unknown",
        userId: sub.userId,
        createdAt: sub.createdAt,
      })),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    try {
      await redis.setex(cacheKey, PUSH_CACHE_TTL, JSON.stringify(response));
    } catch {
      // Redis unavailable
    }

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin push subscriptions list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch push subscriptions" } },
      { status: 500 },
    );
  }
}
