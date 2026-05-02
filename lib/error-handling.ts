/**
 * Error Handling Utilities
 * Production-safe error responses that don't leak internal details
 */

import { NextResponse } from "next/server";
import crypto from "crypto";

// Generate a unique error ID for tracking
function generateErrorId(): string {
  return crypto.randomBytes(8).toString("hex");
}

// Standard error codes
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  FORBIDDEN: "FORBIDDEN",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Log error details internally (for debugging/auditing)
 * NEVER send this to the client
 */
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): string {
  const errorId = generateErrorId();
  const timestamp = new Date().toISOString();
  const errorName = error instanceof Error ? error.name : "Unknown";
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Format for internal logging (server logs, monitoring)
  const logEntry = {
    errorId,
    timestamp,
    context,
    errorName,
    errorMessage,
    stack: errorStack,
    ...metadata,
  };

  // Use console.error to ensure it appears in server logs
  console.error(`[ERROR:${errorId}]`, JSON.stringify(logEntry, null, 2));

  return errorId;
}

/**
 * Create a safe error response for clients
 * Does NOT leak stack traces, internal paths, or error details
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  options?: {
    errorId?: string;
    details?: unknown;
  }
): NextResponse {
  const response: Record<string, unknown> = {
    error: {
      code,
      message,
    },
  };

  if (options?.errorId) {
    response.errorId = options.errorId;
  }

  if (options?.details) {
    (response.error as Record<string, unknown>).details = options.details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Handle errors in API routes with consistent response format
 * Returns a safe error to client, logs full details server-side
 * Shows stacktrace in development, generic message in production
 */
export function handleApiError(
  context: string,
  error: unknown,
  options?: {
    userId?: string;
    requestPath?: string;
    method?: string;
  }
): NextResponse {
  const errorId = logError(context, error, {
    userId: options?.userId,
    requestPath: options?.requestPath,
    method: options?.method,
  });

  const isDev = process.env.NODE_ENV !== "production";

  // Check if it's a known error type for better messaging
  if (error instanceof SyntaxError && error.message.includes("JSON")) {
    return createErrorResponse(
      ErrorCodes.BAD_REQUEST,
      "Invalid JSON in request body",
      400,
      { errorId }
    );
  }

  if (error instanceof Error) {
    // Database connection errors
    if (error.message.includes("connect") || error.message.includes("ECONNREFUSED")) {
      return createErrorResponse(
        ErrorCodes.SERVICE_UNAVAILABLE,
        "Service temporarily unavailable. Please try again later.",
        503,
        { errorId }
      );
    }

    // Prisma errors
    if (error.name === "PrismaClientKnownRequestError") {
      return createErrorResponse(
        ErrorCodes.BAD_REQUEST,
        "Invalid request data",
        400,
        { errorId }
      );
    }
  }

  // Development: show more details (but still don't leak sensitive info)
  if (isDev) {
    const devResponse: Record<string, unknown> = {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : "An unexpected error occurred",
        context,
      },
      errorId,
      stack: error instanceof Error ? error.stack : undefined,
    };

    return NextResponse.json(devResponse, { status: 500 });
  }

  // Production: generic internal error with error ID for tracking
  return createErrorResponse(
    ErrorCodes.INTERNAL_ERROR,
    "An unexpected error occurred. Please try again later.",
    500,
    { errorId }
  );
}

/**
 * Wrapper for try-catch that automatically handles errors
 * Use this in API route handlers
 */
export async function withErrorHandling<T>(
  context: string,
  fn: () => Promise<T>,
  options?: {
    userId?: string;
    requestPath?: string;
    method?: string;
  }
): Promise<NextResponse | T> {
  try {
    return await fn();
  } catch (error) {
    return handleApiError(context, error, options);
  }
}
