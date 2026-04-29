/**
 * GET /api/admin/users - List users with search and pagination
 * Protected - requires admin/moderator role
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const USERS_CACHE_TTL = 60; // 1 minute

async function getUsersCacheKey(search?: string, role?: string, isActive?: string, page?: number, limit?: number): Promise<string> {
  return `admin:users:${search || "all"}:${role || "all"}:${isActive ?? "all"}:${page || 1}:${limit || 20}`;
}

async function getCachedUsers(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setUsersCache(cacheKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    await redis.setex(cacheKey, USERS_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }
}

async function invalidateUsersCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:users:*");
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
    const role = searchParams.get("role") as "USER" | "MODERATOR" | "ADMIN" | undefined;
    const isActiveParam = searchParams.get("isActive");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // Log the action
    logAuditEvent({
      action: "ADMIN_USER_LIST",
      userId: user.id,
      metadata: { search, role, page },
      request,
    });

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { id: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.isActive = isActiveParam === "true";
    }

    // Build cache key
    const cacheKey = await getUsersCacheKey(search, role, isActiveParam ?? undefined, page, limit);

    // Try cache first
    const cached = await getCachedUsers(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    // Fetch users and total count in parallel
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          planTier: true,
          credits: true,
          _count: {
            select: {
              chats: true,
              projects: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };

    // Cache the result
    await setUsersCache(cacheKey, response);

    return NextResponse.json(response, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch users" } },
      { status: 500 },
    );
  }
}