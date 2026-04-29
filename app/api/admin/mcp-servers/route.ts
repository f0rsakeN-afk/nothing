/**
 * GET /api/admin/mcp-servers - List all MCP servers
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const MCP_SERVERS_CACHE_TTL = 30;

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
    const authType = searchParams.get("authType") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    logAuditEvent({ action: "ADMIN_MCP_SERVERS_LIST", userId: user.id, metadata: { search, authType, page }, request });

    const cacheKey = `admin:mcp-servers:${search || "all"}:${authType || "all"}:${page}:${limit}`;
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
        { name: { contains: search, mode: "insensitive" } },
        { url: { contains: search, mode: "insensitive" } },
      ];
    }
    if (authType) {
      where.authType = authType;
    }

    const [servers, total] = await Promise.all([
      prisma.mcpUserServer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.mcpUserServer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const response = {
      data: servers,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    try {
      await redis.setex(cacheKey, MCP_SERVERS_CACHE_TTL, JSON.stringify(response));
    } catch {
      // Redis unavailable
    }

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin MCP servers list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch MCP servers" } },
      { status: 500 },
    );
  }
}