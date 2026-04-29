/**
 * GET /api/admin/invitations - List all invitations
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const INVITATIONS_CACHE_TTL = 30;

async function getInvitationsCacheKey(status?: string, page?: number, limit?: number): Promise<string> {
  return `admin:invitations:${status || "all"}:${page || 1}:${limit || 20}`;
}

async function getCachedInvitations(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setInvitationsCache(cacheKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    await redis.setex(cacheKey, INVITATIONS_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }
}

async function invalidateInvitationsCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:invitations:*");
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
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    logAuditEvent({ action: "ADMIN_INVITATIONS_LIST", userId: user.id, metadata: { status, page }, request });

    const cacheKey = await getInvitationsCacheKey(status, page, limit);
    const cached = await getCachedInvitations(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [invitations, total] = await Promise.all([
      prisma.chatInvitation.findMany({
        where,
        include: {
          chat: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.chatInvitation.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: invitations,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    await setInvitationsCache(cacheKey, response);

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin invitations list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch invitations" } },
      { status: 500 },
    );
  }
}