/**
 * Limit Constants
 * Warning thresholds, cache TTLs, and feature names
 */

import type { LimitFeature } from "./types";

// Warning threshold percentage (80% = show warning banner)
export const WARNING_THRESHOLD = 80;

// Cache TTLs in seconds
export const CACHE_TTL = {
  LIMITS: 300, // 5 minutes - user plan limits
  USAGE: 60, // 1 minute - usage stats (higher freshness needed)
} as const;

// Feature display names for error messages
export const FEATURE_NAMES: Record<LimitFeature, string> = {
  CHAT: "chats",
  PROJECT: "projects",
  MESSAGE: "messages",
  MEMORY: "memories",
  BRANCH: "branches",
  ATTACHMENT: "attachments",
  EXPORT: "export",
  API_ACCESS: "API access",
  FILE_SIZE: "file size",
};

// Upgrade path suggestions - which plan unlocks the feature
export const UPGRADE_MAP: Partial<Record<LimitFeature, string>> = {
  CHAT: "Pro",
  PROJECT: "Pro",
  MEMORY: "Pro",
  BRANCH: "Pro",
  ATTACHMENT: "Basic",
  EXPORT: "Pro",
  API_ACCESS: "Enterprise",
};

// Feature flag names (for hasFeature checks)
export const FEATURE_FLAGS = {
  CHAT_BRANCHES: "chat-branches",
  CHAT_FOLDERS: "chat-folders",
  EXPORT: "export",
  API_ACCESS: "api-access",
  ATTACHMENTS: "attachments",
} as const;

// Default limits for FREE tier (fallback)
export const FREE_TIER_DEFAULTS = {
  maxMemoryItems: 0,
  maxBranchesPerChat: 0,
  maxFolders: 0,
  maxAttachmentsPerChat: 0,
  maxFileSizeMb: 0,
  canExport: false,
  canApiAccess: false,
  features: [] as string[],
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
  isActive: true,
  isVisible: true,
} as const;