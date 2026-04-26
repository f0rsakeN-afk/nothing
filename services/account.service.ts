/**
 * Account Service
 * Caches user account data to avoid hitting DB on every request
 * Account data = profile + plan + usage + subscription (all in one)
 *
 * Cache TTL: 5 minutes (same as userCredits)
 * Invalidation: On any account, subscription, credits, or plan change
 */

import prisma from "@/lib/prisma";
import redis, { KEYS, TTL } from "@/lib/redis";
import { getPlan } from "@/services/plan.service";

export interface AccountData {
  profile: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    isActive: boolean;
  };
  plan: {
    name: string;
    displayName: string;
    credits: number;
    totalCredits: number;
    limits: {
      chats: string | number;
      projects: string | number;
      messages: string | number;
    };
    features: string[];
    limitsDetail: {
      maxMemoryItems: number;
      maxBranchesPerChat: number;
      maxFolders: number;
      maxAttachmentsPerChat: number;
      maxFileSizeMb: number;
      canExport: boolean;
      canApiAccess: boolean;
    };
  };
  subscription: {
    active: boolean;
    status?: string;
    periodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
  usage: {
    chats: number;
    projects: number;
    messages: number;
    files: number;
  };
  monthlyUsage: {
    chats: number;
    messages: number;
  };
}

/**
 * Get account data with caching
 * Falls back to DB query if cache miss
 */
export async function getAccountData(userId: string): Promise<AccountData> {
  const cacheKey = KEYS.userAccount(userId);

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as AccountData;
    }
  } catch {
    // Redis error, continue to DB
  }

  // Fetch user with minimal data needed (no full arrays)
  const [fullUser, planData] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPlan: true,
        subscription: true,
        customize: true,
      },
    }),
    // Fallback plan loaded in parallel
    getPlan("free"),
  ]);

  if (!fullUser) {
    throw new Error(`User not found: ${userId}`);
  }

  // planData can be null if free plan doesn't exist in DB
  const planFallback = planData || {
    id: "free",
    tier: "FREE",
    name: "Free",
    description: "",
    price: 0,
    polarPriceId: null,
    polarProductId: null,
    credits: 25,
    maxChats: 100,
    maxProjects: 2,
    maxMessages: 100,
    maxMemoryItems: 0,
    maxBranchesPerChat: 0,
    maxFolders: 0,
    maxAttachmentsPerChat: 0,
    maxFileSizeMb: 5,
    canExport: false,
    canApiAccess: false,
    features: [],
    isActive: true,
    isVisible: true,
  };

  // Calculate start of month once
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Run ALL count queries in parallel - no sequential queries
  const [
    chatCount,
    projectCount,
    projectFileCount,
    chatFileCount,
    messageFileCount,
    messageCountResult,
    monthlyChatCount,
    monthlyMessageCount,
  ] = await Promise.all([
    // Active chats count (not full array)
    prisma.chat.count({ where: { userId, archivedAt: null } }),
    // Active projects count (not full array)
    prisma.project.count({ where: { userId, archivedAt: null } }),
    // File counts
    prisma.projectFile.count({ where: { project: { userId } } }),
    prisma.chatFile.count({ where: { chat: { userId } } }),
    prisma.messageFile.count({ where: { message: { chat: { userId } } } }),
    // Total messages
    prisma.message.count({ where: { chat: { userId } } }),
    // Monthly counts
    prisma.chat.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
    prisma.message.count({ where: { chat: { userId }, createdAt: { gte: startOfMonth } } }),
  ]);

  const fileCount = projectFileCount + chatFileCount + messageFileCount;
  const effectivePlanData = fullUser.userPlan || planFallback;
  const subscription = fullUser.subscription;

  // Get name from customize or fallback to email
  const displayName = fullUser.customize?.name || fullUser.email?.split("@")[0] || "User";

  const accountData: AccountData = {
    profile: {
      id: fullUser.id,
      email: fullUser.email,
      name: displayName,
      createdAt: fullUser.createdAt,
      isActive: fullUser.isActive,
    },
    plan: {
      name: effectivePlanData.id,
      displayName: effectivePlanData.name,
      credits: fullUser.credits,
      totalCredits: effectivePlanData.credits,
      limits: {
        chats: effectivePlanData.maxChats === -1 ? "unlimited" : effectivePlanData.maxChats,
        projects: effectivePlanData.maxProjects === -1 ? "unlimited" : effectivePlanData.maxProjects,
        messages: effectivePlanData.maxMessages === -1 ? "unlimited" : effectivePlanData.maxMessages,
      },
      features: effectivePlanData.features,
      limitsDetail: {
        maxMemoryItems: effectivePlanData.maxMemoryItems,
        maxBranchesPerChat: effectivePlanData.maxBranchesPerChat,
        maxFolders: effectivePlanData.maxFolders,
        maxAttachmentsPerChat: effectivePlanData.maxAttachmentsPerChat,
        maxFileSizeMb: effectivePlanData.maxFileSizeMb,
        canExport: effectivePlanData.canExport,
        canApiAccess: effectivePlanData.canApiAccess,
      },
    },
    subscription: subscription
      ? {
          active: true,
          status: subscription.status,
          periodEnd: subscription.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : { active: false },
    usage: {
      chats: chatCount,
      projects: projectCount,
      messages: messageCountResult,
      files: fileCount,
    },
    monthlyUsage: {
      chats: monthlyChatCount,
      messages: monthlyMessageCount,
    },
  };

  // Cache the result
  try {
    await redis.setex(cacheKey, TTL.userAccount, JSON.stringify(accountData));
  } catch {
    // Redis error, ignore
  }

  return accountData;
}

/**
 * Invalidate user account cache
 * Call when: account updated, subscription changed, credits changed, plan changed
 */
export async function invalidateAccountCache(userId: string): Promise<void> {
  try {
    await redis.del(KEYS.userAccount(userId));
  } catch {
    // Redis error, ignore
  }
}

/**
 * Invalidate ALL user caches (call on major account changes)
 * This invalidates: account, credits, limits, subscription, preferences, settings
 */
export async function invalidateAllUserCaches(userId: string): Promise<void> {
  const keys = [
    KEYS.userAccount(userId),
    KEYS.userCredits(userId),
    KEYS.userLimits(userId),
    KEYS.userSubscription(userId),
    KEYS.userPreferences(userId),
    KEYS.userSettings(userId),
  ];

  try {
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis error, ignore
  }
}