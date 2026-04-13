/**
 * Rate Limit Middleware for Next.js API Routes
 *
 * Usage in API routes:
 *
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const result = await checkApiRateLimit(request, "default");
 *   if (!result.success) {
 *     return rateLimitResponse(result.resetAt);
 *   }
 *
 *   return NextResponse.json({ data: "ok" });
 * }
 * ```
 */

import { NextRequest } from "next/server";
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";

/**
 * Check rate limit for API requests
 *
 * @param request - Next.js request
 * @param tier - Rate limit tier (default, auth, chat, search)
 */
export async function checkApiRateLimit(
  request: NextRequest,
  tier: "default" | "auth" | "chat" | "search" = "default"
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  return rateLimit(request, tier);
}

/**
 * Check rate limit specifically for chat operations
 */
export async function checkChatRateLimit(request: NextRequest) {
  return rateLimit(request, "chat");
}

/**
 * Check rate limit specifically for search operations
 */
export async function checkSearchRateLimit(request: NextRequest) {
  return rateLimit(request, "search");
}

/**
 * Check rate limit specifically for upload operations
 * Uses 'default' tier since uploads aren't explicitly defined
 */
export async function checkUploadRateLimit(request: NextRequest) {
  return rateLimit(request, "default");
}

/**
 * Re-export rateLimitResponse for convenience
 */
export { rateLimitResponse };

