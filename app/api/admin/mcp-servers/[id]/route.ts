/**
 * PATCH /api/admin/mcp-servers/[id] - Update MCP server (enable/disable)
 * DELETE /api/admin/mcp-servers/[id] - Delete MCP server
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

async function invalidateMcpServersCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:mcp-servers:*");
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

    const existing = await prisma.mcpUserServer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "MCP server not found" } },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.isEnabled !== undefined) {
      updateData.isEnabled = body.isEnabled;
    }

    const updated = await prisma.mcpUserServer.update({
      where: { id },
      data: updateData,
    });

    logAuditEvent({
      action: "ADMIN_MCP_SERVER_UPDATE",
      userId: user.id,
      targetUserId: (existing as any).userId,
      metadata: { serverId: id, isEnabled: body.isEnabled },
      request,
    });

    await invalidateMcpServersCache();

    return NextResponse.json({ server: updated });
  } catch (error) {
    console.error("Admin update MCP server error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to update MCP server" } },
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

    const existing = await prisma.mcpUserServer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "MCP server not found" } },
        { status: 404 },
      );
    }

    await prisma.mcpUserServer.delete({ where: { id } });

    logAuditEvent({
      action: "ADMIN_MCP_SERVER_DELETE",
      userId: user.id,
      targetUserId: (existing as any).userId,
      metadata: { serverId: id, serverName: (existing as any).name },
      request,
    });

    await invalidateMcpServersCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete MCP server error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete MCP server" } },
      { status: 500 },
    );
  }
}