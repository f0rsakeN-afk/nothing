/**
 * GET /api/admin/audit/export - Export audit logs as CSV
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { z } from "zod";

const querySchema = z.object({
  search: z.string().max(200).optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

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
    const parsed = querySchema.safeParse({
      search: searchParams.get("search") || undefined,
      action: searchParams.get("action") || undefined,
      userId: searchParams.get("userId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation_error", message: parsed.error.issues } },
        { status: 400 },
      );
    }

    const { search, action, userId, startDate, endDate } = parsed.data;

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    // Build CSV
    const headers = ["ID", "Action", "User ID", "Status", "IP Address", "User Agent", "Metadata", "Created At"];
    const rows = logs.map((log) => [
      log.id,
      log.action,
      log.userId,
      log.status ?? "success",
      log.ipAddress ?? "",
      (log.userAgent ?? "").replace(/"/g, '""'),
      JSON.stringify(log.metadata ?? {}),
      log.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Admin audit export error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to export audit logs" } },
      { status: 500 },
    );
  }
}
