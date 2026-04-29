/**
 * API Response Utilities
 * Consistent error/success response format across all API routes
 */

import { NextResponse } from "next/server";

// Standard error codes
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface APIErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface APISuccessResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface APIListResponse<T> {
  data: T[];
  pagination?: {
    nextCursor: string | null;
    hasMore: boolean;
  };
  meta: {
    timestamp: string;
  };
}

// Error responses
export function unauthorizedError(message = "Authentication required"): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message,
      },
    },
    { status: 401 }
  );
}

export function forbiddenError(message = "Access denied"): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.FORBIDDEN,
        message,
      },
    },
    { status: 403 }
  );
}

export function notFoundError(resource: string, message?: string): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.NOT_FOUND,
        message: message || `${resource} not found`,
      },
    },
    { status: 404 }
  );
}

export function badRequestError(message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.BAD_REQUEST,
        message,
        details,
      },
    },
    { status: 400 }
  );
}

export function validationError(details: unknown): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Validation failed",
        details,
      },
    },
    { status: 400 }
  );
}

export function rateLimitError(retryAfterOrResult: number | { resetAt: number; remaining: number; limit: number; tier: string }): NextResponse {
  let retryAfter: number;
  let remaining: number;
  let limit: number;
  let tier: string;

  if (typeof retryAfterOrResult === "number") {
    // Backward compatible: receive resetAt timestamp
    retryAfter = Math.ceil((retryAfterOrResult - Date.now()) / 1000);
    remaining = 0;
    limit = 0;
    tier = "FREE";
  } else {
    // New format: full RateLimitResult
    retryAfter = Math.ceil((retryAfterOrResult.resetAt - Date.now()) / 1000);
    remaining = retryAfterOrResult.remaining;
    limit = retryAfterOrResult.limit;
    tier = retryAfterOrResult.tier;
  }

  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.RATE_LIMITED,
        message: "Too many requests",
        details: { retryAfter, remaining, limit, tier },
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.floor((Date.now() + retryAfter * 1000) / 1000)),
      },
    }
  );
}

export function internalError(message = "Internal server error"): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message,
      },
    },
    { status: 500 }
  );
}

// Cache control helper
function withCacheControl(response: NextResponse, options: { maxAge?: number; isPrivate?: boolean } = {}): NextResponse {
  const { maxAge = 0, isPrivate = true } = options;

  if (maxAge > 0) {
    response.headers.set(
      "Cache-Control",
      isPrivate
        ? `private, max-age=${maxAge}`
        : `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`
    );
  } else {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

// Success responses with optional caching
export function successResponse<T>(
  data: T,
  meta?: { requestId?: string },
  cacheOptions?: { maxAge?: number; isPrivate?: boolean }
): NextResponse {
  const response = NextResponse.json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });

  return withCacheControl(response, cacheOptions);
}

export function listResponse<T>(
  data: T[],
  pagination?: { nextCursor: string | null; hasMore: boolean },
  cacheOptions?: { maxAge?: number; isPrivate?: boolean }
): NextResponse {
  const response = NextResponse.json({
    data,
    ...(pagination && {
      pagination: {
        nextCursor: pagination.nextCursor,
        hasMore: pagination.hasMore,
      },
    }),
    meta: {
      timestamp: new Date().toISOString(),
    },
  });

  return withCacheControl(response, cacheOptions);
}

export function createdResponse<T>(data: T, location?: string): NextResponse {
  const response = NextResponse.json(data, { status: 201 });
  if (location) {
    response.headers.set("Location", location);
  }
  response.headers.set("Cache-Control", "no-cache");
  return response;
}
