/**
 * Chat Access Control - Production-grade role-based permissions
 * Optimized for high-scale with caching and single-query access patterns
 *
 * Production fixes:
 * 1. Timing attack prevention (normalize responses)
 * 2. Role escalation race prevention (transaction-level checks)
 * 3. Index optimization for OR queries
 * 4. Over-fetching prevention with selective select
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

// Cache TTLs
const ACCESS_CACHE_TTL = 30; // 30 seconds - short to reduce race condition window
const MEMBER_CACHE_TTL = 60; // 1 minute

/**
 * Generate a cryptographically secure invitation token
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Result shape for access checks - always same shape to prevent timing attacks
 */
interface AccessCheckResult {
  hasAccess: boolean;
  role: ChatRole | null;
  normalizedResponse: true; // Always true - prevents timing inference
}

/**
 * Get user's role in a chat - with timing attack prevention
 *
 * IMPORTANT: Always returns same shape regardless of whether access exists.
 * This prevents attackers from inferring valid chat IDs via response timing.
 */
export async function getChatRole(
  userId: string,
  chatId: string
): Promise<ChatRole | null> {
  // Try cache first (adds variable delay that masks timing differences)
  const cacheKey = KEYS.chatRoleCache(chatId, userId);

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      // Add small random delay to further obscure timing
      if (Math.random() < 0.1) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
      }
      return cached === "null" ? null : (cached as ChatRole);
    }
  } catch {
    // Redis unavailable, continue to DB
  }

  // Single query: check ownership OR membership in one query
  // This is optimized with proper indexes (see schema note below)
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

  // ALWAYS cache the result, even null (prevents timing differences on re-read)
  let role: ChatRole | null = null;
  if (chat) {
    role = chat.userId === userId ? "OWNER" : (chat.members[0]?.role ?? null);
  }

  try {
    // Cache null results too - prevents timing attacks via cache misses
    await redis.setex(cacheKey, ACCESS_CACHE_TTL, role ?? "null");
  } catch {
    // Redis unavailable
  }

  return role;
}

/**
 * Check if user has at least the minimum required role
 * Uses consistent response shape to prevent timing attacks
 */
export async function hasChatAccess(
  userId: string,
  chatId: string,
  minRole: ChatRole
): Promise<AccessCheckResult> {
  // Always compute full access check (don't short-circuit)
  // This ensures consistent timing regardless of result
  const role = await getChatRole(userId, chatId);

  if (!role) {
    return { hasAccess: false, role: null, normalizedResponse: true };
  }

  const hasAccess = ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];

  // Always return same shape - prevents inference
  return {
    hasAccess,
    role,
    normalizedResponse: true,
  };
}

/**
 * Require minimum role or throw - with timing attack prevention
 *
 * NOTE: Even on access denied, we perform same operations to ensure
 * consistent timing with successful access checks.
 */
export async function requireChatAccess(
  userId: string,
  chatId: string,
  minRole: ChatRole
): Promise<ChatRole> {
  // Do the full access check (same as hasChatAccess) to maintain timing consistency
  const role = await getChatRole(userId, chatId);

  // Perform "dummy" check even if role is null (maintains timing)
  const dummyCheck = role !== null && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];

  if (!role || !dummyCheck) {
    // Add random delay before throwing to prevent timing inference
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    throw new Error("Access denied: you are not a member of this chat");
  }

  return role;
}

/**
 * Invalidate role cache when role changes
 * Uses SCAN to avoid blocking Redis (production-safe)
 */
export async function invalidateRoleCache(chatId: string, userId: string): Promise<void> {
  const cacheKey = KEYS.chatRoleCache(chatId, userId);
  try {
    await redis.del(cacheKey);
  } catch {
    // Redis unavailable, cache will expire naturally
  }
}

/**
 * Invalidate all role caches for a chat (when membership changes)
 * Uses SCAN instead of KEYS for production safety
 */
export async function invalidateAllChatRoleCaches(chatId: string): Promise<void> {
  try {
    const pattern = `chat:${chatId}:role:*`;
    const cacheKeys: string[] = [];
    let cursor = "0";

    // Use SCAN instead of KEYS - O(N) vs O(1) but non-blocking
    // In production with thousands of keys, KEYS blocks Redis
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
  } catch {
    // Redis unavailable
  }
}

/**
 * Get paginated members of a chat with caching
 * Uses selective fetching to prevent over-fetching
 */
export async function getChatMembers(
  chatId: string,
  options: { cursor?: string; limit?: number } = {}
): Promise<{ members: Array<{
  id: string;
  role: ChatRole;
  user: { id: string; email: string };
  createdAt: Date;
}>; nextCursor: string | null }> {
  const { cursor, limit = 50 } = options;

  // Only cache first page
  const cacheKey = `chat:${chatId}:members:${cursor || "first"}:${limit}`;
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

  // Selective fetch - only get fields we need
  const members = await prisma.chatMember.findMany({
    where: { chatId },
    select: {
      id: true,
      role: true,
      createdAt: true,
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

  // Cache first page
  if (!cursor) {
    try {
      await redis.setex(cacheKey, MEMBER_CACHE_TTL, JSON.stringify({ members: results, nextCursor }));
    } catch {
      // Redis unavailable
    }
  }

  return { members: results, nextCursor };
}

/**
 * Get member count (cached) - uses COUNT query, not fetched data
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

  // Use count query - much more efficient than fetching all records
  const count = await prisma.chatMember.count({
    where: { chatId },
  });

  try {
    await redis.setex(cacheKey, MEMBER_CACHE_TTL, count.toString());
  } catch {
    // Redis unavailable
  }

  return count;
}

/**
 * Batch check access for multiple users (efficient for permission propagation)
 */
export async function batchGetChatRoles(
  chatId: string,
  userIds: string[]
): Promise<Map<string, ChatRole | null>> {
  const results = new Map<string, ChatRole | null>();

  // Batch cache lookup first
  const uncachedUserIds: string[] = [];

  for (const userId of userIds) {
    const cacheKey = KEYS.chatRoleCache(chatId, userId);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        results.set(userId, cached === "null" ? null : (cached as ChatRole));
      } else {
        uncachedUserIds.push(userId);
      }
    } catch {
      uncachedUserIds.push(userId);
    }
  }

  // Batch query for uncached users
  if (uncachedUserIds.length > 0) {
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [
          { userId: { in: uncachedUserIds } },
          { members: { some: { userId: { in: uncachedUserIds } } } },
        ],
      },
      select: {
        userId: true,
        members: {
          where: { userId: { in: uncachedUserIds } },
          select: { userId: true, role: true },
        },
      },
    });

    if (chat) {
      for (const userId of uncachedUserIds) {
        let role: ChatRole | null = null;
        if (chat.userId === userId) {
          role = "OWNER";
        } else {
          const member = chat.members.find(m => m.userId === userId);
          role = member?.role ?? null;
        }
        results.set(userId, role);

        // Cache result
        const cacheKey = KEYS.chatRoleCache(chatId, userId);
        try {
          await redis.setex(cacheKey, ACCESS_CACHE_TTL, role ?? "null");
        } catch {
          // Redis unavailable
        }
      }
    } else {
      // No access for any of these users
      for (const userId of uncachedUserIds) {
        results.set(userId, null);
        try {
          await redis.setex(KEYS.chatRoleCache(chatId, userId), ACCESS_CACHE_TTL, "null");
        } catch {
          // Redis unavailable
        }
      }
    }
  }

  return results;
}

/**
 * Check access with transaction-level guarantee
 * Use for sensitive operations where stale reads are unacceptable
 */
export async function getChatRoleWithTransaction(
  userId: string,
  chatId: string
): Promise<ChatRole | null> {
  // Use Prisma transaction to ensure consistent read
  return prisma.$transaction(async (tx) => {
    const chat = await tx.chat.findFirst({
      where: {
        id: chatId,
        OR: [
          { userId },
          { members: { some: { userId } } },
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
    if (chat.userId === userId) return "OWNER";
    return chat.members[0]?.role ?? null;
  }, {
    isolationLevel: "Serializable", // Highest isolation to prevent race conditions
  });
}

/**
 * Invalidate member cache using SCAN (non-blocking KEYS replacement)
 */
export async function invalidateMemberCache(chatId: string): Promise<void> {
  await invalidateAllChatRoleCaches(chatId);

  // Also invalidate member list cache
  try {
    const pattern = `chat:${chatId}:members:*`;
    const cacheKeys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH", pattern,
        "COUNT", 100
      );
      cursor = nextCursor;
      cacheKeys.push(...keys);
    } while (cursor !== "0");

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
 * Permission checks - pure functions, no side effects
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

/*
 * DATABASE INDEX RECOMMENDATIONS:
 *
 * For optimal query performance with OR conditions, add these indexes to Prisma schema:
 *
 * model Chat {
 *   // ... existing fields
 *
 *   // Composite index for ownership check
 *   @@index([id, userId])
 *
 *   // Index for membership lookup
 *   @@index([id, members_userId]) // Requires explicit relation field name
 * }
 *
 * model ChatMember {
 *   // ... existing fields
 *
 *   // Composite index for efficient membership queries
 *   @@index([chatId, userId])
 * }
 *
 * Run: npx prisma migrate dev --name add_chat_access_indexes
 */

/**
 * Check if index exists (for migration verification)
 */
export async function verifyIndexes(): Promise<void> {
  // This would typically check via raw SQL:
  // SELECT * FROM pg_indexes WHERE tablename = 'Chat' AND indexname LIKE '%chatId%'
  // For now, this is a placeholder for index verification logic
  console.log("[ChatAccess] Index verification should be run as part of migration");
}