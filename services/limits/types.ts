/**
 * Limit Feature Types
 * All features that can be checked for plan limits
 */

export type LimitFeature =
  | "CHAT"
  | "PROJECT"
  | "MESSAGE"
  | "MEMORY"
  | "BRANCH"
  | "ATTACHMENT"
  | "EXPORT"
  | "API_ACCESS"
  | "FILE_SIZE";

/**
 * Result of a limit check
 * Contains everything UI needs for display and enforcement
 */
export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  percentage: number;
  remaining: number;
  warningThreshold: number;
  isWarning: boolean;
  upgradeRequired: boolean;
  resetAt?: Date;
  feature: LimitFeature;
  upgradeTo?: string;
  error?: string;
}

/**
 * User's effective limits from their plan
 */
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
 * Cached user limits from Redis
 */
export interface CachedUserLimits {
  plan: PlanData | null;
  isActiveSubscription: boolean;
  expiresAt: number;
}

/**
 * Plan data from database
 */
export interface PlanData {
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
}

/**
 * Usage stats for a user (monthly)
 */
export interface UserUsage {
  userId: string;
  usedMessages: number;
  month: number;
  year: number;
}

/**
 * Check options for features that need additional context
 */
export interface CheckOptions {
  chatId?: string;
  fileSizeMb?: number;
}