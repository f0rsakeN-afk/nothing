/**
 * Limits Service
 * Core limit checking logic - single source of truth for plan enforcement
 *
 * Security principles:
 * 1. Always authenticate before checking limits
 * 2. Never trust client for counts - always recount server-side
 * 3. Admins bypass limits for support
 * 4. Cache aggressively, invalidate on changes
 */

import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import {
  getCachedUserLimits,
  getCachedUsageStats,
  incrementMessageCount,
  invalidateLimitsCache,
} from "./cache";
import { WARNING_THRESHOLD, UPGRADE_MAP, FEATURE_NAMES, FEATURE_FLAGS } from "./constants";
import type { LimitFeature, LimitCheckResult, CheckOptions } from "./types";

// Re-export types for external use
export type { LimitCheckResult, LimitFeature, CheckOptions } from "./types";

// ---------------------------------------------------------------------------
// Main Check Function
// ---------------------------------------------------------------------------

/**
 * Check if user can perform an action based on their plan limits
 *
 * @param userId - User ID to check
 * @param feature - Which feature to check
 * @param options - Additional context (chatId for branch/attachment checks, fileSizeMb for file size)
 * @returns LimitCheckResult with allowed status and UI metadata
 */
export async function checkLimit(
  userId: string,
  feature: LimitFeature,
  options?: CheckOptions
): Promise<LimitCheckResult> {
  // Admin bypass
  const adminBypass = await isAdmin(userId);
  if (adminBypass) {
    return createUnlimitedResult(feature);
  }

  // Get user's plan limits
  const { plan } = await getCachedUserLimits(userId);
  if (!plan) {
    return createFreeTierResult(feature);
  }

  // Dispatch to specific feature checker
  switch (feature) {
    case "CHAT":
      return checkChatLimit(userId, plan);
    case "PROJECT":
      return checkProjectLimit(userId, plan);
    case "MESSAGE":
      return checkMessageLimit(userId, plan);
    case "MEMORY":
      return checkMemoryLimit(userId, plan);
    case "BRANCH":
      return checkBranchLimit(userId, plan, options?.chatId);
    case "ATTACHMENT":
      return checkAttachmentLimit(userId, plan, options?.chatId);
    case "EXPORT":
      return plan.canExport
        ? createUnlimitedResult("EXPORT")
        : createDisabledResult("EXPORT", "Export not available on your plan. Upgrade to export chats.");
    case "API_ACCESS":
      return plan.canApiAccess
        ? createUnlimitedResult("API_ACCESS")
        : createDisabledResult("API_ACCESS", "API access not available on your plan. Upgrade for API access.");
    case "FILE_SIZE":
      return checkFileSizeLimit(plan, options?.fileSizeMb);
    default:
      return createFreeTierResult(feature);
  }
}

// ---------------------------------------------------------------------------
// Feature-Specific Limit Checks
// ---------------------------------------------------------------------------

async function checkChatLimit(
  userId: string,
  plan: { maxChats: number; name: string; tier: string }
): Promise<LimitCheckResult> {
  const current = await prisma.chat.count({
    where: { userId, archivedAt: null },
  });

  return buildLimitResult("CHAT", current, plan.maxChats, plan.name, plan.tier);
}

async function checkProjectLimit(
  userId: string,
  plan: { maxProjects: number; name: string; tier: string }
): Promise<LimitCheckResult> {
  const current = await prisma.project.count({
    where: { userId, archivedAt: null },
  });

  return buildLimitResult("PROJECT", current, plan.maxProjects, plan.name, plan.tier);
}

async function checkMessageLimit(
  userId: string,
  plan: { maxMessages: number; name: string; tier: string }
): Promise<LimitCheckResult> {
  const usage = await getCachedUsageStats(userId);
  const current = usage.usedMessages;

  // Calculate reset date (end of current month)
  const now = new Date();
  const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return buildLimitResult("MESSAGE", current, plan.maxMessages, plan.name, plan.tier, resetAt);
}

async function checkMemoryLimit(
  userId: string,
  plan: { maxMemoryItems: number; name: string; tier: string; features: string[] }
): Promise<LimitCheckResult> {
  // Check feature flag first
  if (!plan.features.includes(FEATURE_FLAGS.ATTACHMENTS)) {
    // Memory items need attachments feature
    if (plan.maxMemoryItems === 0) {
      return createDisabledResult("MEMORY", "Memory feature not available on your plan. Upgrade to add memories.");
    }
  }

  if (plan.maxMemoryItems === 0) {
    return createDisabledResult("MEMORY", "Memory feature not available on your plan. Upgrade to add memories.");
  }

  const current = await prisma.memory.count({
    where: { userId },
  });

  return buildLimitResult("MEMORY", current, plan.maxMemoryItems, plan.name, plan.tier);
}

async function checkBranchLimit(
  userId: string,
  plan: { maxBranchesPerChat: number; name: string; tier: string; features: string[] },
  chatId?: string
): Promise<LimitCheckResult> {
  if (!plan.features.includes(FEATURE_FLAGS.CHAT_BRANCHES)) {
    return createDisabledResult("BRANCH", "Chat branches not available on your plan. Upgrade to use branches.");
  }

  if (plan.maxBranchesPerChat === 0) {
    return createDisabledResult("BRANCH", "Chat branches not available on your plan. Upgrade to use branches.");
  }

  if (!chatId) {
    return createDisabledResult("BRANCH", "Chat ID required to check branch limit.");
  }

  const current = await prisma.chat.count({
    where: { parentChatId: chatId },
  });

  return buildLimitResult("BRANCH", current, plan.maxBranchesPerChat, plan.name, plan.tier);
}

async function checkAttachmentLimit(
  userId: string,
  plan: { maxAttachmentsPerChat: number; name: string; tier: string; features: string[] },
  chatId?: string
): Promise<LimitCheckResult> {
  if (!plan.features.includes(FEATURE_FLAGS.ATTACHMENTS)) {
    return createDisabledResult("ATTACHMENT", "Attachments not available on your plan. Upgrade to add files.");
  }

  if (plan.maxAttachmentsPerChat === 0) {
    return createDisabledResult("ATTACHMENT", "Attachments not available on your plan. Upgrade to add files.");
  }

  if (!chatId) {
    return createDisabledResult("ATTACHMENT", "Chat ID required to check attachment limit.");
  }

  const current = await prisma.chatFile.count({
    where: { chatId },
  });

  return buildLimitResult("ATTACHMENT", current, plan.maxAttachmentsPerChat, plan.name, plan.tier);
}

function checkFileSizeLimit(
  plan: { maxFileSizeMb: number },
  fileSizeMb?: number
): LimitCheckResult {
  if (fileSizeMb === undefined) {
    return createUnlimitedResult("FILE_SIZE");
  }

  if (fileSizeMb > plan.maxFileSizeMb) {
    return {
      allowed: false,
      current: fileSizeMb,
      limit: plan.maxFileSizeMb,
      percentage: 100,
      remaining: 0,
      warningThreshold: WARNING_THRESHOLD,
      isWarning: false,
      upgradeRequired: true,
      feature: "FILE_SIZE",
      error: `File too large. Max size: ${plan.maxFileSizeMb}MB.`,
    };
  }

  return {
    allowed: true,
    current: fileSizeMb,
    limit: plan.maxFileSizeMb,
    percentage: (fileSizeMb / plan.maxFileSizeMb) * 100,
    remaining: plan.maxFileSizeMb - fileSizeMb,
    warningThreshold: WARNING_THRESHOLD,
    isWarning: fileSizeMb >= plan.maxFileSizeMb * (WARNING_THRESHOLD / 100),
    upgradeRequired: false,
    feature: "FILE_SIZE",
  };
}

// ---------------------------------------------------------------------------
// Result Builders
// ---------------------------------------------------------------------------

function buildLimitResult(
  feature: LimitFeature,
  current: number,
  limit: number,
  planName: string,
  planTier: string,
  resetAt?: Date
): LimitCheckResult {
  // Unlimited = -1
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit: -1,
      percentage: 0,
      remaining: -1,
      warningThreshold: WARNING_THRESHOLD,
      isWarning: false,
      upgradeRequired: false,
      feature,
    };
  }

  const remaining = Math.max(0, limit - current);
  const percentage = limit > 0 ? (current / limit) * 100 : 0;
  const isWarning = percentage >= WARNING_THRESHOLD;
  const upgradeRequired = percentage >= 100;

  const error = upgradeRequired
    ? `${FEATURE_NAMES[feature]} limit reached (${limit}). Upgrade for more.`
    : undefined;

  return {
    allowed: !upgradeRequired,
    current,
    limit,
    percentage: Math.min(100, percentage),
    remaining,
    warningThreshold: WARNING_THRESHOLD,
    isWarning: isWarning && !upgradeRequired, // Warning before hitting limit, not after
    upgradeRequired,
    resetAt,
    feature,
    upgradeTo: upgradeRequired ? UPGRADE_MAP[feature] : undefined,
    error,
  };
}

function createUnlimitedResult(feature: LimitFeature): LimitCheckResult {
  return {
    allowed: true,
    current: 0,
    limit: -1,
    percentage: 0,
    remaining: -1,
    warningThreshold: WARNING_THRESHOLD,
    isWarning: false,
    upgradeRequired: false,
    feature,
  };
}

function createDisabledResult(feature: LimitFeature, error: string): LimitCheckResult {
  return {
    allowed: false,
    current: 0,
    limit: 0,
    percentage: 100,
    remaining: 0,
    warningThreshold: WARNING_THRESHOLD,
    isWarning: false,
    upgradeRequired: true,
    feature,
    error,
  };
}

function createFreeTierResult(feature: LimitFeature): LimitCheckResult {
  // Default FREE tier limits
  const defaults: Record<LimitFeature, { limit: number; error: string }> = {
    CHAT: { limit: 100, error: "Chat limit reached. Upgrade for unlimited." },
    PROJECT: { limit: 2, error: "Project limit reached. Upgrade for unlimited." },
    MESSAGE: { limit: 100, error: "Message limit reached. Upgrade for unlimited." },
    MEMORY: { limit: 0, error: "Memory feature not available." },
    BRANCH: { limit: 0, error: "Branches not available on your plan." },
    ATTACHMENT: { limit: 0, error: "Attachments not available on your plan." },
    EXPORT: { limit: 0, error: "Export not available on your plan." },
    API_ACCESS: { limit: 0, error: "API access not available on your plan." },
    FILE_SIZE: { limit: 0, error: "File uploads not available on your plan." },
  };

  const { limit, error } = defaults[feature];
  return createDisabledResult(feature, error);
}

// ---------------------------------------------------------------------------
// Usage Tracking
// ---------------------------------------------------------------------------

/**
 * Increment message count for a user
 * Called when a message is sent
 */
export async function trackMessageSent(userId: string): Promise<number> {
  return await incrementMessageCount(userId);
}

// ---------------------------------------------------------------------------
// Cache Invalidation
// ---------------------------------------------------------------------------

/**
 * Invalidate cache when plan changes
 */
export async function invalidateCache(userId: string): Promise<void> {
  await invalidateLimitsCache(userId);
}

// ---------------------------------------------------------------------------
// Convenience Functions
// ---------------------------------------------------------------------------

/**
 * Quick check if user can create a chat
 */
export async function canCreateChat(userId: string): Promise<LimitCheckResult> {
  return await checkLimit(userId, "CHAT");
}

/**
 * Quick check if user can create a project
 */
export async function canCreateProject(userId: string): Promise<LimitCheckResult> {
  return await checkLimit(userId, "PROJECT");
}

/**
 * Quick check if user can send a message (track it)
 */
export async function canSendMessage(userId: string): Promise<LimitCheckResult> {
  return await checkLimit(userId, "MESSAGE");
}

/**
 * Quick check if user can add memory
 */
export async function canAddMemory(userId: string): Promise<LimitCheckResult> {
  return await checkLimit(userId, "MEMORY");
}

/**
 * Quick check if user can export
 */
export async function canExport(userId: string): Promise<LimitCheckResult> {
  return await checkLimit(userId, "EXPORT");
}

/**
 * Quick check if user can use API
 */
export async function canUseApi(userId: string): Promise<LimitCheckResult> {
  return await checkLimit(userId, "API_ACCESS");
}