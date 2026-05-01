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

export class AccountDeactivatedError extends Error {
  constructor() {
    super("ACCOUNT_DEACTIVATED");
    this.name = "AccountDeactivatedError";
  }
}

/**
 * Fast path: extract user from middleware-set headers
 */
function extractFromHeaders(request: Request): AuthenticatedUser | null {
  const userId = request.headers.get("x-user-id");
  const email = request.headers.get("x-user-email");
  const stackId = request.headers.get("x-user-stack-id");

  if (userId && email && stackId) {
    return { id: userId, email, stackId };
  }
  return null;
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
  let user = await prisma.user.findUnique({
    where: { stackId: stackUser.id },
  });

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          stackId: stackUser.id,
          email,
          role: "USER",
        },
      });
    } catch (err) {
      // Handle race condition where another request created the user
      if ((err as { code?: string }).code === "P2002") {
        user = await prisma.user.findUnique({
          where: { stackId: stackUser.id },
        });
      } else {
        throw err;
      }
    }
  }

  // This should never happen if code is correct, but TypeScript doesn't know that
  if (!user) {
    throw new Error("User not found after upsert");
  }

  // Check if account is deactivated
  if (!user.isActive) {
    throw new AccountDeactivatedError();
  }

  // Update cache
  try {
    const cacheKey = KEYS.userCache(stackUser.id);
    await redis.setex(cacheKey, TTL.userCache, JSON.stringify({
      id: user!.id,
      email: user!.email,
    }));
  } catch {
    // Cache failed - not critical
  }

  return {
    id: user!.id,
    email: user!.email,
    stackId: stackUser.id,
  };
}

/**
 * Simple auth validation without DB operations
 * Returns null if not authenticated
 */
export async function validateAuth(request: Request): Promise<AuthenticatedUser | null> {
  // Fast path: check middleware-set headers first
  const fromHeaders = extractFromHeaders(request);
  if (fromHeaders) {
    return fromHeaders;
  }

  // Fallback: authenticate via Stack (original behavior)
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
      select: { id: true, email: true, isActive: true },
    });

    if (!user) {
      return null;
    }

    // Check if account is deactivated
    if (!user.isActive) {
      throw new AccountDeactivatedError();
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
  } catch (error) {
    console.error("validateAuth error:", error);
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

/**
 * Check if user has admin or moderator role
 * Use after validateAuth() or getOrCreateUser()
 */
export async function isAdminOrModerator(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN" || user?.role === "MODERATOR";
}

/**
 * Check if user has admin role
 * Use after validateAuth() or getOrCreateUser()
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}
