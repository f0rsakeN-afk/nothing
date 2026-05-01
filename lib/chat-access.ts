/**
 * Chat Access Control - Production-grade role-based permissions
 * Optimized for high-scale with caching and single-query access patterns
 */

import prisma from "./prisma";
import redis, { KEYS, TTL } from "./redis";
import { ChatRole } from "@/src/generated/prisma/client";
import crypto from "crypto";

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<ChatRole, number> = {
  OWNER: 3,
  EDITOR: 2,
  VIEWER: 1,
};

/**
 * Generate a cryptographically secure invitation token
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Get user's role in a chat - optimized single query
 * Uses cache-aside pattern with Redis
 */
export async function getChatRole(
  userId: string,
  chatId: string
): Promise<ChatRole | null> {
  const cacheKey = KEYS.chatRoleCache(chatId, userId);

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return cached as ChatRole;
    }
  } catch {
    // Redis unavailable, continue to DB
  }

  // Single query: check ownership OR membership in one query
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      OR: [
        { userId }, // Direct owner
        { members: { some: { userId } } }, // Member
      ],
    },
    select: {
      userId: true,
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!chat) return null;

  // If owner (chat.userId matches the userId from the first query)
  const isOwner = chat.userId === userId;

  if (isOwner) {
    try {
      await redis.setex(cacheKey, TTL.chatRole, "OWNER");
    } catch {
      // Redis unavailable
    }
    return "OWNER";
  }

  const member = chat.members[0];
  if (!member) return null;

  try {
    await redis.setex(cacheKey, TTL.chatRole, member.role);
  } catch {
    // Redis unavailable
  }

  return member.role;
}

/**
 * Check if user has at least the minimum required role
 */
export async function hasChatAccess(
  userId: string,
  chatId: string,
  minRole: ChatRole
): Promise<boolean> {
  const role = await getChatRole(userId, chatId);
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Require minimum role or throw
 */
export async function requireChatAccess(
  userId: string,
  chatId: string,
  minRole: ChatRole
): Promise<ChatRole> {
  const role = await getChatRole(userId, chatId);
  if (!role) {
    throw new Error("Access denied: you are not a member of this chat");
  }
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
    throw new Error(
      `Access denied: requires ${minRole} role, you have ${role}`
    );
  }
  return role;
}

/**
 * Invalidate role cache when role changes
 */
export async function invalidateRoleCache(chatId: string, userId: string): Promise<void> {
  const cacheKey = `chat:${chatId}:role:${userId}`;
  try {
    await redis.del(cacheKey);
  } catch {
    // Redis unavailable, cache will expire naturally
  }
}

/**
 * Get paginated members of a chat with caching
 */
export async function getChatMembers(
  chatId: string,
  options: { cursor?: string; limit?: number } = {}
): Promise<{ members: Awaited<ReturnType<typeof prisma.chatMember.findMany>>; nextCursor: string | null }> {
  const { cursor, limit = 50 } = options;
  const cacheKey = `chat:${chatId}:members:${cursor || "first"}:${limit}`;

  // Don't use cache for paginated queries (cache first page only)
  if (!cursor) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Redis unavailable
    }
  }

  const members = await prisma.chatMember.findMany({
    where: { chatId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit + 1, // Fetch one extra to determine pagination
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = members.length > limit;
  const results = hasMore ? members.slice(0, -1) : members;
  const nextCursor = hasMore ? results[results.length - 1]?.id : null;

  // Cache first page only
  if (!cursor) {
    try {
      await redis.setex(cacheKey, TTL.chatMembers, JSON.stringify({ members: results, nextCursor }));
    } catch {
      // Redis unavailable
    }
  }

  return { members: results, nextCursor };
}

/**
 * Get member count (cached)
 */
export async function getMemberCount(chatId: string): Promise<number> {
  const cacheKey = `chat:${chatId}:memberCount`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return parseInt(cached, 10);
    }
  } catch {
    // Redis unavailable
  }

  const count = await prisma.chatMember.count({
    where: { chatId },
  });

  try {
    await redis.setex(cacheKey, TTL.chatMembers, count.toString());
  } catch {
    // Redis unavailable
  }

  return count;
}

/**
 * Invalidate member cache using SCAN (non-blocking KEYS replacement)
 */
export async function invalidateMemberCache(chatId: string): Promise<void> {
  try {
    const pattern = `chat:${chatId}:members:*`;
    const cacheKeys: string[] = [];
    let cursor = "0";

    // Use SCAN instead of KEYS to avoid blocking Redis
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH", pattern,
        "COUNT", 100
      );
      cursor = nextCursor;
      cacheKeys.push(...keys);
    } while (cursor !== "0");

    // Delete in batches to avoid argument limit issues
    const BATCH_SIZE = 100;
    for (let i = 0; i < cacheKeys.length; i += BATCH_SIZE) {
      const batch = cacheKeys.slice(i, i + BATCH_SIZE);
      if (batch.length > 0) {
        await redis.del(...batch);
      }
    }

    await redis.del(`chat:${chatId}:memberCount`);
  } catch {
    // Redis unavailable, cache will expire naturally
  }
}

/**
 * Permission checks
 */
export const PERMISSIONS = {
  canRead: () => true,
  canSendMessage: (role: ChatRole) => role !== "VIEWER",
  canEditTitle: (role: ChatRole) => role !== "VIEWER",
  canDeleteChat: (role: ChatRole) => role === "OWNER",
  canManageMembers: (role: ChatRole) => role === "OWNER",
  canInvite: (role: ChatRole) => role !== "VIEWER",
  canChangeRoles: (role: ChatRole) => role === "OWNER",
  canRemoveMembers: (role: ChatRole) => role === "OWNER",
  canEditChat: (role: ChatRole) => role === "OWNER" || role === "EDITOR",
} as const;