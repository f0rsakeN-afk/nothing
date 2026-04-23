/**
 * Projects API
 * GET /api/projects - Get user's projects (with Redis caching)
 * POST /api/projects - Create new project
 * Cache is invalidated on create/update/delete operations
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateUser, AccountDeactivatedError } from "@/lib/auth";
import { getUserLimits } from "@/services/limit.service";
import redis, { KEYS, TTL } from "@/lib/redis";

interface ProjectCache {
  projects: Array<{
    id: string;
    name: string;
    description: string;
    instruction: string | null;
    createdAt: string;
    updatedAt: string;
    archivedAt: string | null;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Validate auth and get user
    const user = await getOrCreateUser(request);

    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived");
    const showArchived = archived === "true";

    // Try cache for non-archived requests only
    if (!showArchived) {
      const cacheKey = KEYS.userProjects(user.id);
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const response = NextResponse.json(JSON.parse(cached) as ProjectCache);
          response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
          return response;
        }
      } catch {
        // Redis error, continue to DB
      }
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
        ...(showArchived
          ? { archivedAt: { not: null } }
          : { archivedAt: null }),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        instruction: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
      },
    });

    const result: ProjectCache = {
      projects: projects.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        archivedAt: p.archivedAt?.toISOString() ?? null,
      })),
    };

    // Cache non-archived results
    if (!showArchived) {
      const cacheKey = KEYS.userProjects(user.id);
      try {
        await redis.setex(cacheKey, TTL.userProjects, JSON.stringify(result));
      } catch {
        // Redis error, ignore
      }
    }

    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate auth and get user
    const user = await getOrCreateUser(request);

    const body = await request.json();
    const { name, description, instruction } = body;

    if (!name || name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: "Project name must be 2-50 characters" },
        { status: 400 }
      );
    }

    // Check project limit
    const limits = await getUserLimits(user.id);
    const projectCount = await prisma.project.count({
      where: { userId: user.id, archivedAt: null },
    });

    if (limits.maxProjects !== -1 && projectCount >= limits.maxProjects) {
      return NextResponse.json(
        {
          error: "Project limit reached",
          code: "PROJECT_LIMIT_REACHED",
          message: `You've reached the maximum of ${limits.maxProjects} projects on your ${limits.maxProjects === 2 ? "Free" : "current"} plan.`,
          action: "upgrade",
          upgradeTo: limits.maxProjects === 2 ? "Basic" : limits.maxProjects === 5 ? "Pro" : null,
          limits: {
            current: projectCount,
            max: limits.maxProjects,
          },
        },
        { status: 403 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || "",
        instruction: instruction || null,
        userId: user.id,
      },
    });

    // Invalidate project list cache
    await invalidateProjectsCache(user.id);

    return NextResponse.json(
      {
        id: project.id,
        name: project.name,
        description: project.description,
        instruction: project.instruction,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        archivedAt: project.archivedAt?.toISOString() ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

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
