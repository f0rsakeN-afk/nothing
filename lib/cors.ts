/**
 * CORS Configuration
 * Properly configure Cross-Origin Resource Sharing for production
 */

import { NextRequest, NextResponse } from "next/server";

const CORS_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_SITE_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean));

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, x-user-stack-id, x-user-email",
  "Access-Control-Max-Age": "86400", // 24 hours
};

export function handleCors(request: NextRequest): NextResponse | Response {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin");

    if (origin && isOriginAllowed(origin, request.headers.get("host") || "")) {
      const response = new NextResponse(null, { status: 204 });
      applyCorsHeaders(response, origin);
      return response;
    }

    return new NextResponse(null, { status: 204 });
  }

  // For actual requests, validate origin
  const origin = request.headers.get("origin");

  if (origin && !isOriginAllowed(origin, request.headers.get("host") || "")) {
    return NextResponse.json(
      { error: "CORS policy violation" },
      { status: 403 }
    );
  }

  // Continue with the request, CORS headers will be applied in the response
  return NextResponse.next();
}

function isOriginAllowed(origin: string, host: string): boolean {
  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host;

    // Check allowed origins list
    if (CORS_ORIGINS.has(origin)) {
      return true;
    }

    // Allow localhost in non-production
    if (
      process.env.NODE_ENV !== "production" &&
      (originHost === "localhost:3000" || originHost === "127.0.0.1:3000")
    ) {
      return true;
    }

    // Allow same-origin requests
    if (originHost === host) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function applyCorsHeaders(response: NextResponse, origin: string): void {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
}
