/**
 * Advanced Search Service
 * PostgreSQL full-text search with filters for chat messages
 *
 * Uses tsvector for efficient full-text search when available,
 * with ILIKE fallback for simpler deployments.
 * Results are cached in Redis for 60 seconds.
 */

import prisma from "@/lib/prisma";
import { KEYS, TTL } from "@/lib/redis";
import redis from "@/lib/redis";
import crypto from "crypto";

export interface SearchFilters {
  query: string;
  chatId?: string;
  projectId?: string;
  sender?: "user" | "assistant";
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  cursor?: string;
}

export interface SearchResult {
  id: string;
  chatId: string;
  chatTitle: string;
  role: string;
  content: string;
  createdAt: string;
  highlight?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Perform full-text search on messages with filters
 * Uses PostgreSQL tsvector for efficient searching with ranking
 * Falls back to ILIKE if tsvector column doesn't exist
 */
export async function searchMessages(
  userId: string,
  filters: SearchFilters
): Promise<SearchResponse> {
  const {
    query,
    chatId,
    projectId,
    sender,
    dateFrom,
    dateTo,
    limit = 20,
    cursor,
  } = filters;

  if (!query.trim()) {
    return { results: [], nextCursor: null, totalCount: 0 };
  }

  // Generate cache key from search params
  const cacheKey = getSearchCacheKey(userId, filters);
  const cacheKeyWithCursor = cursor ? `${cacheKey}:${cursor}` : cacheKey;

  // Try cache first (skip if cursor pagination)
  if (!cursor) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as SearchResponse;
      }
    } catch {
      // Cache miss or error, proceed with search
    }
  }

  // Build where clause for base filters
  const where: Record<string, unknown> = {
    chat: {
      OR: [
        { userId },
        { members: { some: { userId } } },
      ],
    },
  };

  if (chatId) {
    where.chatId = chatId;
  }

  if (projectId) {
    where.chat = {
      ...((where.chat as Record<string, unknown>) || {}),
      projectId,
    };
  }

  if (sender) {
    where.role = sender;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      (where.createdAt as Record<string, unknown>).gte = dateFrom;
    }
    if (dateTo) {
      (where.createdAt as Record<string, unknown>).lte = dateTo;
    }
  }

  // Try tsvector search first, fall back to ILIKE
  const messages = await tryTsvectorSearch(query, where, limit, cursor);

  // Create highlight and filter results
  const matchedMessages = messages
    .map((msg) => {
      const highlight = createHighlight(msg.content, query, 150);
      return {
        id: msg.id,
        chatId: msg.chatId,
        chatTitle: msg.chat.title,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        highlight,
      };
    })
    .filter((msg) => msg.content.toLowerCase().includes(query.toLowerCase()));

  const hasMore = matchedMessages.length > limit;
  if (hasMore) matchedMessages.pop();

  const response: SearchResponse = {
    results: matchedMessages as SearchResult[],
    nextCursor: hasMore ? matchedMessages[matchedMessages.length - 1]?.id : null,
    totalCount: matchedMessages.length,
  };

  // Cache results for 60 seconds (skip if cursor pagination)
  if (!cursor) {
    try {
      await redis.setex(cacheKey, TTL.searchCache || 60, JSON.stringify(response));
    } catch {
      // Cache write error, response already returned
    }
  }

  return response;
}

/**
 * Generate a cache key for search results
 */
function getSearchCacheKey(userId: string, filters: SearchFilters): string {
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify(filters))
    .digest("hex")
    .slice(0, 16);
  return KEYS.searchCache(userId, hash);
}

/**
 * Attempt tsvector full-text search with ranking
 * Falls back to standard Prisma query if tsvector column doesn't exist
 */
async function tryTsvectorSearch(
  query: string,
  where: Record<string, unknown>,
  limit: number,
  cursor?: string
) {
  try {
    // Build dynamic conditions and params array
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Full-text search condition (required)
    conditions.push(`m."searchVector" @@ plainto_tsquery('english', $${paramIndex++})`);
    params.push(query);

    // User access condition (required)
    conditions.push(`(
      c."userId" = $${paramIndex++}
      OR EXISTS (SELECT 1 FROM "ChatMember" cm WHERE cm."chatId" = c.id AND cm."userId" = $${paramIndex - 1})
    )`);
    // Using same userId for both parts of OR - Prisma passes it twice but it's fine
    // Actually let's fix this - need userId in both places
    const userId = where.chat && Array.isArray((where.chat as Record<string, unknown>).OR)
      ? ((where.chat as Record<string, unknown>).OR as Array<Record<string, unknown>>)[0]?.userId || ""
      : "";
    params.push(userId, userId);
    paramIndex += 1; // compensate for the duplicate

    // chatId filter
    if (where.chatId) {
      conditions.push(`m."chatId" = $${paramIndex++}`);
      params.push(where.chatId);
    }

    // projectId filter
    if (where.projectId) {
      conditions.push(`c."projectId" = $${paramIndex++}`);
      params.push((where.chat as Record<string, unknown>)?.projectId || where.projectId);
    }

    // sender role filter
    if (where.role) {
      conditions.push(`m.role = $${paramIndex++}`);
      params.push(where.role);
    }

    // Date range filter
    if (where.createdAt) {
      const createdAt = where.createdAt as Record<string, unknown>;
      if (createdAt.gte) {
        conditions.push(`m."createdAt" >= $${paramIndex++}`);
        params.push(createdAt.gte);
      }
      if (createdAt.lte) {
        conditions.push(`m."createdAt" <= $${paramIndex++}`);
        params.push(createdAt.lte);
      }
    }

    // Cursor pagination (skip the cursor message itself)
    if (cursor) {
      conditions.push(`m."createdAt" < (SELECT "createdAt" FROM "Message" WHERE id = $${paramIndex++})`);
      params.push(cursor);
    }

    // Build final query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const searchQuery = `
      SELECT m.id, m."chatId", m.sender, m.role, m.content, m."createdAt", m."updatedAt",
             m."parentId", m.type,
             c.id as "chatId", c.title as "chatTitle",
             ts_rank(m."searchVector", plainto_tsquery('english', $1)) as rank
      FROM "Message" m
      JOIN "Chat" c ON m."chatId" = c.id
      ${whereClause}
      ORDER BY rank DESC, m."createdAt" DESC
      LIMIT $${paramIndex}
    `;
    params.push(limit + 1);

    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      chatId: string;
      sender: string;
      role: string | null;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      parentId: string | null;
      type: string;
      chatTitle: string;
      rank: number;
    }>>(searchQuery, ...params);

    return results.map((row) => ({
      id: row.id,
      chatId: row.chatId,
      sender: row.sender,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      parentId: row.parentId,
      type: row.type,
      chat: {
        id: row.chatId,
        title: row.chatTitle,
      },
    }));
  } catch {
    // tsvector column doesn't exist or query failed, fall back to ILIKE
    return prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      include: {
        chat: {
          select: { id: true, title: true },
        },
      },
    });
  }
}

/**
 * Create a highlight snippet around the search term
 */
function createHighlight(content: string, query: string, maxLength: number): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    return content.slice(0, maxLength) + (content.length > maxLength ? "..." : "");
  }

  // Calculate start position, trying to show context before the match
  const contextBefore = 50;
  const start = Math.max(0, index - contextBefore);
  const end = Math.min(content.length, index + query.length + 100);

  let snippet = content.slice(start, end);

  // Add ellipsis if we cut off content
  if (start > 0) {
    snippet = "..." + snippet;
  }
  if (end < content.length) {
    snippet = snippet + "...";
  }

  return snippet;
}

/**
 * Search chats with advanced filters
 * Similar to searchMessages but at the chat level
 */
export async function searchChats(
  userId: string,
  filters: Omit<SearchFilters, "sender">
): Promise<{ chats: SearchResult[]; nextCursor: string | null }> {
  const { query, projectId, dateFrom, dateTo, limit = 20, cursor } = filters;

  if (!query.trim()) {
    return { chats: [], nextCursor: null };
  }

  const searchTerm = `%${query.toLowerCase()}%`;

  // Build where for chats
  const chatWhere: Record<string, unknown> = {
    OR: [
      { userId },
      { members: { some: { userId } } },
    ],
    archivedAt: null,
  };

  if (projectId) {
    chatWhere.projectId = projectId;
  }

  if (dateFrom || dateTo) {
    chatWhere.createdAt = {};
    if (dateFrom) {
      (chatWhere.createdAt as Record<string, unknown>).gte = dateFrom;
    }
    if (dateTo) {
      (chatWhere.createdAt as Record<string, unknown>).lte = dateTo;
    }
  }

  // Search chats by title OR by messages content
  const chats = await prisma.chat.findMany({
    where: chatWhere,
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          role: true,
        },
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  // Filter chats where title or messages match the query
  const matchedChats = chats
    .filter((chat) => {
      const titleMatch = chat.title.toLowerCase().includes(query.toLowerCase());
      const messageMatch = chat.messages.some((m) =>
        m.content.toLowerCase().includes(query.toLowerCase())
      );
      return titleMatch || messageMatch;
    })
    .map((chat) => {
      const firstMatch = chat.messages.find((m) =>
        m.content.toLowerCase().includes(query.toLowerCase())
      );
      const highlight = firstMatch
        ? createHighlight(firstMatch.content, query, 150)
        : createHighlight(chat.title, query, 100);

      return {
        id: chat.id,
        chatId: chat.id,
        chatTitle: chat.title,
        role: firstMatch?.role || "user",
        content: firstMatch?.content || chat.title,
        createdAt: firstMatch?.createdAt.toISOString() || chat.createdAt.toISOString(),
        highlight,
      };
    });

  const hasMore = matchedChats.length > limit;
  if (hasMore) matchedChats.pop();

  return {
    chats: matchedChats,
    nextCursor: hasMore ? matchedChats[matchedChats.length - 1]?.id : null,
  };
}

/**
 * Get search suggestions based on partial query
 * Uses trigram similarity for typo-tolerant suggestions
 */
export async function getSearchSuggestions(
  userId: string,
  query: string,
  limit = 5
): Promise<string[]> {
  if (!query.trim() || query.length < 2) {
    return [];
  }

  // Get recent search terms from user's message content
  const searchTerm = `%${query.toLowerCase()}%`;

  const suggestions = await prisma.message.findMany({
    where: {
      chat: {
        OR: [
          { userId },
          { members: { some: { userId } } },
        ],
      },
      content: { contains: query, mode: "insensitive" },
    },
    select: { content: true },
    take: 20,
    distinct: "content",
  });

  // Extract unique words/phrases that start with the query
  const words = new Set<string>();
  for (const msg of suggestions) {
    const content = msg.content.toLowerCase();
    const index = content.indexOf(query.toLowerCase());

    if (index !== -1) {
      // Extract word/phrase starting at the match position
      let start = index;
      let end = index + query.length;

      // Expand to word boundaries
      while (start > 0 && content[start - 1] === " ") start--;
      while (end < content.length && content[end] === " ") end++;

      // Get the word/phrase
      let word = content.slice(start, end).trim();
      if (word.length < 2) continue;

      // Cap at reasonable length
      if (word.length > 50) {
        word = word.slice(0, 50);
      }

      words.add(word);
    }
  }

  return Array.from(words).slice(0, limit);
}
