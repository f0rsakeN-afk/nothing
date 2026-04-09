/**
 * Brute Force Protection
 * Tracks failed login attempts and temporarily blocks repeated failures
 */

import redis, { KEYS, TTL } from "@/lib/redis";

export interface BruteForceResult {
  blocked: boolean;
  attempts: number;
  remainingAttempts: number;
  blockedUntil?: number;
}

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_SECONDS = 300; // 5 minutes

/**
 * Check if an action should be blocked due to too many failures
 */
export async function checkBruteForce(identifier: string): Promise<BruteForceResult> {
  const key = KEYS.bruteForce(identifier);

  try {
    const attempts = await redis.get(key);

    if (!attempts) {
      return { blocked: false, attempts: 0, remainingAttempts: MAX_ATTEMPTS };
    }

    const attemptCount = parseInt(attempts, 10);

    if (attemptCount >= MAX_ATTEMPTS) {
      const ttl = await redis.ttl(key);
      return {
        blocked: true,
        attempts: attemptCount,
        remainingAttempts: 0,
        blockedUntil: Date.now() + ttl * 1000,
      };
    }

    return {
      blocked: false,
      attempts: attemptCount,
      remainingAttempts: MAX_ATTEMPTS - attemptCount,
    };
  } catch {
    // Redis error - fail open
    return { blocked: false, attempts: 0, remainingAttempts: MAX_ATTEMPTS };
  }
}

/**
 * Record a failed attempt
 */
export async function recordFailedAttempt(identifier: string): Promise<void> {
  const key = KEYS.bruteForce(identifier);

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      // First failed attempt, set expiry
      await redis.expire(key, BLOCK_DURATION_SECONDS);
    }

    // If we've hit max attempts, ensure the key expires properly
    if (current >= MAX_ATTEMPTS) {
      await redis.expire(key, BLOCK_DURATION_SECONDS);
    }
  } catch {
    // Redis error - continue
  }
}

/**
 * Reset failed attempts (on successful auth)
 */
export async function resetBruteForce(identifier: string): Promise<void> {
  const key = KEYS.bruteForce(identifier);

  try {
    await redis.del(key);
  } catch {
    // Redis error - continue
  }
}

/**
 * Get time until blocked action is unblocked
 */
export async function getBlockTimeRemaining(identifier: string): Promise<number> {
  const key = KEYS.bruteForce(identifier);

  try {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  } catch {
    return 0;
  }
}
