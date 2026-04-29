/**
 * GET /api/admin/chats - List all chats
 * PATCH /api/admin/chats - Update chat visibility
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const CHATS_CACHE_TTL = 30;

async function getChatsCacheKey(search?: string, visibility?: string, page?: number, limit?: number): Promise<string> {
  return `admin:chats:${search || "all"}:${visibility || "all"}:${page || 1}:${limit || 20}`;
}

async function getCachedChats(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setChatsCache(cacheKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    await redis.setex(cacheKey, CHATS_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }
}

async function invalidateChatsCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:chats:*");
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
    const visibility = searchParams.get("visibility") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    logAuditEvent({ action: "ADMIN_CHATS_LIST", userId: user.id, metadata: { search, visibility, page }, request });

    const cacheKey = await getChatsCacheKey(search, visibility, page, limit);
    const cached = await getCachedChats(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const where: Record<string, unknown> = {};

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    if (visibility) {
      where.visibility = visibility;
    }

    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.chat.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: chats,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    await setChatsCache(cacheKey, response);

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin chats list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch chats" } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { id, visibility } = body;

    if (!id) {
      return NextResponse.json(
        { error: { type: "invalid_request", message: "Chat ID required" } },
        { status: 400 },
      );
    }

    if (visibility && !["public", "private"].includes(visibility)) {
      return NextResponse.json(
        { error: { type: "invalid_request", message: "Invalid visibility" } },
        { status: 400 },
      );
    }

    const existing = await prisma.chat.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Chat not found" } },
        { status: 404 },
      );
    }

    const updated = await prisma.chat.update({
      where: { id },
      data: { visibility },
      include: { user: { select: { email: true } } },
    });

    logAuditEvent({
      action: "ADMIN_CHAT_UPDATE",
      userId: user.id,
      targetUserId: (existing as any).userId,
      metadata: { chatId: id, previousVisibility: (existing as any).visibility, newVisibility: visibility },
      request,
    });

    await invalidateChatsCache();

    return NextResponse.json({ chat: updated });
  } catch (error) {
    console.error("Admin update chat error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to update chat" } },
      { status: 500 },
    );
  }
}