/**
 * User Preferences Service
 * Caches user customize/preferences data to avoid hitting DB on every chat
 */

import prisma from "@/lib/prisma";
import redis, { KEYS, TTL } from "@/lib/redis";

export interface UserPreferences {
  tone: string;
  detailLevel: string;
  name: string;
  firstName: string;
  lastName: string;
  interests: string[];
  language: string;
  email?: string;
}

/**
 * Get user preferences (customize data) with caching
 * Falls back to defaults if no customize record exists
 */
export async function getUserPreferences(userId: string, email: string | null | undefined): Promise<UserPreferences> {
  const emailStr: string = typeof email === 'string' ? email : '';
  const cacheKey = KEYS.userPreferences(userId);

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as UserPreferences;
    }
  } catch {
    // Redis error, continue to DB
  }

  // Fetch from DB
  const customize = await prisma.customize.findUnique({
    where: { userId },
  });

  const preferences: UserPreferences = customize
    ? {
        tone: customize.responseTone || "balanced",
        detailLevel: customize.knowledgeDetail || "BALANCED",
        name: customize.name || "",
        firstName: customize.firstName || "",
        lastName: customize.lastName || "",
        interests: customize.interest || [],
        language: "en", // Default, could be from settings
        email: emailStr || undefined,
      }
    : {
        tone: "balanced",
        detailLevel: "BALANCED",
        name: emailStr?.split("@")[0] || "User",
        firstName: "",
        lastName: "",
        interests: [],
        language: "en",
        email: emailStr || undefined,
      };

  // Cache the result
  try {
    await redis.setex(cacheKey, TTL.userPreferences, JSON.stringify(preferences));
  } catch {
    // Redis error, ignore
  }

  return preferences;
}

/**
 * Invalidate user preferences cache (call when user updates customize)
 */
export async function invalidateUserPreferencesCache(userId: string): Promise<void> {
  try {
    await redis.del(KEYS.userPreferences(userId));
  } catch {
    // Redis error, ignore
  }
}

/**
 * Update user preferences and invalidate cache
 */
export async function updateUserPreferences(
  userId: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    name: string;
    responseTone: string;
    knowledgeDetail: string;
    interest: string[];
  }>
): Promise<void> {
  await prisma.customize.upsert({
    where: { userId },
    create: {
      userId,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      name: data.name || "",
      responseTone: data.responseTone || "balanced",
      knowledgeDetail: (data.knowledgeDetail as any) || "BALANCED",
      interest: data.interest || [],
    },
    update: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.responseTone !== undefined && { responseTone: data.responseTone }),
      ...(data.knowledgeDetail !== undefined && { knowledgeDetail: data.knowledgeDetail as any }),
      ...(data.interest !== undefined && { interest: data.interest }),
    },
  });

  // Invalidate cache so next request gets fresh data
  await invalidateUserPreferencesCache(userId);
}
