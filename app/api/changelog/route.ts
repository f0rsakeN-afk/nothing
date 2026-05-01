import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import type { Prisma } from "@/src/generated/prisma/client";

const CHANGELOG_CACHE_KEY = "changelog:entries";
const CHANGELOG_CACHE_TTL = 60 * 60; // 1 hour

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

interface Change {
  type: ChangeType;
  text: string;
}

function isValidChangeType(type: string): type is ChangeType {
  return VALID_CHANGE_TYPES.includes(type as ChangeType);
}

// ─── Field filtering ────────────────────────────────────────────────────────────

const ALLOWED_FIELDS = [
  "id",
  "version",
  "date",
  "title",
  "description",
  "changes",
  "isPublished",
  "createdAt",
  "updatedAt",
] as const;

type FieldName = (typeof ALLOWED_FIELDS)[number];

function parseFields(fieldsParam: string | null): Set<FieldName> | null {
  if (!fieldsParam) return null;
  const requested = fieldsParam.split(",").map((f) => f.trim());
  const allowed = new Set<FieldName>();
  for (const f of requested) {
    if (ALLOWED_FIELDS.includes(f as FieldName)) {
      allowed.add(f as FieldName);
    }
  }
  return allowed.size > 0 ? allowed : null;
}

// ─── Cache ─────────────────────────────────────────────────────────────────────

async function getCachedChangelog(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setChangelogCache(cacheKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    await redis.setex(cacheKey, CHANGELOG_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }
}

async function invalidateChangelogCache(): Promise<void> {
  try {
    const keys = await redis.keys("changelog:list:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.del(CHANGELOG_CACHE_KEY);
  } catch {
    // Redis unavailable
  }
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

// ─── GET /api/changelog ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnpublished = searchParams.get("includeUnpublished") === "true";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search")?.toLowerCase() || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const fieldsParam = searchParams.get("fields");

    // Admin check for unpublished entries
    if (includeUnpublished) {
      const user = await validateAuth(request);
      if (!user || !(await isAdminOrModerator(user.id))) {
        return apiError(ERROR_TYPES.FORBIDDEN, "Not authorized to view unpublished entries", 403);
      }
    }

    // Build cache key based on all filter params (admin cache includes unpublished)
    const cacheKey = `changelog:list:${includeUnpublished}:${limit}:${search || "all"}:${cursor || "none"}:${fieldsParam || "all"}`;

    // Try cache first (only for non-search, non-cursor requests)
    if (!search && !cursor && !fieldsParam) {
      const cached = await getCachedChangelog(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { "X-Cache": "HIT" },
        });
      }
    }

    // Field filtering
    const fields = parseFields(fieldsParam);

    // Build where clause
    const where: Prisma.ChangelogWhereInput = includeUnpublished ? {} : { isPublished: true };

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { version: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build select from fields param
    const select = fields
      ? Object.fromEntries(Array.from(fields).map((f) => [f, true]))
      : {
          id: true,
          version: true,
          date: true,
          title: true,
          description: true,
          changes: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
        };

    // Cursor-based pagination
    const entries = await prisma.changelog.findMany({
      where,
      orderBy: { date: "desc" },
      select,
      take: limit + 1, // fetch one extra to determine hasMore
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    const hasMore = entries.length > limit;
    const data = hasMore ? entries.slice(0, -1) : entries;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    const response: Record<string, unknown> = {
      data,
      hasMore,
      count: data.length,
    };
    if (nextCursor) response.nextCursor = nextCursor;
    if (search) response.search = search;

    // Cache result (only for non-search, non-cursor requests)
    if (!search && !cursor && !fieldsParam) {
      await setChangelogCache(cacheKey, response);
    }

    return NextResponse.json(response, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("Get changelog error:", error);
    return apiError(ERROR_TYPES.INTERNAL_ERROR, "Failed to get changelog", 500);
  }
}

// ─── POST /api/changelog ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    // Idempotency check
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

    const body = await request.json();
    const { version, date, title, description, changes, isPublished } = body;

    // Validation
    if (!version || typeof version !== "string") {
      return apiError(ERROR_TYPES.INVALID_REQUEST, "version is required", 400, {
        field: "version",
        type: "string required",
      });
    }

    if (!title || typeof title !== "string") {
      return apiError(ERROR_TYPES.INVALID_REQUEST, "title is required", 400, {
        field: "title",
        type: "string required",
      });
    }

    if (!description || typeof description !== "string") {
      return apiError(ERROR_TYPES.INVALID_REQUEST, "description is required", 400, {
        field: "description",
        type: "string required",
      });
    }

    if (!Array.isArray(changes) || changes.length === 0) {
      return apiError(ERROR_TYPES.INVALID_REQUEST, "changes must be a non-empty array", 400, {
        field: "changes",
        type: "array with at least 1 item required",
      });
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
          type: "string required",
        });
      }
    }

    // Version uniqueness check
    const existing = await prisma.changelog.findUnique({ where: { version } });
    if (existing) {
      return apiError(ERROR_TYPES.CONFLICT, "Version already exists", 409, {
        field: "version",
        existingVersion: version,
      });
    }

    const entry = await prisma.changelog.create({
      data: {
        version,
        date: date ? new Date(date) : new Date(),
        title,
        description,
        changes: changes as unknown as Prisma.InputJsonValue,
        isPublished: isPublished ?? false,
      },
    });

    await invalidateChangelogCache();

    // Store idempotency result
    if (idempotencyKey) {
      await storeIdempotencyKey(idempotencyKey, { entry }, 201);
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Create changelog error:", error);
    return apiError(ERROR_TYPES.INTERNAL_ERROR, "Failed to create changelog entry", 500);
  }
}