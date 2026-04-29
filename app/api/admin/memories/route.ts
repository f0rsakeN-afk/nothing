/**
 * GET /api/admin/memories - List all memories
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const MEMORIES_CACHE_TTL = 30;

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

    logAuditEvent({ action: "ADMIN_MEMORIES_LIST", userId: user.id, metadata: { search, page }, request });

    const cacheKey = `admin:memories:${search || "all"}:${page}:${limit}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), { headers: { "X-Cache": "HIT" } });
      }
    } catch {
      // Redis unavailable
    }

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } },
      ];
    }

    const [memories, total] = await Promise.all([
      prisma.memory.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.memory.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const response = {
      data: memories,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    try {
      await redis.setex(cacheKey, MEMORIES_CACHE_TTL, JSON.stringify(response));
    } catch {
      // Redis unavailable
    }

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin memories list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch memories" } },
      { status: 500 },
    );
  }
}