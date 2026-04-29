/**
 * GET /api/admin/projects - List all projects
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const PROJECTS_CACHE_TTL = 30;

async function getProjectsCacheKey(search?: string, page?: number, limit?: number): Promise<string> {
  return `admin:projects:${search || "all"}:${page || 1}:${limit || 20}`;
}

async function getCachedProjects(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setProjectsCache(cacheKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    await redis.setex(cacheKey, PROJECTS_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }
}

async function invalidateProjectsCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:projects:*");
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

    logAuditEvent({ action: "ADMIN_PROJECTS_LIST", userId: user.id, metadata: { search, page }, request });

    const cacheKey = await getProjectsCacheKey(search, page, limit);
    const cached = await getCachedProjects(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          user: { select: { email: true } },
          _count: { select: { chats: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: projects,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    await setProjectsCache(cacheKey, response);

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin projects list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch projects" } },
      { status: 500 },
    );
  }
}