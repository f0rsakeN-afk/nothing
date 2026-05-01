import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";

// ─── Error types ──────────────────────────────────────────────────────────────

const ERROR_TYPES = {
  INVALID_REQUEST: "invalid_request",
  AUTHENTICATION_REQUIRED: "authentication_required",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  RATE_LIMITED: "rate_limited",
  INTERNAL_ERROR: "internal_error",
} as const;

type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

function apiError(
  type: ErrorType,
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      error: {
        type,
        message,
        ...(details && { details }),
      },
    },
    { status },
  );
}

// ─── Change validation ─────────────────────────────────────────────────────────

const VALID_CHANGE_TYPES = ["feature", "fix", "improvement", "breaking"] as const;
type ChangeType = (typeof VALID_CHANGE_TYPES)[number];

function isValidChangeType(type: string): type is ChangeType {
  return VALID_CHANGE_TYPES.includes(type as ChangeType);
}

// ─── Idempotency ───────────────────────────────────────────────────────────────

async function getIdempotencyKey(request: NextRequest): Promise<string | null> {
  return request.headers.get("x-idempotency-key");
}

async function checkIdempotencyKey(
  key: string,
): Promise<{ found: boolean; response?: NextResponse }> {
  const cacheKey = `idempotency:${key}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { found: true, response: NextResponse.json(parsed.body, { status: parsed.status }) };
    }
  } catch {
    // Redis unavailable
  }
  return { found: false };
}

async function storeIdempotencyKey(
  key: string,
  body: unknown,
  status: number,
): Promise<void> {
  const cacheKey = `idempotency:${key}`;
  try {
    await redis.setex(cacheKey, 86400, JSON.stringify({ body, status }));
  } catch {
    // Redis unavailable
  }
}

// ─── PATCH /api/changelog/[id] ──────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const idempotencyKey = await getIdempotencyKey(request);
    if (idempotencyKey) {
      const { found, response } = await checkIdempotencyKey(idempotencyKey);
      if (found && response) return response;
    }

    const user = await validateAuth(request);
    if (!user) {
      return apiError(ERROR_TYPES.AUTHENTICATION_REQUIRED, "Authentication required", 401);
    }

    if (!(await isAdminOrModerator(user.id))) {
      return apiError(ERROR_TYPES.FORBIDDEN, "Admin or moderator role required", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const { version, date, title, description, changes, isPublished } = body;

    const existing = await prisma.changelog.findUnique({ where: { id } });
    if (!existing) {
      return apiError(ERROR_TYPES.NOT_FOUND, "Changelog entry not found", 404, { id });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (version !== undefined) {
      if (version !== existing.version) {
        const versionExists = await prisma.changelog.findUnique({ where: { version } });
        if (versionExists) {
          return apiError(ERROR_TYPES.CONFLICT, "Version already exists", 409, {
            field: "version",
            value: version,
          });
        }
      }
      updateData.version = version;
    }

    if (date !== undefined) updateData.date = new Date(date);
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    if (changes !== undefined) {
      if (!Array.isArray(changes) || changes.length === 0) {
        return apiError(
          ERROR_TYPES.INVALID_REQUEST,
          "changes must be a non-empty array",
          400,
          { field: "changes" },
        );
      }

      for (const change of changes) {
        if (!change.type || !isValidChangeType(change.type)) {
          return apiError(
            ERROR_TYPES.INVALID_REQUEST,
            `Invalid change type: ${change.type}. Must be one of: ${VALID_CHANGE_TYPES.join(", ")}`,
            400,
            { field: "changes[].type", validTypes: VALID_CHANGE_TYPES },
          );
        }
        if (!change.text || typeof change.text !== "string") {
          return apiError(ERROR_TYPES.INVALID_REQUEST, "Each change must have a text field", 400, {
            field: "changes[].text",
          });
        }
      }

      updateData.changes = changes;
    }

    const entry = await prisma.changelog.update({ where: { id }, data: updateData });

    try {
      await redis.del("changelog:entries");
    } catch {
      // Redis unavailable
    }

    if (idempotencyKey) {
      await storeIdempotencyKey(idempotencyKey, { entry }, 200);
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Update changelog error:", error);
    return apiError(ERROR_TYPES.INTERNAL_ERROR, "Failed to update changelog entry", 500);
  }
}

// ─── DELETE /api/changelog/[id] ────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return apiError(ERROR_TYPES.AUTHENTICATION_REQUIRED, "Authentication required", 401);
    }

    if (!(await isAdminOrModerator(user.id))) {
      return apiError(ERROR_TYPES.FORBIDDEN, "Admin or moderator role required", 403);
    }

    const { id } = await params;

    const existing = await prisma.changelog.findUnique({ where: { id } });
    if (!existing) {
      return apiError(ERROR_TYPES.NOT_FOUND, "Changelog entry not found", 404, { id });
    }

    await prisma.changelog.delete({ where: { id } });

    try {
      await redis.del("changelog:entries");
    } catch {
      // Redis unavailable
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete changelog error:", error);
    return apiError(ERROR_TYPES.INTERNAL_ERROR, "Failed to delete changelog entry", 500);
  }
}