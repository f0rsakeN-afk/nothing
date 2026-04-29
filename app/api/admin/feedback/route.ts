/**
 * GET /api/admin/feedback - List feedback
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const FEEDBACK_CACHE_TTL = 60;

async function getFeedbackCacheKey(search?: string, page?: number, limit?: number): Promise<string> {
  return `admin:feedback:${search || "all"}:${page || 1}:${limit || 20}`;
}

async function getCachedFeedback(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setFeedbackCache(cacheKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    await redis.setex(cacheKey, FEEDBACK_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }
}

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
    const search = searchParams.get("search")?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    logAuditEvent({ action: "ADMIN_FEEDBACK_LIST", userId: user.id, metadata: { search, page }, request });

    // Try cache
    const cacheKey = await getFeedbackCacheKey(search, page, limit);
    const cached = await getCachedFeedback(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { comment: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: feedbacks,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    await setFeedbackCache(cacheKey, response);

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin feedback list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch feedback" } },
      { status: 500 },
    );
  }
}