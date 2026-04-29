/**
 * Rate Limiting Middleware
 * Uses Redis to track request counts per user/IP
 */

import { NextRequest, NextResponse } from "next/server";
import redis, { KEYS, TTL } from "@/lib/redis";

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60; // 1 minute window
const RATE_LIMIT_MAX = 100; // 100 requests per window

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60000, maxRequests: 100 },
  auth: { windowMs: 300000, maxRequests: 10 }, // 10 attempts per 5 min for auth
  chat: { windowMs: 60000, maxRequests: 60 }, // 60 chat messages per min
  search: { windowMs: 60000, maxRequests: 30 }, // 30 searches per min
  upload: { windowMs: 60000, maxRequests: 20 }, // 20 uploads per min
  export: { windowMs: 3600000, maxRequests: 3 }, // 3 exports per hour
};

// Premium tier multipliers (premium users get higher limits)
const TIER_MULTIPLIERS: Record<string, number> = {
  FREE: 1,
  BASIC: 1.5,
  PRO: 2,
  ENTERPRISE: 5,
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  tier: string;
}

export async function rateLimit(
  request: NextRequest | Request,
  limitType: keyof typeof RATE_LIMITS = "default",
  userTier: string = "FREE"
): Promise<RateLimitResult> {
  // Rate limiting bypass ONLY for local development with explicit flag
  // NEVER bypass in production, staging, or any non-local environment
  const isLocalDev = process.env.NODE_ENV === "development";
  const bypassEnabled = process.env.DEV_RATE_LIMIT_BYPASS === "true";

  // Double safeguard: bypass only works if BOTH conditions are explicitly set
  // This prevents accidental bypass in production even if someone misconfigures env
  if (isLocalDev && bypassEnabled) {
    return { success: true, remaining: 999, resetAt: Date.now() + 60000, limit: 999, tier: userTier };
  }

  // In any other environment (production, staging, preview), rate limiting is MANDATORY
  // No bypass possible - this is intentional for security

  const baseConfig = RATE_LIMITS[limitType];
  if (!baseConfig) {
    // Fall back to default if limitType not found
    return rateLimit(request, "default", userTier);
  }

  // Apply tier multiplier
  const multiplier = TIER_MULTIPLIERS[userTier] || 1;
  const maxRequests = Math.floor(baseConfig.maxRequests * multiplier);
  const windowMs = baseConfig.windowMs;

  // Get identifier (user ID from header or IP)
  const userId = request.headers.get("x-user-id");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") ||
             "unknown";

  const identifier = userId || ip;
  const key = `${KEYS.userRateLimit(identifier)}:${limitType}`;

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      // First request in window, set expiry
      await redis.expire(key, windowMs / 1000);
    }

    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);
    const remaining = Math.max(0, maxRequests - current);

    if (current > maxRequests) {
      return { success: false, remaining: 0, resetAt, limit: maxRequests, tier: userTier };
    }

    return { success: true, remaining, resetAt, limit: maxRequests, tier: userTier };
  } catch (error) {
    // If Redis fails, allow the request but log the error
    console.error("Rate limit check failed:", error);
    return { success: true, remaining: maxRequests, resetAt: Date.now() + windowMs, limit: maxRequests, tier: userTier };
  }
}

export function rateLimitResponse(result: RateLimitResult | number): NextResponse {
  let retryAfter: number;
  let limit: number;
  let remaining: number;
  let tier: string;

  if (typeof result === "number") {
    // Backward compatible: receive resetAt timestamp
    retryAfter = Math.ceil((result - Date.now()) / 1000);
    limit = 0;
    remaining = 0;
    tier = "FREE";
  } else {
    // Full RateLimitResult
    retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    limit = result.limit;
    remaining = result.remaining;
    tier = result.tier;
  }

  return NextResponse.json(
    {
      error: "Too many requests",
      code: "RATE_LIMITED",
      retryAfter,
      limit,
      remaining,
      tier,
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

/**
 * Get rate limit analytics for a user
 */
export async function getRateLimitAnalytics(userId: string): Promise<{
  limits: Record<string, { current: number; max: number; resetAt: number }>;
  overall: { totalRequests: number; blockedRequests: number };
}> {
  const limitTypes = Object.keys(RATE_LIMITS);
  const limits: Record<string, { current: number; max: number; resetAt: number }> = {};
  let totalRequests = 0;
  let blockedRequests = 0;

  try {
    for (const limitType of limitTypes) {
      const key = `${KEYS.userRateLimit(userId)}:${limitType}`;
      const [current, ttl] = await Promise.all([
        redis.get(key),
        redis.ttl(key),
      ]);

      const config = RATE_LIMITS[limitType];
      const currentVal = current ? parseInt(current, 10) : 0;
      const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + config.windowMs;

      limits[limitType] = {
        current: currentVal,
        max: config.maxRequests,
        resetAt,
      };

      totalRequests += currentVal;
      if (currentVal > config.maxRequests) {
        blockedRequests += currentVal - config.maxRequests;
      }
    }
  } catch (error) {
    console.error("Failed to get rate limit analytics:", error);
  }

  return { limits, overall: { totalRequests, blockedRequests } };
}
