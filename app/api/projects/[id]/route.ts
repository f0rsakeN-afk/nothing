import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateUser, AccountDeactivatedError } from "@/lib/auth";
import redis, { KEYS } from "@/lib/redis";

/**
 * Invalidate projects cache
 */
async function invalidateProjectsCache(userId: string): Promise<void> {
  try {
    await redis.del(KEYS.userProjects(userId));
  } catch {
    // Redis error, ignore
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser(request);
    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        name: true,
        description: true,
        instruction: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        pinnedAt: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      archivedAt: project.archivedAt?.toISOString() ?? null,
      pinnedAt: project.pinnedAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser(request);
    const { id } = await params;

    // Verify ownership first
    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, instruction, archivedAt, pinnedAt } = body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(instruction !== undefined && { instruction }),
        ...(archivedAt !== undefined && { archivedAt }),
        ...(pinnedAt !== undefined && { pinnedAt }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        instruction: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        pinnedAt: true,
      },
    });

    // Invalidate project list cache
    await invalidateProjectsCache(user.id);

    return NextResponse.json({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      archivedAt: project.archivedAt?.toISOString() ?? null,
      pinnedAt: project.pinnedAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser(request);
    const { id } = await params;

    // Verify ownership first
    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    // Invalidate project list cache
    await invalidateProjectsCache(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
