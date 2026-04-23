/**
 * Memory Service - Own memory system for user preferences and facts
 * Includes Redis caching to avoid hitting DB on every request
 */

import prisma from "@/lib/prisma";
import redis, { KEYS, TTL } from "@/lib/redis";

export interface MemoryItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  category: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySearchResult {
  memories: MemoryItem[];
  total: number;
}

interface MemoryCache {
  memories: MemoryItem[];
  total: number;
}

/**
 * Get cache key for memories
 */
function getMemoryCacheKey(userId: string, category?: string, query?: string): string {
  if (query) {
    return `user:${userId}:memories:search:${Buffer.from(`${query}:${category || "all"}`).toString("base64").slice(0, 32)}`;
  }
  if (category) {
    return `user:${userId}:memories:category:${category}`;
  }
  return KEYS.userMemories(userId);
}

/**
 * Add a new memory
 */
export async function addMemory(
  userId: string,
  data: {
    title: string;
    content: string;
    tags?: string[];
    category?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<MemoryItem> {
  const memory = await prisma.memory.create({
    data: {
      userId,
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      category: data.category,
      metadata: data.metadata as object || undefined,
    },
  });

  // Invalidate user's memories cache
  await invalidateUserMemoriesCache(userId);

  return memory as MemoryItem;
}

/**
 * Invalidate all memory caches for a user
 */
async function invalidateUserMemoriesCache(userId: string): Promise<void> {
  try {
    const pattern = `user:${userId}:memories*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis error, ignore
  }
}

/**
 * Search memories by query
 */
export async function searchMemories(
  userId: string,
  query: string,
  options: { limit?: number; category?: string } = {}
): Promise<MemorySearchResult> {
  const { limit = 20, category } = options;
  const cacheKey = getMemoryCacheKey(userId, category, query);

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as MemoryCache;
      return {
        memories: parsed.memories.slice(0, limit).map(m => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        })),
        total: parsed.total,
      };
    }
  } catch {
    // Redis error, continue to DB
  }

  const where: Record<string, unknown> = {
    userId,
  };

  if (query.trim()) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
      { tags: { hasSome: [query.toLowerCase()] } },
    ];
  }

  if (category) {
    where.category = category;
  }

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.memory.count({ where }),
  ]);

  const result: MemorySearchResult = { memories: memories as MemoryItem[], total };

  // Cache the result for this specific query/limit combo
  try {
    await redis.setex(cacheKey, TTL.userMemories, JSON.stringify({ memories, total }));
  } catch {
    // Redis error, ignore
  }

  return result;
}

/**
 * Get all memories for a user
 */
export async function getMemories(
  userId: string,
  options: { limit?: number; category?: string } = {}
): Promise<MemorySearchResult> {
  const { limit = 50, category } = options;
  const cacheKey = getMemoryCacheKey(userId, category);

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as MemoryCache;
      return {
        memories: parsed.memories.slice(0, limit).map(m => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        })),
        total: parsed.total,
      };
    }
  } catch {
    // Redis error, continue to DB
  }

  const where: Record<string, unknown> = {
    userId,
  };

  if (category) {
    where.category = category;
  }

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.memory.count({ where }),
  ]);

  const result: MemorySearchResult = { memories: memories as MemoryItem[], total };

  // Cache the result for this specific limit
  try {
    await redis.setex(cacheKey, TTL.userMemories, JSON.stringify({ memories, total }));
  } catch {
    // Redis error, ignore
  }

  return result;
}

/**
 * Get memory by ID
 */
export async function getMemoryById(memoryId: string, userId: string): Promise<MemoryItem | null> {
  const memory = await prisma.memory.findFirst({
    where: {
      id: memoryId,
      userId,
    },
  });

  return memory as MemoryItem | null;
}

/**
 * Update a memory
 */
export async function updateMemory(
  memoryId: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    tags?: string[];
    category?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<MemoryItem> {
  const memory = await prisma.memory.update({
    where: { id: memoryId },
    data: {
      title: data.title,
      content: data.content,
      tags: data.tags,
      category: data.category,
      metadata: data.metadata as object || undefined,
      updatedAt: new Date(),
    },
  });

  // Invalidate cache
  await invalidateUserMemoriesCache(userId);

  return memory as MemoryItem;
}

/**
 * Delete a memory
 */
export async function deleteMemory(memoryId: string, userId: string): Promise<boolean> {
  // Get the memory first to find the userId
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    select: { userId: true },
  });

  if (!memory) {
    return false;
  }

  await prisma.memory.delete({
    where: { id: memoryId },
  });

  // Invalidate cache
  await invalidateUserMemoriesCache(memory.userId);

  return true;
}

/**
 * Get memory categories for a user
 */
export async function getMemoryCategories(userId: string): Promise<string[]> {
  const categories = await prisma.memory.findMany({
    where: {
      userId,
      category: { not: null },
    },
    select: { category: true },
    distinct: ["category"],
  });

  return categories
    .map((c) => c.category)
    .filter((c): c is string => c !== null);
}

/**
 * Add memory from conversation context
 * Called when user shares information they want remembered
 */
export async function rememberFromConversation(
  userId: string,
  content: string,
  title?: string,
  category?: string
): Promise<MemoryItem> {
  // Auto-generate title from content if not provided
  const generatedTitle = title || content.slice(0, 100).trim() + (content.length > 100 ? "..." : "");

  // Extract potential tags from content
  const words = content.split(/\s+/).filter((w) => w.length > 3 && w.length < 20);
  const potentialTags = words.slice(0, 5).map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""));

  return addMemory(userId, {
    title: generatedTitle,
    content,
    tags: potentialTags,
    category,
  });
}
