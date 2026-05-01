/**
 * Limits Middleware
 * API route helpers for checking limits before actions
 */

import { NextResponse } from "next/server";
import type { LimitCheckResult } from "@/services/limits/service";
import { checkLimit, type LimitFeature, type CheckOptions } from "@/services/limits/service";

/**
 * Create a 403 response for limit exceeded
 */
export function limitExceededResponse(result: LimitCheckResult): NextResponse {
  return NextResponse.json(
    {
      error: result.error || "Limit exceeded",
      feature: result.feature,
      upgradeTo: result.upgradeTo,
      current: result.current,
      limit: result.limit,
      remaining: result.remaining,
      isWarning: result.isWarning,
    },
    { status: 403 }
  );
}

/**
 * Add warning headers to response if approaching limit
 */
export function addWarningHeaders(
  response: NextResponse,
  result: LimitCheckResult
): NextResponse {
  if (result.isWarning && result.allowed) {
    response.headers.set("X-Limit-Warning", JSON.stringify({
      feature: result.feature,
      current: result.current,
      limit: result.limit,
      percentage: result.percentage,
      remaining: result.remaining,
      upgradeTo: result.upgradeTo,
    }));
  }
  return response;
}

/**
 * Check limit and return error response if not allowed
 * Returns null if allowed (caller continues)
 */
export async function checkLimitAndRespond(
  userId: string,
  feature: LimitFeature,
  options?: CheckOptions
): Promise<NextResponse | null> {
  const result = await checkLimit(userId, feature, options);

  if (!result.allowed) {
    return limitExceededResponse(result);
  }

  if (result.isWarning) {
    // Return 200 but with warning header for UI to show banner
    const response = NextResponse.json({ success: true });
    return addWarningHeaders(response, result);
  }

  return null;
}

/**
 * Middleware wrapper for API route handlers
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const user = await validateAuth(request);
 *   if (!user) return unauthorizedError();
 *
 *   const limitCheck = await checkLimits(user.id, "CHAT");
 *   if (limitCheck.blocked) return limitCheck.response;
 *   // continue with handler...
 * }
 * ```
 */
export async function checkLimits(
  userId: string,
  feature: LimitFeature,
  options?: CheckOptions
): Promise<{ allowed: boolean; result: LimitCheckResult; response?: NextResponse }> {
  const result = await checkLimit(userId, feature, options);

  if (!result.allowed) {
    return {
      allowed: false,
      result,
      response: limitExceededResponse(result),
    };
  }

  return { allowed: true, result };
}

/**
 * Check multiple features at once (all must pass)
 */
export async function checkAllLimits(
  userId: string,
  features: LimitFeature[]
): Promise<{
  allowed: boolean;
  results: LimitCheckResult[];
  blockedBy?: LimitCheckResult;
  response?: NextResponse;
}> {
  const results: LimitCheckResult[] = [];

  for (const feature of features) {
    const result = await checkLimit(userId, feature);
    results.push(result);

    if (!result.allowed) {
      return {
        allowed: false,
        results,
        blockedBy: result,
        response: limitExceededResponse(result),
      };
    }
  }

  return { allowed: true, results };
}