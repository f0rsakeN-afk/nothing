/**
 * Limit Service
 * Checks user limits based on their plan
 * Handles all edge cases for feature access
 */

import prisma from "@/lib/prisma";
import { getPlan } from "@/services/plan.service";

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
}

/**
 * Get user's current limits based on their plan
 */
export async function getUserLimits(userId: string): Promise<UserLimits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userPlan: true,
      subscription: {
        where: {
          status: { in: ["ACTIVE", "TRIALING"] },
        },
      },
    },
  });

  // Determine effective plan limits
  // If user has active subscription, use that plan
  // Otherwise, check if they have credits remaining with their last plan
  // Otherwise fall back to free tier

  let effectivePlan = user?.userPlan;

  if (!effectivePlan || user?.subscription === null) {
    // Check if user has credits from a paid plan they lost
    // If they have credits and had paid features, keep limits
    const hasCreditsRemaining = (user?.credits || 0) > 0;
    const hadPaidPlan = user?.planTier && user.planTier !== "FREE";

    if (!hasCreditsRemaining || !hadPaidPlan) {
      // Get free tier
      effectivePlan = await getPlan("free");
    }
    // If has credits but no active subscription, keep their plan until credits run out
  }

  const plan = effectivePlan || await getPlan("free");

  return {
    maxMemoryItems: plan.maxMemoryItems,
    maxBranchesPerChat: plan.maxBranchesPerChat,
    maxFolders: plan.maxFolders,
    maxAttachmentsPerChat: plan.maxAttachmentsPerChat,
    maxFileSizeMb: plan.maxFileSizeMb,
    canExport: plan.canExport,
    canApiAccess: plan.canApiAccess,
    hasFeature: (feature: string) => plan.features.includes(feature),
  };
}

/**
 * Check if user can create a new chat
 */
export async function checkChatLimit(userId: string): Promise<LimitCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { _count: { select: { chats: true } }, maxChats: true },
  });

  if (!user) {
    return { allowed: false, error: "User not found" };
  }

  const current = user._count.chats;
  const limit = user.maxChats;

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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { _count: { select: { projects: true } }, maxProjects: true },
  });

  if (!user) {
    return { allowed: false, error: "User not found" };
  }

  const current = user._count.projects;
  const limit = user.maxProjects;

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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { _count: { select: { memories: true } }, maxMemoryItems: true },
  });

  if (!user) {
    return { allowed: false, error: "User not found" };
  }

  // Check if user has feature
  if (user.maxMemoryItems === 0) {
    return {
      allowed: false,
      error: "Memory feature not available on your plan. Upgrade to add memories.",
      feature: "longer-memory",
    };
  }

  const current = user._count.memories;
  const limit = user.maxMemoryItems;

  if (limit === -1) {
    return { allowed: true }; // unlimited
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxBranchesPerChat: true },
  });

  if (!user) {
    return { allowed: false, error: "User not found" };
  }

  if (user.maxBranchesPerChat === 0) {
    return {
      allowed: false,
      error: "Chat branches not available on your plan. Upgrade to use branches.",
      feature: "chat-branches",
    };
  }

  const branchCount = await prisma.chat.count({
    where: { parentChatId: chatId },
  });

  const limit = user.maxBranchesPerChat;

  if (limit === -1) {
    return { allowed: true };
  }

  if (branchCount >= limit) {
    return {
      allowed: false,
      current: branchCount,
      limit,
      error: `Branch limit reached (${limit}) per chat.`,
    };
  }

  return { allowed: true, current: branchCount, limit };
}

/**
 * Check if user can create a folder
 */
export async function checkFolderLimit(userId: string): Promise<LimitCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxFolders: true },
  });

  if (!user) {
    return { allowed: false, error: "User not found" };
  }

  if (user.maxFolders === 0) {
    return {
      allowed: false,
      error: "Folders not available on your plan. Upgrade to use folders.",
      feature: "chat-folders",
    };
  }

  // Assuming you have a Folder model - placeholder for now
  // const folderCount = await prisma.folder.count({ where: { userId } });

  return { allowed: true };
}

/**
 * Check if user can add attachments to a chat
 */
export async function checkAttachmentLimit(userId: string, chatId: string): Promise<LimitCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxAttachmentsPerChat: true },
  });

  if (!user) {
    return { allowed: false, error: "User not found" };
  }

  if (user.maxAttachmentsPerChat === 0) {
    return {
      allowed: false,
      error: "Attachments not available on your plan. Upgrade to add files.",
      feature: "attachments",
    };
  }

  const attachmentCount = await prisma.chatFile.count({
    where: { chatId },
  });

  const limit = user.maxAttachmentsPerChat;

  if (limit === -1) {
    return { allowed: true };
  }

  if (attachmentCount >= limit) {
    return {
      allowed: false,
      current: attachmentCount,
      limit,
      error: `Attachment limit reached (${limit}) per chat.`,
    };
  }

  return { allowed: true, current: attachmentCount, limit };
}

/**
 * Check if user can export chats
 */
export async function checkExportLimit(userId: string): Promise<LimitCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { canExport: true },
  });

  if (!user) {
    return { allowed: false, error: "User not found" };
  }

  if (!user.canExport) {
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { canApiAccess: true },
  });

  if (!user) {
    return { allowed: false, error: "User not found" };
  }

  if (!user.canApiAccess) {
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxFileSizeMb: true },
  });

  if (!user) {
    return { allowed: false, error: "User not found" };
  }

  if (user.maxFileSizeMb === 0) {
    return {
      allowed: false,
      error: "File uploads not available on your plan.",
      feature: "attachments",
    };
  }

  if (fileSizeMb > user.maxFileSizeMb) {
    return {
      allowed: false,
      limit: user.maxFileSizeMb,
      error: `File too large. Max size: ${user.maxFileSizeMb}MB.`,
    };
  }

  return { allowed: true, limit: user.maxFileSizeMb };
}
