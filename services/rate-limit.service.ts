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
};

export async function rateLimit(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = "default"
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === "development" && process.env.DISABLE_RATE_LIMIT === "true") {
    return { success: true, remaining: 999, resetAt: Date.now() + 60000 };
  }

  const config = RATE_LIMITS[limitType];

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
      await redis.expire(key, config.windowMs / 1000);
    }

    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs);
    const remaining = Math.max(0, config.maxRequests - current);

    if (current > config.maxRequests) {
      return { success: false, remaining: 0, resetAt };
    }

    return { success: true, remaining, resetAt };
  } catch (error) {
    // If Redis fails, allow the request but log the error
    console.error("Rate limit check failed:", error);
    return { success: true, remaining: config.maxRequests, resetAt: Date.now() + config.windowMs };
  }
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: "Too many requests",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
