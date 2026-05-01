/**
 * Limits Cache Layer
 * Redis caching for plan limits and usage stats
 * Implements cache-aside pattern with TTL and batch operations
 */

import redis, { KEYS, TTL, createPipeline } from "@/lib/redis";
import prisma from "@/lib/prisma";
import { CACHE_TTL } from "./constants";
import type { PlanData, UserUsage } from "./types";

/**
 * Get cached user limits from Redis
 * Falls back to DB if cache miss
 */
export async function getCachedUserLimits(
  userId: string
): Promise<{ plan: PlanData | null; isActiveSubscription: boolean }> {
  const cacheKey = `user:limits:${userId}`;

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() < parsed.expiresAt) {
        return { plan: parsed.plan, isActiveSubscription: parsed.isActiveSubscription };
      }
    }
  } catch {
    // Redis error, continue to DB
  }

  // Fetch from DB (optimized - single query with free plan fallback)
  const result = await fetchUserLimitsFromDb(userId);

  // Cache the result
  try {
    await redis.setex(
      cacheKey,
      CACHE_TTL.LIMITS,
      JSON.stringify({
        plan: result.plan,
        isActiveSubscription: result.isActiveSubscription,
        expiresAt: Date.now() + CACHE_TTL.LIMITS * 1000,
      })
    );
  } catch {
    // Redis error, ignore
  }

  return result;
}

/**
 * Fetch user limits from database (optimized - no sequential queries)
 */
async function fetchUserLimitsFromDb(userId: string): Promise<{
  plan: PlanData | null;
  isActiveSubscription: boolean;
}> {
  // Single parallel query: user + free plan fallback
  const [user, freePlan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPlan: true,
        subscription: true,
      },
    }),
    prisma.plan.findUnique({
      where: { tier: "FREE" },
    }),
  ]);

  if (!user) {
    return { plan: null, isActiveSubscription: false };
  }

  // Check active subscription first
  let effectivePlan: PlanData | null = null;
  let isActiveSubscription = false;

  if (user.subscription) {
    const sub = user.subscription;
    const now = new Date();

    if (
      (sub.status === "ACTIVE" || sub.status === "TRIALING") &&
      (sub.currentPeriodEnd > now || sub.cancelAtPeriodEnd)
    ) {
      isActiveSubscription = true;
      effectivePlan = user.userPlan ? transformPlanToPlanData(user.userPlan) : null;
    }
  }

  // Fall back to plan with credits (legacy support)
  if (!effectivePlan && user.userPlan && user.credits > 0) {
    effectivePlan = transformPlanToPlanData(user.userPlan);
  }

  // Fall back to free tier (already fetched in parallel)
  if (!effectivePlan && freePlan) {
    effectivePlan = transformPlanToPlanData(freePlan);
  }

  return { plan: effectivePlan, isActiveSubscription };
}

/**
 * Transform Prisma Plan to PlanData
 */
function transformPlanToPlanData(plan: {
  id: string;
  tier: string;
  name: string;
  description: string;
  price: number;
  polarPriceId: string | null;
  polarProductId: string | null;
  credits: number;
  maxChats: number;
  maxProjects: number;
  maxMessages: number;
  maxMemoryItems: number;
  maxBranchesPerChat: number;
  maxFolders: number;
  maxAttachmentsPerChat: number;
  maxFileSizeMb: number;
  canExport: boolean;
  canApiAccess: boolean;
  features: string[];
  isActive: boolean;
  isVisible: boolean;
}): PlanData {
  return {
    id: plan.id,
    tier: plan.tier,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    polarPriceId: plan.polarPriceId,
    polarProductId: plan.polarProductId,
    credits: plan.credits,
    maxChats: plan.maxChats,
    maxProjects: plan.maxProjects,
    maxMessages: plan.maxMessages,
    maxMemoryItems: plan.maxMemoryItems,
    maxBranchesPerChat: plan.maxBranchesPerChat,
    maxFolders: plan.maxFolders,
    maxAttachmentsPerChat: plan.maxAttachmentsPerChat,
    maxFileSizeMb: plan.maxFileSizeMb,
    canExport: plan.canExport,
    canApiAccess: plan.canApiAccess,
    features: plan.features,
    isActive: plan.isActive,
    isVisible: plan.isVisible,
  };
}

/**
 * Get cached usage stats from Redis
 * Falls back to DB if cache miss
 */
export async function getCachedUsageStats(userId: string): Promise<UserUsage> {
  const now = new Date();
  const month = now.getMonth() + 1; // JS months are 0-indexed
  const year = now.getFullYear();
  const cacheKey = `user:usage:${userId}:${month}:${year}`;

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        userId,
        usedMessages: parsed.usedMessages,
        month,
        year,
      };
    }
  } catch {
    // Redis error, continue to DB
  }

  // Fetch from DB
  const stats = await prisma.userUsageStats.findUnique({
    where: { userId },
  });

  // Check if stats are for current month (reset if not)
  let usedMessages = 0;
  if (stats && stats.month === month && stats.year === year) {
    usedMessages = stats.usedMessages;
  }

  // Cache the result
  try {
    await redis.setex(
      cacheKey,
      CACHE_TTL.USAGE,
      JSON.stringify({ usedMessages })
    );
  } catch {
    // Redis error, ignore
  }

  return { userId, usedMessages, month, year };
}

/**
 * Increment usage count atomically in Redis
 * Called when a message is sent
 */
export async function incrementMessageCount(userId: string): Promise<number> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const redisKey = `user:usage:${userId}:${month}:${year}`;

  try {
    // Atomic increment in Redis
    const newCount = await redis.incr(redisKey);

    // Set expiry if this is a new key (was just created)
    const ttl = await redis.ttl(redisKey);
    if (ttl === -1) {
      // No expiry set, calculate days until end of month
      const endOfMonth = new Date(year, month, 0).getDate();
      const daysLeft = endOfMonth - now.getDate();
      await redis.expire(redisKey, daysLeft * 24 * 60 * 60);
    }

    // Also persist to DB asynchronously
    persistUsageToDb(userId, month, year).catch((err) => {
      console.error("[LimitsCache] Failed to persist usage to DB:", err);
    });

    return newCount;
  } catch (err) {
    console.error("[LimitsCache] Redis incr failed:", err);
    // Fallback to DB-only increment
    return await incrementMessageCountInDb(userId, month, year);
  }
}

/**
 * Persist usage from Redis to DB (async, fire-and-forget)
 */
async function persistUsageToDb(
  userId: string,
  month: number,
  year: number
): Promise<void> {
  const redisKey = `user:usage:${userId}:${month}:${year}`;
  const count = await redis.get(redisKey);

  if (count === null) return;

  await prisma.userUsageStats.upsert({
    where: { userId },
    update: {
      usedMessages: parseInt(count, 10),
      month,
      year,
    },
    create: {
      userId,
      usedMessages: parseInt(count, 10),
      month,
      year,
    },
  });
}

/**
 * Fallback: increment message count directly in DB
 */
async function incrementMessageCountInDb(
  userId: string,
  month: number,
  year: number
): Promise<number> {
  const stats = await prisma.userUsageStats.findUnique({
    where: { userId },
  });

  if (stats && stats.month === month && stats.year === year) {
    const updated = await prisma.userUsageStats.update({
      where: { userId },
      data: { usedMessages: { increment: 1 } },
    });
    return updated.usedMessages;
  } else {
    const created = await prisma.userUsageStats.upsert({
      where: { userId },
      update: {
        usedMessages: 1,
        month,
        year,
      },
      create: {
        userId,
        usedMessages: 1,
        month,
        year,
      },
    });
    return created.usedMessages;
  }
}

/**
 * Invalidate user's limits cache
 * Called when plan or subscription changes
 */
export async function invalidateLimitsCache(userId: string): Promise<void> {
  try {
    await redis.del(`user:limits:${userId}`);
  } catch (err) {
    console.error("[LimitsCache] Failed to invalidate limits cache:", err);
  }
}

/**
 * Invalidate user's usage cache
 * Called when usage changes
 */
export async function invalidateUsageCache(userId: string): Promise<void> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    await redis.del(`user:usage:${userId}:${month}:${year}`);
  } catch (err) {
    console.error("[LimitsCache] Failed to invalidate usage cache:", err);
  }
}

/**
 * Batch invalidate all user caches (uses Redis pipeline for performance)
 * Call when: user account updated, subscription changed, major plan change
 */
export async function invalidateAllUserCaches(userId: string): Promise<void> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const keys = [
    `user:limits:${userId}`,
    `user:usage:${userId}:${month}:${year}`,
    KEYS.userAccount(userId),
    KEYS.userCredits(userId),
    KEYS.userSubscription(userId),
  ];

  try {
    // Use pipeline for batch delete - much faster than sequential deletes
    const pipeline = createPipeline();
    keys.forEach((key) => pipeline.del(key));
    await pipeline.exec();
  } catch (err) {
    console.error("[LimitsCache] Failed to batch invalidate caches:", err);
    // Fallback to sequential delete
    await Promise.all(keys.map((key) => redis.del(key).catch(() => null)));
  }
}