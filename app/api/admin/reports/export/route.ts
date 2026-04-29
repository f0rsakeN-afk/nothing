/**
 * GET /api/admin/reports/export - Export reports as CSV
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";

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

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: { user: { select: { email: true } } },
    });

    // Build CSV
    const headers = ["ID", "Reason", "Description", "Email", "Status", "User Email", "Created At"];
    const rows = reports.map((r) => [
      r.id,
      r.reason,
      r.description.replace(/"/g, '""'),
      r.email,
      r.status,
      r.user.email,
      r.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="reports-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Admin reports export error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to export reports" } },
      { status: 500 },
    );
  }
}
