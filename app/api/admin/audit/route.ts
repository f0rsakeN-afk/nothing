/**
 * GET /api/admin/audit - List audit logs
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";
import { z } from "zod";

const AUDIT_CACHE_TTL = 30;

const querySchema = z.object({
  search: z.string().max(200).optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(["success", "failure"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

async function getAuditCacheKey(params: z.infer<typeof querySchema>): Promise<string> {
  return `admin:audit:${JSON.stringify(params)}`;
}

async function getCachedAudit(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setAuditCache(cacheKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    await redis.setex(cacheKey, AUDIT_CACHE_TTL, JSON.stringify(data));
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
    const params = querySchema.parse({
      search: searchParams.get("search") || undefined,
      action: searchParams.get("action") || undefined,
      userId: searchParams.get("userId") || undefined,
      status: searchParams.get("status") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "50",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    logAuditEvent({ action: "ADMIN_AUDIT_LIST", userId: user.id, metadata: { action: params.action }, request });

    const cacheKey = await getAuditCacheKey(params);
    const cached = await getCachedAudit(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const where: Record<string, unknown> = {};

    if (params.action) {
      where.action = params.action;
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(params.startDate);
      }
      if (params.endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(params.endDate);
      }
    }

    const skip = (params.page - 1) * params.limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: params.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / params.limit);

    const response = {
      data: logs,
      pagination: { page: params.page, limit: params.limit, total, totalPages, hasMore: params.page < totalPages },
    };

    await setAuditCache(cacheKey, response);

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { type: "validation_error", message: error.issues } },
        { status: 400 },
      );
    }
    console.error("Admin audit list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch audit logs" } },
      { status: 500 },
    );
  }
}