/**
 * Auth Module - Enterprise Pattern
 * API routes use validateAuth or getOrCreateUser
 */

import { stackServerApp } from "@/src/stack/server";
import prisma from "./prisma";
import redis, { KEYS, TTL } from "./redis";

export interface AuthenticatedUser {
  id: string;
  email: string;
  stackId: string;
}

/**
 * Validate auth via Stack Auth and get/create user
 * Use this in API routes - handles full auth flow
 */
export async function getOrCreateUser(request: Request): Promise<AuthenticatedUser> {
  const stackUser = await stackServerApp.getUser({ tokenStore: request });

  if (!stackUser) {
    throw new Error("Unauthorized");
  }

  const email = stackUser.primaryEmail || `${stackUser.id}@placeholder.local`;

  // Find or create user - this handles OAuth callback case
  // Note: email is NOT updated on existing users to avoid unique constraint violations
  // since multiple OAuth providers may have different emails for the same user
  const user = await prisma.user.upsert({
    where: { stackId: stackUser.id },
    update: {},
    create: {
      stackId: stackUser.id,
      email,
      role: "USER",
    },
  });

  // Update cache
  try {
    const cacheKey = KEYS.userCache(stackUser.id);
    await redis.setex(cacheKey, TTL.userCache, JSON.stringify({
      id: user.id,
      email: user.email,
    }));
  } catch {
    // Cache failed - not critical
  }

  return {
    id: user.id,
    email: user.email,
    stackId: stackUser.id,
  };
}

/**
 * Simple auth validation without DB operations
 * Returns null if not authenticated
 */
export async function validateAuth(request: Request): Promise<AuthenticatedUser | null> {
  try {
    const stackUser = await stackServerApp.getUser({ tokenStore: request });

    if (!stackUser) {
      return null;
    }

    // Check cache first
    const cacheKey = KEYS.userCache(stackUser.id);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const userData = JSON.parse(cached);
        return {
          id: userData.id,
          email: userData.email,
          stackId: stackUser.id,
        };
      }
    } catch {
      // Cache miss - continue
    }

    // Look up in DB
    const user = await prisma.user.findUnique({
      where: { stackId: stackUser.id },
      select: { id: true, email: true },
    });

    if (!user) {
      return null;
    }

    // Cache for future
    try {
      await redis.setex(cacheKey, TTL.userCache, JSON.stringify({
        id: user.id,
        email: user.email,
      }));
    } catch {
      // Cache failed
    }

    return {
      id: user.id,
      email: user.email,
      stackId: stackUser.id,
    };
  } catch {
    return null;
  }
}

/**
 * Get user from request headers (set by middleware - deprecated)
 * Use getOrCreateUser or validateAuth instead
 */
export async function getUserFromHeaders(request: Request): Promise<AuthenticatedUser | null> {
  return validateAuth(request);
}
