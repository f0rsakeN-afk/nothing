/**
 * Rate Limiting Middleware
 * Uses Redis to track request counts per user/IP
 *
 * Security features:
 * - Per-user rate limiting with tier multipliers
 * - IP-based fallback for unauthenticated requests
 * - Global IP aggregate limits to prevent multi-account abuse
 * - User-Agent fingerprinting for bot detection
 * - Exponential backoff on failed authentication attempts
 */

import { NextRequest, NextResponse } from "next/server";
import redis, { KEYS, TTL } from "@/lib/redis";
import { withCircuitBreaker, FALLBACK_VALUES } from "@/lib/redis-resilience";

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  maxCap?: number; // Absolute cap regardless of tier multiplier
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60000, maxRequests: 60 },
  auth: { windowMs: 300000, maxRequests: 10 }, // 10 attempts per 5 min for auth
  chat: { windowMs: 60000, maxRequests: 30 }, // 30 chat messages per min
  search: { windowMs: 60000, maxRequests: 15 }, // 15 searches per min
  upload: { windowMs: 60000, maxRequests: 3, maxCap: 10 }, // 3/min base, max 10 even with multiplier
  export: { windowMs: 3600000, maxRequests: 2 }, // 2 exports per hour
};

// Global IP limits (per minute, independent of user tier)
const IP_GLOBAL_LIMITS = {
  windowMs: 60000,
  maxRequests: 120, // Max 120 requests/min from same IP regardless of accounts
  maxAuthFailures: 5, // Max 5 auth failures before exponential backoff
};

// Premium tier multipliers (premium users get higher limits)
const TIER_MULTIPLIERS: Record<string, number> = {
  FREE: 1,
  BASIC: 1.5,
  PRO: 2.5,
  ENTERPRISE: 3,
};

// Exponential backoff config for auth failures
const AUTH_BACKOFF = {
  baseDelayMs: 60000, // 1 minute base delay
  maxDelayMs: 3600000, // 1 hour max delay
  multiplier: 2, // Double delay on each failure
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  tier: string;
}

interface AuthBackoffResult {
  allowed: boolean;
  delayMs: number;
  failures: number;
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: NextRequest | Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") || // Cloudflare
    "unknown"
  );
}

/**
 * Extract User-Agent from request
 */
export function getUserAgent(request: NextRequest | Request): string {
  return request.headers.get("user-agent") || "unknown";
}

/**
 * Create a composite fingerprint from IP + User-Agent
 */
export function getRequestFingerprint(request: NextRequest | Request): string {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);
  // Normalize UA to reduce fingerprinting evasion
  const normalizedUA = ua.length > 100 ? ua.slice(0, 100) : ua;
  return `${ip}:${normalizedUA}`;
}

/**
 * Get user identifier (user ID from headers or IP fallback)
 */
function getUserIdentifier(request: NextRequest | Request): { userId: string | null; ip: string; fingerprint: string } {
  const userId = request.headers.get("x-user-id");
  const ip = getClientIP(request);
  const fingerprint = getRequestFingerprint(request);
  return { userId, ip, fingerprint };
}

/**
 * Check global IP rate limit (prevents multi-account abuse)
 */
async function checkIPGlobalLimit(ip: string): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const key = `${KEYS.ipGlobal(ip)}`;
  const windowMs = IP_GLOBAL_LIMITS.windowMs;

  return withCircuitBreaker(
    "rateLimit",
    async () => {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowMs / 1000);
      }

      const ttl = await redis.ttl(key);
      const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);
      const remaining = Math.max(0, IP_GLOBAL_LIMITS.maxRequests - current);

      if (current > IP_GLOBAL_LIMITS.maxRequests) {
        return { success: false, remaining: 0, resetAt };
      }

      return { success: true, remaining, resetAt };
    },
    FALLBACK_VALUES.ipGlobal
  );
}

/**
 * Check auth failure exponential backoff
 * Returns delay in ms if should be blocked, 0 if allowed
 */
async function checkAuthBackoff(ip: string): Promise<AuthBackoffResult> {
  const key = `${KEYS.authFailures(ip)}`;
  const windowMs = IP_GLOBAL_LIMITS.windowMs;

  return withCircuitBreaker(
    "auth",
    async () => {
      const failures = await redis.get(key);
      const failureCount = failures ? parseInt(failures, 10) : 0;

      if (failureCount === 0) {
        return { allowed: true, delayMs: 0, failures: 0 };
      }

      if (failureCount >= IP_GLOBAL_LIMITS.maxAuthFailures) {
        const backoffLevel = failureCount - IP_GLOBAL_LIMITS.maxAuthFailures;
        const delayMs = Math.min(
          AUTH_BACKOFF.baseDelayMs * Math.pow(AUTH_BACKOFF.multiplier, backoffLevel),
          AUTH_BACKOFF.maxDelayMs
        );

        const ttl = await redis.ttl(key);
        const timeWaitedMs = ttl > 0 ? (windowMs - ttl * 1000) : 0;

        if (timeWaitedMs < delayMs) {
          return { allowed: false, delayMs, failures: failureCount };
        }
      }

      return { allowed: true, delayMs: 0, failures: failureCount };
    },
    FALLBACK_VALUES.authBackoff
  );
}

/**
 * Record failed authentication attempt
 */
async function recordAuthFailure(ip: string): Promise<void> {
  const key = `${KEYS.authFailures(ip)}`;
  const windowMs = IP_GLOBAL_LIMITS.windowMs;

  await withCircuitBreaker(
    "auth",
    async () => {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowMs / 1000);
      }
    },
    undefined
  );
}

/**
 * Clear auth failure counter on successful auth
 */
async function clearAuthFailures(ip: string): Promise<void> {
  const key = `${KEYS.authFailures(ip)}`;
  await withCircuitBreaker("auth", async () => redis.del(key), undefined);
}

/**
 * Main rate limit function with all security checks
 */
export async function rateLimit(
  request: NextRequest | Request,
  limitType: keyof typeof RATE_LIMITS = "default",
  userTier: string = "FREE"
): Promise<RateLimitResult> {
  // Rate limiting bypass ONLY for local development with explicit flag
  const isLocalDev = process.env.NODE_ENV === "development";
  const bypassEnabled = process.env.DEV_RATE_LIMIT_BYPASS === "true";

  if (isLocalDev && bypassEnabled) {
    return { success: true, remaining: 999, resetAt: Date.now() + 60000, limit: 999, tier: userTier };
  }

  const baseConfig = RATE_LIMITS[limitType];
  if (!baseConfig) {
    return rateLimit(request, "default", userTier);
  }

  // Apply tier multiplier
  const multiplier = TIER_MULTIPLIERS[userTier] || 1;
  let maxRequests = Math.floor(baseConfig.maxRequests * multiplier);

  // Apply absolute cap if configured (prevents unlimited even for enterprise)
  if (baseConfig.maxCap && maxRequests > baseConfig.maxCap) {
    maxRequests = baseConfig.maxCap;
  }

  const windowMs = baseConfig.windowMs;

  // Get identifiers
  const { userId, ip, fingerprint } = getUserIdentifier(request);

  // Check global IP limit FIRST (before user limit)
  // This catches multi-account abuse and bots
  const ipCheck = await checkIPGlobalLimit(ip);
  if (!ipCheck.success) {
    return {
      success: false,
      remaining: 0,
      resetAt: ipCheck.resetAt,
      limit: IP_GLOBAL_LIMITS.maxRequests,
      tier: "IP_GLOBAL",
    };
  }

  // Build rate limit key
  // Use userId if authenticated, otherwise use fingerprint (IP + UA)
  const identifier = userId || fingerprint;
  const key = `${KEYS.userRateLimit(identifier)}:${limitType}`;

  return withCircuitBreaker(
    "rateLimit",
    async () => {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowMs / 1000);
      }

      const ttl = await redis.ttl(key);
      const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);
      const remaining = Math.max(0, maxRequests - current);

      if (current > maxRequests) {
        return { success: false, remaining: 0, resetAt, limit: maxRequests, tier: userTier };
      }

      return { success: true, remaining, resetAt, limit: maxRequests, tier: userTier };
    },
    { success: true, remaining: maxRequests, resetAt: Date.now() + windowMs, limit: maxRequests, tier: userTier }
  );
}

/**
 * Check rate limit with auth failure tracking
 * Use for auth-related endpoints
 */
export async function rateLimitWithAuthCheck(
  request: NextRequest | Request,
  limitType: keyof typeof RATE_LIMITS = "default",
  userTier: string = "FREE"
): Promise<RateLimitResult> {
  const ip = getClientIP(request);

  // Check exponential backoff first
  const backoff = await checkAuthBackoff(ip);
  if (!backoff.allowed) {
    const retryAfter = Math.ceil(backoff.delayMs / 1000);
    return {
      success: false,
      remaining: 0,
      resetAt: Date.now() + backoff.delayMs,
      limit: 0,
      tier: "AUTH_BACKOFF",
    };
  }

  // Continue with normal rate limit check
  const result = await rateLimit(request, limitType, userTier);

  // If rate limit failed and IP has many auth failures, suggest exponential backoff
  if (!result.success && backoff.failures > IP_GLOBAL_LIMITS.maxAuthFailures) {
    const backoffLevel = backoff.failures - IP_GLOBAL_LIMITS.maxAuthFailures;
    const delayMs = Math.min(
      AUTH_BACKOFF.baseDelayMs * Math.pow(AUTH_BACKOFF.multiplier, backoffLevel),
      AUTH_BACKOFF.maxDelayMs
    );
    // Override resetAt with larger backoff delay
    result.resetAt = Date.now() + delayMs;
  }

  return result;
}

/**
 * Record failed auth attempt and apply backoff tracking
 */
export async function recordAuthFailureAttempt(request: NextRequest | Request): Promise<void> {
  const ip = getClientIP(request);
  await recordAuthFailure(ip);
}

/**
 * Clear auth failures on successful authentication
 */
export async function clearAuthFailureOnSuccess(request: NextRequest | Request): Promise<void> {
  const ip = getClientIP(request);
  await clearAuthFailures(ip);
}

export function rateLimitResponse(result: RateLimitResult | number): NextResponse {
  let retryAfter: number;
  let limit: number;
  let remaining: number;
  let tier: string;

  if (typeof result === "number") {
    retryAfter = Math.ceil((result - Date.now()) / 1000);
    limit = 0;
    remaining = 0;
    tier = "FREE";
  } else {
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

/**
 * Get user tier from request headers (set by proxy)
 * Falls back to FREE if not available
 */
export function getUserTierFromRequest(request: NextRequest | Request): string {
  return request.headers.get("x-user-tier") || "FREE";
}

/**
 * Rate limit with auth - automatically gets user tier from proxy headers
 */
export async function rateLimitWithAuth(
  request: NextRequest | Request,
  limitType: keyof typeof RATE_LIMITS = "default"
): Promise<RateLimitResult> {
  const userTier = getUserTierFromRequest(request);
  return rateLimit(request, limitType, userTier);
}

// Export TIER_MULTIPLIERS and RATE_LIMITS for reference
export { TIER_MULTIPLIERS, RATE_LIMITS };