/**
 * Rate Limit Middleware for Next.js API Routes
 *
 * Usage in API routes:
 *
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const result = await checkApiRateLimit(request, "default");
 *   if (!result.success) {
 *     return rateLimitResponse(result);
 *   }
 *
 *   return NextResponse.json({ data: "ok" });
 * }
 * ```
 */

import { NextRequest } from "next/server";
import { rateLimit, rateLimitResponse, getRateLimitAnalytics, type RateLimitResult } from "@/services/rate-limit.service";

export type { RateLimitResult };

/**
 * Check rate limit for API requests
 * Accepts both NextRequest and standard Request
 *
 * @param request - Next.js request
 * @param tier - Rate limit tier (default, auth, chat, search, upload, export)
 * @param userTier - User's plan tier for limit multiplier
 */
export async function checkApiRateLimit(
  request: NextRequest | Request,
  tier: "default" | "auth" | "chat" | "search" | "upload" | "export" = "default",
  userTier: string = "FREE"
): Promise<RateLimitResult> {
  return rateLimit(request, tier, userTier);
}

/**
 * Check rate limit specifically for chat operations
 */
export async function checkChatRateLimit(request: NextRequest, userTier: string = "FREE") {
  return rateLimit(request, "chat", userTier);
}

/**
 * Check rate limit specifically for search operations
 */
export async function checkSearchRateLimit(request: NextRequest, userTier: string = "FREE") {
  return rateLimit(request, "search", userTier);
}

/**
 * Check rate limit specifically for upload operations
 */
export async function checkUploadRateLimit(request: NextRequest, userTier: string = "FREE") {
  return rateLimit(request, "upload", userTier);
}

/**
 * Check rate limit specifically for export operations
 */
export async function checkExportRateLimit(request: NextRequest, userTier: string = "FREE") {
  return rateLimit(request, "export", userTier);
}

/**
 * Get rate limit analytics for a user
 */
export { getRateLimitAnalytics };

/**
 * Re-export rateLimitResponse for convenience
 */
export { rateLimitResponse };

