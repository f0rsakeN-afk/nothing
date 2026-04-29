/**
 * PATCH /api/admin/projects/[id] - Update project (archive)
 * DELETE /api/admin/projects/[id] - Delete project
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

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

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Project not found" } },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.archived !== undefined) {
      updateData.archivedAt = body.archived ? new Date() : null;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
      include: { user: { select: { email: true } } },
    });

    logAuditEvent({
      action: "ADMIN_PROJECT_UPDATE",
      userId: user.id,
      targetUserId: (existing as any).userId,
      metadata: { projectId: id, ...body },
      request,
    });

    await invalidateProjectsCache();

    return NextResponse.json({ project: updated });
  } catch (error) {
    console.error("Admin update project error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to update project" } },
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

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Project not found" } },
        { status: 404 },
      );
    }

    await prisma.project.delete({ where: { id } });

    logAuditEvent({
      action: "ADMIN_PROJECT_DELETE",
      userId: user.id,
      targetUserId: (existing as any).userId,
      metadata: { projectId: id },
      request,
    });

    await invalidateProjectsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete project error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete project" } },
      { status: 500 },
    );
  }
}