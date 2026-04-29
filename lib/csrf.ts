/**
 * CSRF Protection
 * Validates Origin header to prevent cross-site request forgery
 *
 * Usage in API routes:
 *
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const csrfError = validateRequestOrigin(request);
 *   if (csrfError) return csrfError;
 *   // handle request...
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_SITE_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean));

export function validateRequestOrigin(request: NextRequest): NextResponse | null {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  const method = request.method;
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return null;
  }

  // Check Origin header for state-changing requests
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // If no origin header and it's not a GET, consider it suspicious
  // (browsers always send origin for cross-site requests)
  if (!origin && method !== "GET") {
    // Allow requests from same origin (no origin header indicates same origin)
    const referer = request.headers.get("referer");
    if (!referer) {
      // No origin, no referer - likely a direct API call (e.g., from mobile app)
      // In this case, rely on other auth mechanisms
      return null;
    }
  }

  // If origin exists, verify it matches allowed origins
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host;

      // Check if origin is in allowed list
      if (ALLOWED_ORIGINS.has(origin)) {
        return null;
      }

      // Allow localhost variations in development
      if (
        process.env.NODE_ENV !== "production" &&
        (originHost === "localhost:3000" || originHost === "127.0.0.1:3000")
      ) {
        return null;
      }

      // Check if origin matches the host (same origin)
      if (originHost === host) {
        return null;
      }

      return csrfErrorResponse();
    } catch {
      return csrfErrorResponse();
    }
  }

  // Allow if we can't determine origin (rely on other auth)
  return null;
}

export function csrfErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "CSRF validation failed",
      code: "CSRF_ERROR",
      message: "Request origin is not allowed. Please ensure you're making requests from the official domain.",
    },
    { status: 403 }
  );
}
