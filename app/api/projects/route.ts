/**
 * Projects API
 * GET /api/projects - Get user's projects (with Redis caching)
 * POST /api/projects - Create new project
 * Cache is invalidated on create/update/delete operations
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getOrCreateUser, AccountDeactivatedError } from "@/lib/auth";
import { checkLimit } from "@/services/limits/service";
import { limitExceededResponse } from "@/lib/limits/middleware";
import redis, { KEYS, TTL } from "@/lib/redis";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import {
  unauthorizedError,
  notFoundError,
  badRequestError,
  forbiddenError,
  internalError,
  validationError,
} from "@/lib/api-response";
import {
  createProjectSchema,
  projectQuerySchema,
} from "@/lib/validations";

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
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    // Validate auth and get user
    const user = await getOrCreateUser(request);

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    const parsed = projectQuerySchema.safeParse(queryParams);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const { archived } = parsed.data;
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
      return forbiddenError("Account deactivated");
    }
    console.error("Error fetching projects:", error);
    return internalError("Failed to fetch projects");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate auth and get user
    const user = await getOrCreateUser(request);

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const { name, description, instruction } = parsed.data;

    // Check project limit
    const limitCheck = await checkLimit(user.id, "PROJECT");
    if (!limitCheck.allowed) {
      return limitExceededResponse(limitCheck);
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
      return forbiddenError("Account deactivated");
    }
    console.error("Error creating project:", error);
    return internalError("Failed to create project");
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
