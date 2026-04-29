/**
 * GET /api/admin/reports - List reports with search and filters
 * PATCH /api/admin/reports - Update report status
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const REPORTS_CACHE_TTL = 60;

async function getReportsCacheKey(search?: string, status?: string, page?: number, limit?: number): Promise<string> {
  return `admin:reports:${search || "all"}:${status || "all"}:${page || 1}:${limit || 20}`;
}

async function getCachedReports(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setReportsCache(cacheKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    await redis.setex(cacheKey, REPORTS_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }
}

async function invalidateReportsCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:reports:*");
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
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    logAuditEvent({ action: "ADMIN_REPORTS_LIST", userId: user.id, metadata: { search, status, page }, request });

    // Try cache
    const cacheKey = await getReportsCacheKey(search, status, page, limit);
    const cached = await getCachedReports(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: reports,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    await setReportsCache(cacheKey, response);

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin reports list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch reports" } },
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
    const { search, status, page, limit, id } = body;

    if (!id) {
      return NextResponse.json(
        { error: { type: "invalid_request", message: "Report ID required" } },
        { status: 400 },
      );
    }

    const validStatuses = ["pending", "in_progress", "resolved", "dismissed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: { type: "invalid_request", message: "Invalid status" } },
        { status: 400 },
      );
    }

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Report not found" } },
        { status: 404 },
      );
    }

    const updated = await prisma.report.update({
      where: { id },
      data: { status } as any,
      include: { user: { select: { email: true } } },
    });

    logAuditEvent({
      action: "ADMIN_REPORT_STATUS_UPDATE",
      userId: user.id,
      targetUserId: (existing as any).userId,
      metadata: { previousStatus: (existing as any).status, newStatus: status },
      request,
    });

    await invalidateReportsCache();

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error("Admin update report error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to update report" } },
      { status: 500 },
    );
  }
}