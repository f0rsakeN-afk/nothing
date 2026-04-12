/**
 * Limit Service
 * Checks user limits based on their plan
 * Handles all edge cases for feature access
 * Includes caching to avoid hitting DB on every request
 */

import prisma from "@/lib/prisma";
import { getPlan, type PlanData } from "@/services/plan.service";
import redis from "@/lib/redis";

const CACHE_TTL = 300; // 5 minutes

interface CachedUserLimits {
  plan: PlanData | null;
  isActiveSubscription: boolean;
  expiresAt: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  current?: number;
  limit?: number;
  error?: string;
  feature?: string;
}

export interface UserLimits {
  maxMemoryItems: number;
  maxBranchesPerChat: number;
  maxFolders: number;
  maxAttachmentsPerChat: number;
  maxFileSizeMb: number;
  canExport: boolean;
  canApiAccess: boolean;
  hasFeature: (feature: string) => boolean;
  planName: string;
  planTier: string;
  maxProjects: number;
  maxChats: number;
  maxMessages: number;
}

/**
 * Get user's current limits based on their plan
 * Uses Redis caching to avoid hitting DB on every request
 */
export async function getUserLimits(userId: string): Promise<UserLimits> {
  const cacheKey = `user:limits:${userId}`;

  // Try to get from cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed: CachedUserLimits = JSON.parse(cached);
      if (Date.now() < parsed.expiresAt) {
        return buildUserLimits(parsed.plan);
      }
    }
  } catch {
    // Redis error, continue to DB
  }

  // Fetch from DB
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userPlan: true,
      subscription: true,
    },
  });

  // Determine effective plan based on subscription status
  let effectivePlan: PlanData | null = null;
  let isActiveSubscription = false;

  if (user?.subscription) {
    const sub = user.subscription;
    const now = new Date();

    if (sub.status === "ACTIVE" || sub.status === "TRIALING") {
      if (sub.currentPeriodEnd > now || sub.cancelAtPeriodEnd) {
        // Subscription is active
        isActiveSubscription = true;
        effectivePlan = user.userPlan;
      }
    }
  }

  // If no effective plan from subscription, check if user has plan with credits
  if (!effectivePlan) {
    if (user?.userPlan && user.credits > 0) {
      // User has credits remaining from their plan, keep using it
      effectivePlan = user.userPlan;
    } else {
      // Fall back to free tier
      effectivePlan = await getPlan("free");
    }
  }

  // If subscription ended but user has credits, they keep plan benefits
  // If subscription ended AND credits are 0, strip to free tier

  // Cache the result
  const toCache: CachedUserLimits = {
    plan: effectivePlan,
    isActiveSubscription,
    expiresAt: Date.now() + CACHE_TTL * 1000,
  };

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(toCache));
  } catch {
    // Redis error, ignore
  }

  return buildUserLimits(effectivePlan);
}

function buildUserLimits(plan: PlanData | null): UserLimits {
  const effectivePlan = plan || {
    maxMemoryItems: 0,
    maxBranchesPerChat: 0,
    maxFolders: 0,
    maxAttachmentsPerChat: 0,
    maxFileSizeMb: 0,
    canExport: false,
    canApiAccess: false,
    features: [],
    id: "free",
    tier: "FREE",
    name: "Free",
    description: "",
    price: 0,
    stripePriceId: null,
    stripeProductId: null,
    credits: 25,
    maxChats: 100,
    maxProjects: 2,
    maxMessages: 100,
    isActive: true,
    isVisible: true,
  };

  return {
    maxMemoryItems: effectivePlan.maxMemoryItems,
    maxBranchesPerChat: effectivePlan.maxBranchesPerChat,
    maxFolders: effectivePlan.maxFolders,
    maxAttachmentsPerChat: effectivePlan.maxAttachmentsPerChat,
    maxFileSizeMb: effectivePlan.maxFileSizeMb,
    canExport: effectivePlan.canExport,
    canApiAccess: effectivePlan.canApiAccess,
    hasFeature: (feature: string) => effectivePlan.features.includes(feature),
    planName: effectivePlan.name,
    planTier: effectivePlan.tier,
    maxProjects: effectivePlan.maxProjects,
    maxChats: effectivePlan.maxChats,
    maxMessages: effectivePlan.maxMessages,
  };
}

/**
 * Invalidate user's limits cache (call when plan changes)
 */
export async function invalidateUserLimitsCache(userId: string): Promise<void> {
  try {
    await redis.del(`user:limits:${userId}`);
  } catch {
    // Redis error, ignore
  }
}

/**
 * Check if user can create a new chat
 */
export async function checkChatLimit(userId: string): Promise<LimitCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxChats: true },
  });

  const chatCount = await prisma.chat.count({
    where: { userId, archivedAt: null },
  });

  const current = chatCount;
  const limit = user?.maxChats ?? 100;

  if (limit === -1) {
    return { allowed: true }; // unlimited
  }

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      error: `Chat limit reached (${limit}). Upgrade for unlimited chats.`,
    };
  }

  return { allowed: true, current, limit };
}

/**
 * Check if user can create a new project
 */
export async function checkProjectLimit(userId: string): Promise<LimitCheckResult> {
  const limits = await getUserLimits(userId);

  const projectCount = await prisma.project.count({
    where: { userId, archivedAt: null },
  });

  const current = projectCount;
  const limit = limits.maxProjects;

  if (limit === -1) {
    return { allowed: true };
  }

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      error: `Project limit reached (${limit}). Upgrade for unlimited projects.`,
    };
  }

  return { allowed: true, current, limit };
}

/**
 * Check if user can add a memory item
 */
export async function checkMemoryLimit(userId: string): Promise<LimitCheckResult> {
  const limits = await getUserLimits(userId);

  if (limits.maxMemoryItems === 0) {
    return {
      allowed: false,
      error: "Memory feature not available on your plan. Upgrade to add memories.",
      feature: "longer-memory",
    };
  }

  const memoryCount = await prisma.memory.count({
    where: { userId },
  });

  const current = memoryCount;
  const limit = limits.maxMemoryItems;

  if (limit === -1) {
    return { allowed: true };
  }

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      error: `Memory limit reached (${limit}). Upgrade for more memories.`,
    };
  }

  return { allowed: true, current, limit };
}

/**
 * Check if user can create a branch for a chat
 */
export async function checkBranchLimit(userId: string, chatId: string): Promise<LimitCheckResult> {
  const limits = await getUserLimits(userId);

  if (limits.maxBranchesPerChat === 0) {
    return {
      allowed: false,
      error: "Chat branches not available on your plan. Upgrade to use branches.",
      feature: "chat-branches",
    };
  }

  const branchCount = await prisma.chat.count({
    where: { parentChatId: chatId },
  });

  const current = branchCount;
  const limit = limits.maxBranchesPerChat;

  if (limit === -1) {
    return { allowed: true };
  }

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      error: `Branch limit reached (${limit}) per chat.`,
    };
  }

  return { allowed: true, current, limit };
}

/**
 * Check if user can create a folder
 */
export async function checkFolderLimit(userId: string): Promise<LimitCheckResult> {
  const limits = await getUserLimits(userId);

  if (limits.maxFolders === 0) {
    return {
      allowed: false,
      error: "Folders not available on your plan. Upgrade to use folders.",
      feature: "chat-folders",
    };
  }

  return { allowed: true, limit: limits.maxFolders };
}

/**
 * Check if user can add attachments to a chat
 */
export async function checkAttachmentLimit(userId: string, chatId: string): Promise<LimitCheckResult> {
  const limits = await getUserLimits(userId);

  if (limits.maxAttachmentsPerChat === 0) {
    return {
      allowed: false,
      error: "Attachments not available on your plan. Upgrade to add files.",
      feature: "attachments",
    };
  }

  const attachmentCount = await prisma.chatFile.count({
    where: { chatId },
  });

  const current = attachmentCount;
  const limit = limits.maxAttachmentsPerChat;

  if (limit === -1) {
    return { allowed: true };
  }

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      error: `Attachment limit reached (${limit}) per chat.`,
    };
  }

  return { allowed: true, current, limit };
}

/**
 * Check if user can export chats
 */
export async function checkExportLimit(userId: string): Promise<LimitCheckResult> {
  const limits = await getUserLimits(userId);

  if (!limits.canExport) {
    return {
      allowed: false,
      error: "Export not available on your plan. Upgrade to export chats.",
      feature: "export-chats",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can use API
 */
export async function checkApiAccessLimit(userId: string): Promise<LimitCheckResult> {
  const limits = await getUserLimits(userId);

  if (!limits.canApiAccess) {
    return {
      allowed: false,
      error: "API access not available on your plan. Upgrade for API access.",
      feature: "api-access",
    };
  }

  return { allowed: true };
}

/**
 * Check file size limit
 */
export async function checkFileSizeLimit(userId: string, fileSizeMb: number): Promise<LimitCheckResult> {
  const limits = await getUserLimits(userId);

  if (limits.maxFileSizeMb === 0) {
    return {
      allowed: false,
      error: "File uploads not available on your plan.",
      feature: "attachments",
    };
  }

  if (fileSizeMb > limits.maxFileSizeMb) {
    return {
      allowed: false,
      limit: limits.maxFileSizeMb,
      error: `File too large. Max size: ${limits.maxFileSizeMb}MB.`,
    };
  }

  return { allowed: true, limit: limits.maxFileSizeMb };
}
