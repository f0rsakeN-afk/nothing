/**
 * GET /api/admin/users/[userId] - Get single user
 * PATCH /api/admin/users/[userId] - Update user (role, active status)
 * Protected - requires admin/moderator role
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { userId } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        planTier: true,
        credits: true,
        seenOnboarding: true,
        _count: {
          select: {
            chats: true,
            projects: true,
            feedbacks: true,
            reports: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: { type: "not_found", message: "User not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ user: targetUser });
  } catch (error) {
    console.error("Admin get user error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch user" } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { userId } = await params;
    const body = await request.json();
    const { role, isActive } = body;

    // Check target user exists
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "User not found" } },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (role !== undefined) {
      if (!["USER", "MODERATOR", "ADMIN"].includes(role)) {
        return NextResponse.json(
          { error: { type: "invalid_request", message: "Invalid role" } },
          { status: 400 },
        );
      }
      updateData.role = role;

      // Audit log for role change
      logAuditEvent({
        action: "ADMIN_USER_ROLE_UPDATE",
        userId: user.id,
        targetUserId: userId,
        metadata: { previousRole: existing.role, newRole: role },
        request,
      });
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;

      // Audit log for activation/deactivation
      logAuditEvent({
        action: isActive ? "ADMIN_USER_REACTIVATE" : "ADMIN_USER_DEACTIVATE",
        userId: user.id,
        targetUserId: userId,
        metadata: { previousState: existing.isActive },
        request,
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        planTier: true,
        credits: true,
        _count: {
          select: {
            chats: true,
            projects: true,
          },
        },
      },
    });

    // Invalidate users cache
    try {
      const keys = await redis.keys("admin:users:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Redis unavailable
    }

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to update user" } },
      { status: 500 },
    );
  }
}