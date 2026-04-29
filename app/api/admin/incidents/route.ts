/**
 * GET /api/admin/incidents - List incidents
 * POST /api/admin/incidents - Create incident
 * PATCH /api/admin/incidents/[id] - Update incident
 * DELETE /api/admin/incidents/[id] - Delete incident
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";
import { z } from "zod";

const INCIDENTS_CACHE_TTL = 30;

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

    logAuditEvent({ action: "ADMIN_INCIDENTS_LIST", userId: user.id, metadata: { status, page }, request });

    const cacheKey = `admin:incidents:${status || "all"}:${page}:${limit}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), { headers: { "X-Cache": "HIT" } });
      }
    } catch {
      // Redis unavailable
    }

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.incident.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const response = {
      data: incidents,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    try {
      await redis.setex(cacheKey, INCIDENTS_CACHE_TTL, JSON.stringify(response));
    } catch {
      // Redis unavailable
    }

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin incidents list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch incidents" } },
      { status: 500 },
    );
  }
}

const createIncidentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR"]),
  message: z.string().optional(),
  affectedComponents: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
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
    const parsed = createIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation_error", message: parsed.error.issues } },
        { status: 400 },
      );
    }

    const incident = await prisma.incident.create({
      data: {
        title: parsed.data.title,
        status: parsed.data.status,
        severity: parsed.data.severity,
        message: parsed.data.message,
        affectedComponents: parsed.data.affectedComponents || [],
      },
    });

    logAuditEvent({
      action: "ADMIN_INCIDENT_CREATE",
      userId: user.id,
      metadata: { incidentId: incident.id, title: incident.title },
      request,
    });

    // Invalidate cache
    try {
      const keys = await redis.keys("admin:incidents:*");
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // Redis unavailable
    }

    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    console.error("Admin create incident error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to create incident" } },
      { status: 500 },
    );
  }
}