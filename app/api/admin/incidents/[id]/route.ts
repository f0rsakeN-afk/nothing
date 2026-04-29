/**
 * PATCH /api/admin/incidents/[id] - Update incident (resolve, etc.)
 * DELETE /api/admin/incidents/[id] - Delete incident
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";
import { z } from "zod";

const updateIncidentSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]).optional(),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR"]).optional(),
  message: z.string().optional(),
  affectedComponents: z.array(z.string()).optional(),
  resolvedAt: z.string().datetime().optional(),
});

async function invalidateIncidentsCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:incidents:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();
    const parsed = updateIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation_error", message: parsed.error.issues } },
        { status: 400 },
      );
    }

    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Incident not found" } },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.resolvedAt) {
      updateData.resolvedAt = new Date(parsed.data.resolvedAt);
    }
    if (parsed.data.status === "RESOLVED" && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: updateData,
    });

    logAuditEvent({
      action: "ADMIN_INCIDENT_UPDATE",
      userId: user.id,
      metadata: { incidentId: id, previousStatus: existing.status, newStatus: parsed.data.status },
      request,
    });

    await invalidateIncidentsCache();

    return NextResponse.json({ incident: updated });
  } catch (error) {
    console.error("Admin update incident error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to update incident" } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Incident not found" } },
        { status: 404 },
      );
    }

    await prisma.incident.delete({ where: { id } });

    logAuditEvent({
      action: "ADMIN_INCIDENT_DELETE",
      userId: user.id,
      metadata: { incidentId: id },
      request,
    });

    await invalidateIncidentsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete incident error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete incident" } },
      { status: 500 },
    );
  }
}