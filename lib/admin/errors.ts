/**
 * Admin-specific RFC 7807 error helpers
 */

import { NextResponse } from "next/server";

export const ADMIN_ERROR_TYPES = {
  INVALID_REQUEST: "invalid_request",
  AUTHENTICATION_REQUIRED: "authentication_required",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  RATE_LIMITED: "rate_limited",
  INTERNAL_ERROR: "internal_error",
} as const;

type ErrorType = (typeof ADMIN_ERROR_TYPES)[keyof typeof ADMIN_ERROR_TYPES];

export function adminError(
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

export function adminNotFound(message = "Resource not found") {
  return adminError(ADMIN_ERROR_TYPES.NOT_FOUND, message, 404);
}

export function adminForbidden(message = "Admin or moderator role required") {
  return adminError(ADMIN_ERROR_TYPES.FORBIDDEN, message, 403);
}

export function adminUnauthorized(message = "Authentication required") {
  return adminError(ADMIN_ERROR_TYPES.AUTHENTICATION_REQUIRED, message, 401);
}

export function adminBadRequest(message: string, details?: Record<string, unknown>) {
  return adminError(ADMIN_ERROR_TYPES.INVALID_REQUEST, message, 400, details);
}