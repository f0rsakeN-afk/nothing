/**
 * API Middleware Helpers
 * Reusable middleware functions for API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

/**
 * Apply rate limiting to a request handler
 * Returns error response if rate limited, null if ok
 */
export async function applyRateLimit(
  request: NextRequest,
  tier: "default" | "auth" | "chat" | "search" | "upload" | "export" = "default"
): Promise<NextResponse | null> {
  const result = await checkApiRateLimit(request, tier);
  if (!result.success) {
    return rateLimitError(result);
  }
  return null;
}

/**
 * Rate limit check result - use with applyRateLimit
 */
export type { RateLimitResult } from "@/lib/rate-limit";
