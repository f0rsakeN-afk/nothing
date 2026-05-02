/**
 * Settings Service
 * Caches user settings to avoid hitting DB on every request
 */

import prisma from "@/lib/prisma";
import redis, { KEYS, TTL } from "@/lib/redis";

export interface UserSettings {
  theme: string;
  language: string;
  autoTitle: boolean;
  enterToSend: boolean;
  showSuggestions: boolean;
  compactMode: boolean;
  reducedMotion: boolean;
  streaming: boolean;
  codeHighlight: boolean;
  persistentMemory: boolean;
  emailUpdates: boolean;
  emailMarketing: boolean;
  browserNotifs: boolean;
  usageAlerts: boolean;
  analytics: boolean;
  usageData: boolean;
  crashReports: boolean;
  hapticsEnabled: boolean;
  showChips: boolean;
  showTagline: boolean;
  showMemory: boolean;
  showFiles: boolean;
  showApps: boolean;
  showSearch: boolean;
  showNewChat: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  language: "en",
  autoTitle: true,
  enterToSend: false,
  showSuggestions: true,
  compactMode: false,
  reducedMotion: false,
  streaming: true,
  codeHighlight: true,
  persistentMemory: false,
  emailUpdates: true,
  emailMarketing: false,
  browserNotifs: false,
  usageAlerts: true,
  analytics: true,
  usageData: false,
  crashReports: true,
  hapticsEnabled: true,
  showChips: true,
  showTagline: true,
  showMemory: true,
  showFiles: true,
  showApps: true,
  showSearch: true,
  showNewChat: true,
};

/**
 * Get user settings with caching
 * Falls back to defaults if no settings record exists
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const cacheKey = KEYS.userSettings(userId);

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as UserSettings;
    }
  } catch {
    // Redis error, continue to DB
  }

  // Fetch from DB
  const settings = await prisma.settings.findUnique({
    where: { userId },
  });

  const userSettings: UserSettings = settings
    ? {
        theme: settings.theme,
        language: settings.language,
        autoTitle: settings.autoTitle,
        enterToSend: settings.enterToSend,
        showSuggestions: settings.showSuggestions,
        compactMode: settings.compactMode,
        reducedMotion: settings.reducedMotion,
        streaming: settings.streaming,
        codeHighlight: settings.codeHighlight,
        persistentMemory: settings.persistentMemory,
        emailUpdates: settings.emailUpdates,
        emailMarketing: settings.emailMarketing,
        browserNotifs: settings.browserNotifs,
        usageAlerts: settings.usageAlerts,
        analytics: settings.analytics,
        usageData: settings.usageData,
        crashReports: settings.crashReports,
        hapticsEnabled: settings.hapticsEnabled,
        showChips: settings.showChips,
        showTagline: settings.showTagline,
        showMemory: settings.showMemory,
        showFiles: settings.showFiles,
        showApps: settings.showApps,
        showSearch: settings.showSearch,
        showNewChat: settings.showNewChat,
      }
    : { ...DEFAULT_SETTINGS };

  // Cache the result
  try {
    await redis.setex(cacheKey, TTL.userSettings, JSON.stringify(userSettings));
  } catch {
    // Redis error, ignore
  }

  return userSettings;
}

/**
 * Invalidate user settings cache (call when user updates settings)
 */
export async function invalidateUserSettingsCache(userId: string): Promise<void> {
  try {
    await redis.del(KEYS.userSettings(userId));
  } catch {
    // Redis error, ignore
  }
}