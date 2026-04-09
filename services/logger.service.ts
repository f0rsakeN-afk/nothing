/**
 * Request Logging Middleware
 * Logs all API requests with timing, status, and relevant info
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Paths to exclude from logging
const LOG_EXCLUDED_PATHS = ["/api/health", "/api/health/", "/_next"];

// Generate request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function requestLogger(request: NextRequest) {
  // Skip excluded paths
  if (LOG_EXCLUDED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return;
  }

  const requestId = generateRequestId();
  const startTime = Date.now();
  const method = request.method;
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.search;

  // Attach request ID to headers for tracing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // Log request start
  logger.info(`--> ${method} ${pathname}${searchParams}`, {
    requestId,
    method,
    pathname,
    userAgent: request.headers.get("user-agent") || "unknown",
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
  });

  // Wrap the original NextResponse to capture response details
  const originalResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // Add request ID to response headers
  originalResponse.headers.set("x-request-id", requestId);

  // Calculate duration
  const duration = Date.now() - startTime;

  // Log response
  logger.info(`<-- ${method} ${pathname} ${originalResponse.status} ${duration}ms`, {
    requestId,
    method,
    pathname,
    status: originalResponse.status,
    duration,
  });

  return originalResponse;
}

// Hook to use with API routes for detailed logging
export async function logAPIRequest<T>(
  handler: string,
  request: NextRequest,
  fn: () => Promise<T>
): Promise<T> {
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    logger.info(`[${handler}] completed in ${duration}ms`, {
      requestId,
      handler,
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`[${handler}] failed after ${duration}ms`, error as Error, {
      requestId,
      handler,
      duration,
      success: false,
    });

    throw error;
  }
}
