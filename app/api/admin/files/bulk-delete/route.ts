/**
 * POST /api/admin/files/bulk-delete - Bulk delete files
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

async function invalidateFilesCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:files:*");
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Redis unavailable
  }
}

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
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation_error", message: parsed.error.issues } },
        { status: 400 },
      );
    }

    const { ids } = parsed.data;

    const deleted = await prisma.file.deleteMany({
      where: { id: { in: ids } },
    });

    logAuditEvent({
      action: "ADMIN_FILE_DELETE",
      userId: user.id,
      metadata: { fileIds: ids, count: deleted.count },
      request,
    });

    await invalidateFilesCache();

    return NextResponse.json({ success: true, deletedCount: deleted.count });
  } catch (error) {
    console.error("Admin bulk delete files error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete files" } },
      { status: 500 },
    );
  }
}
