/**
 * Subscription Cache Service
 * Handles caching of user subscription data for the plans API
 *
 * Shared between:
 * - app/api/polar/plans/route.ts (reads & writes cache)
 * - services/webhook-handler.service.ts (invalidates on subscription changes)
 */

import redis, { KEYS, TTL } from "@/lib/redis";

export interface SubscriptionCache {
  planTier: string | null;
  status: string | null;
}

/**
 * Get subscription cache from Redis
 */
export async function getSubscriptionCache(
  userId: string
): Promise<SubscriptionCache | null> {
  const cacheKey = KEYS.userSubscription(userId);

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SubscriptionCache;
    }
  } catch (error) {
    console.warn("[SubscriptionCache] Redis get failed:", error);
  }

  return null;
}

/**
 * Set subscription cache in Redis
 */
export async function setSubscriptionCache(
  userId: string,
  data: SubscriptionCache
): Promise<void> {
  const cacheKey = KEYS.userSubscription(userId);

  try {
    await redis.setex(cacheKey, TTL.userSubscription, JSON.stringify(data));
  } catch (error) {
    console.warn("[SubscriptionCache] Redis setex failed:", error);
  }
}

/**
 * Invalidate (delete) subscription cache
 * Called when user subscribes, upgrades, cancels, etc.
 */
export async function invalidateSubscriptionCache(
  userId: string
): Promise<void> {
  try {
    await redis.del(KEYS.userSubscription(userId));
  } catch (error) {
    console.warn("[SubscriptionCache] Redis del failed:", error);
  }
}
