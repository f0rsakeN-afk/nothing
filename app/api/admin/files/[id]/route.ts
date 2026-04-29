/**
 * DELETE /api/admin/files/[id] - Delete a file
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

async function invalidateFilesCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:files:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable
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

    const existing = await prisma.file.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "File not found" } },
        { status: 404 },
      );
    }

    await prisma.file.delete({ where: { id } });

    logAuditEvent({
      action: "ADMIN_FILE_DELETE",
      userId: user.id,
      metadata: { fileId: id, fileName: (existing as any).name },
      request,
    });

    await invalidateFilesCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete file error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete file" } },
      { status: 500 },
    );
  }
}