/**
 * GET /api/admin/chats/[id] - Get a chat with its messages
 * DELETE /api/admin/chats/[id] - Delete a chat
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

async function invalidateChatsCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:chats:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable
  }
}

export async function GET(
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

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
        user: {
          select: { email: true, displayName: true },
        },
      },
    });

    if (!chat) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Chat not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Admin get chat error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch chat" } },
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

    const existing = await prisma.chat.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Chat not found" } },
        { status: 404 },
      );
    }

    await prisma.chat.delete({ where: { id } });

    logAuditEvent({
      action: "ADMIN_CHAT_DELETE",
      userId: user.id,
      targetUserId: (existing as any).userId,
      metadata: { chatId: id },
      request,
    });

    await invalidateChatsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete chat error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete chat" } },
      { status: 500 },
    );
  }
}