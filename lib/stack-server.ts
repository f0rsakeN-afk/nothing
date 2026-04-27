import prisma from "./prisma";
import redis, { KEYS, TTL, CHANNELS } from "./redis";
import { generateTitle } from "./title";

export interface ChatWithMessages {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  projectId: string | null;
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }[];
}

export async function getUserChats(
  userId: string,
  limit = 20,
  cursor?: string,
  options: { archived?: boolean; projectId?: string; includeShared?: boolean } = {}
) {
  const { archived = false, projectId, includeShared = false } = options;
  const cacheKey = archived
    ? KEYS.userChatsArchived(userId)
    : KEYS.userChats(userId);

  // Try cache first (only for non-paginated queries - cursor means pagination)
  if (!cursor && !includeShared) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cached result has enough items
        if (parsed.chats.length >= Math.min(limit, 50)) {
          return parsed;
        }
      }
    } catch {
      // Redis error, fall through to DB
    }
  }

  const chats = await prisma.chat.findMany({
    where: {
      userId,
      archivedAt: archived ? { not: null } : null,
      ...(projectId && { projectId }),
    },
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1, // Get first message for preview
        select: { content: true },
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  const hasMore = chats.length > limit;
  if (hasMore) chats.pop();

  const result = {
    chats: chats.map((chat: typeof chats[number]) => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      projectId: chat.projectId,
      messageCount: chat._count.messages,
      firstMessagePreview: chat.messages[0]?.content.slice(0, 100) || null,
      parentChatId: chat.parentChatId,
      archivedAt: chat.archivedAt?.toISOString() ?? null,
      pinnedAt: chat.pinnedAt?.toISOString() ?? null,
    })),
    nextCursor: hasMore ? chats[chats.length - 1].id : null,
  };

  // Cache the result (only for non-paginated queries and not including shared)
  if (!cursor && !includeShared) {
    try {
      await redis.setex(cacheKey, TTL.userChats, JSON.stringify(result));
    } catch {
      // Cache error, continue without caching
    }
  }

  // If includeShared, also fetch chats where user is a member but not owner
  if (includeShared) {
    const sharedChats = await prisma.chat.findMany({
      where: {
        archivedAt: null,
        AND: [
          { userId: { not: userId } },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      include: {
        user: {
          select: { id: true, email: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { content: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    const sharedHasMore = sharedChats.length > limit;
    if (sharedHasMore) sharedChats.pop();

    const sharedResult = {
      chats: sharedChats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        projectId: chat.projectId,
        messageCount: chat._count.messages,
        firstMessagePreview: chat.messages[0]?.content.slice(0, 100) || null,
        parentChatId: chat.parentChatId,
        archivedAt: chat.archivedAt?.toISOString() ?? null,
        pinnedAt: chat.pinnedAt?.toISOString() ?? null,
        owner: chat.user ? {
          id: chat.user.id,
          email: chat.user.email,
        } : null,
        isShared: true,
      })),
      nextCursor: sharedHasMore ? sharedChats[sharedChats.length - 1].id : null,
    };

    // Merge own chats with shared chats and sort by updatedAt
    const allChats = [...result.chats, ...sharedResult.chats].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return {
      chats: allChats,
      nextCursor: sharedHasMore ? sharedResult.nextCursor : result.nextCursor,
    };
  }

  return result;
}

export async function searchUserChats(
  userId: string,
  query: string,
  limit = 20
) {
  if (!query.trim()) {
    return { chats: [], nextCursor: null };
  }

  const searchTerm = `%${query.toLowerCase()}%`;

  // Search in chat titles
  const chats = await prisma.chat.findMany({
    where: {
      userId,
      archivedAt: null,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { messages: { some: { content: { contains: query, mode: "insensitive" } } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  return {
    chats: chats.map((chat: typeof chats[number]) => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      projectId: chat.projectId,
      messageCount: chat._count.messages,
      firstMessagePreview: chat.messages[0]?.content.slice(0, 100) || null,
    })),
    nextCursor: null,
  };
}

export async function createChat(
  userId: string,
  options: { projectId?: string; firstMessage?: string } = {}
) {
  const { projectId, firstMessage } = options;

  const title = firstMessage
    ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "")
    : "New Chat";

  let shouldTriggerAI = false;

  // Use transaction to ensure user exists and create chat + first message atomically
  const chat = await prisma.$transaction(async (tx) => {
    // First verify user exists
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error(`User with id ${userId} does not exist`);
    }

    // Create chat
    const newChat = await tx.chat.create({
      data: {
        title,
        userId,
        projectId,
      },
    });

    // If there's a first message, create it within the same transaction
    if (firstMessage) {
      await tx.message.create({
        data: {
          chatId: newChat.id,
          sender: "user",
          role: "user",
          content: firstMessage,
        },
      });
      shouldTriggerAI = true;
    }

    return newChat;
  });

  // Cache chat meta in Redis (non-blocking, continue even if fails)
  try {
    await redis.hset(KEYS.chatMeta(chat.id), {
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      projectId: chat.projectId || "",
    });
    await redis.expire(KEYS.chatMeta(chat.id), TTL.chatMeta);
  } catch (e) {
    console.warn("Redis cache error:", e);
  }

  // Cache the first message if it exists
  if (firstMessage) {
    try {
      await redis.lpush(
        KEYS.chatMessages(chat.id),
        JSON.stringify({
          id: crypto.randomUUID(),
          role: "user",
          content: firstMessage,
          createdAt: new Date().toISOString(),
        })
      );
      await redis.ltrim(KEYS.chatMessages(chat.id), 0, 99);
      await redis.expire(KEYS.chatMessages(chat.id), TTL.chatMessages);
    } catch (e) {
      console.warn("Redis cache error:", e);
    }

    // Trigger async title generation (fire and forget)
    generateTitle(chat.id).catch(console.error);
  }

  // Invalidate user's chat list cache (new chat should appear immediately)
  try {
    await redis.del(KEYS.userChats(userId));
    await redis.del(KEYS.userChatsArchived(userId));
  } catch {
    // Redis error, ignore
  }

  // Return chat with trigger flag
  return {
    ...chat,
    _shouldTriggerAI: shouldTriggerAI,
  };
}

export async function getChatById(chatId: string, userId: string) {
  // Try cache first (cache only works for direct owner access)
  const cached = await redis.hgetall(KEYS.chatMeta(chatId));
  if (cached && Object.keys(cached).length > 0) {
    // Verify ownership via cache (cache only for owner)
    if (cached.ownerId === userId) {
      return {
        id: chatId,
        title: cached.title,
        createdAt: cached.createdAt,
        projectId: cached.projectId || null,
      };
    }
  }

  // Fallback to DB with membership check
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      OR: [
        { userId }, // Direct owner
        { members: { some: { userId } } }, // Member
      ],
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      projectId: true,
    },
  });

  return chat;
}

export async function getChatByIdWithMessages(chatId: string, userId: string) {
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      OR: [
        { userId }, // Direct owner
        { members: { some: { userId } } }, // Member
      ],
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
      project: {
        select: { id: true, name: true },
      },
    },
  });

  return chat;
}

export async function updateChat(
  chatId: string,
  userId: string,
  data: { title?: string; archivedAt?: Date | null; projectId?: string | null; pinnedAt?: Date | null; visibility?: string; shareExpiry?: Date | null; shareToken?: string | null; sharePassword?: string | null }
) {
  const chat = await prisma.chat.update({
    where: { id: chatId, userId },
    data: {
      ...data,
      ...(data.title && { title: data.title }),
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      updatedAt: true,
      archivedAt: true,
      pinnedAt: true,
      visibility: true,
      shareExpiry: true,
      shareToken: true,
    },
  });

  // Update cache
  if (data.title) {
    await redis.hset(KEYS.chatMeta(chat.id), "title", data.title);
  }
  if (data.projectId !== undefined) {
    await redis.hset(KEYS.chatMeta(chat.id), "projectId", data.projectId || "");
  }
  if (data.pinnedAt !== undefined) {
    await redis.hset(KEYS.chatMeta(chat.id), "pinnedAt", data.pinnedAt ? data.pinnedAt.toISOString() : "");
  }
  if (data.visibility !== undefined) {
    await redis.hset(KEYS.chatMeta(chat.id), "visibility", data.visibility);
  }

  // Invalidate user chat list cache (covers rename, archive, project changes)
  try {
    await redis.del(KEYS.userChats(userId));
    await redis.del(KEYS.userChatsArchived(userId));
  } catch {
    // Redis error, ignore
  }

  // Publish sidebar event
  let eventType = "chat:renamed";
  if (data.archivedAt !== undefined) eventType = "chat:archived";
  else if (data.pinnedAt !== undefined) eventType = "chat:pinned";
  else if (data.visibility !== undefined) eventType = "chat:visibility";

  await redis.publish(
    CHANNELS.sidebar(userId),
    JSON.stringify({
      type: eventType,
      chatId: chat.id,
      title: chat.title,
      visibility: chat.visibility,
    })
  );

  return chat;
}

export async function deleteChat(chatId: string, userId: string) {
  const result = await prisma.chat.deleteMany({
    where: { id: chatId, userId },
  });

  if (result.count === 0) {
    throw new Error("Chat not found");
  }

  // Clear cache
  await redis.del(KEYS.chatMessages(chatId));
  await redis.del(KEYS.chatMeta(chatId));

  // Invalidate user chat list cache
  try {
    await redis.del(KEYS.userChats(userId));
    await redis.del(KEYS.userChatsArchived(userId));
  } catch {
    // Redis error, ignore
  }

  // Publish sidebar event
  await redis.publish(
    CHANNELS.sidebar(userId),
    JSON.stringify({
      type: "chat:deleted",
      chatId,
    })
  );
}

export async function getChatMessages(
  chatId: string,
  userId: string,
  limit = 50,
  cursor?: string,
  direction: "before" | "after" = "before"
) {
  // Try cache first (only for "before" direction with no cursor)
  if (!cursor && direction === "before") {
    const cachedLen = await redis.llen(KEYS.chatMessages(chatId));
    if (cachedLen >= limit) {
      const cached = await redis.lrange(KEYS.chatMessages(chatId), 0, limit - 1);
      const messages = cached.map((m: string) => JSON.parse(m));
      // Cache stores messages in chronological order (oldest first)
      // For "before" direction we need chronological, so no reverse needed
      return { messages, nextCursor: null, prevCursor: null };
    }
  }

  // Fallback to DB with bidirectional pagination
  const whereClause = cursor
    ? direction === "before"
      ? { chatId, chat: { userId }, id: { lt: cursor } }
      : { chatId, chat: { userId }, id: { gt: cursor } }
    : { chatId, chat: { userId } };

  const messages = await prisma.message.findMany({
    where: whereClause,
    orderBy: { createdAt: direction === "before" ? "desc" : "asc" },
    take: limit + 1,
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  // For "before", reverse to get chronological order (oldest first)
  // IMPORTANT: use spread to avoid mutating the original array
  const orderedMessages = direction === "before" ? [...messages].reverse() : messages;

  // For "before" pagination, nextCursor should be the OLDEST message's ID
  // (so next fetch gets messages older than that)
  // For "after", nextCursor should be the NEWEST message's ID
  // Since messages array after query is in reverse chronological order for "before",
  // messages[0] is oldest and messages[messages.length-1] is newest
  const nextCursorId = hasMore
    ? direction === "before"
      ? messages[0].id  // oldest message for "before"
      : messages[messages.length - 1].id  // newest message for "after"
    : null;

  // Populate cache (only for initial "before" load)
  // Use rpush so messages are stored in retrieval order (lrange returns left to right)
  if (!cursor && orderedMessages.length > 0 && direction === "before") {
    const pipeline = redis.pipeline();
    orderedMessages.forEach((msg: typeof orderedMessages[number]) => {
      pipeline.rpush(
        KEYS.chatMessages(chatId),
        JSON.stringify({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
        })
      );
    });
    pipeline.expire(KEYS.chatMessages(chatId), TTL.chatMessages);
    const results = await pipeline.exec();
    if (results?.some(([err]) => err)) {
      console.warn("[getChatMessages] Redis pipeline error:", results);
    }
  }

  return {
    messages: orderedMessages.map((m) => ({
      id: m.id,
      role: m.role as string,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
    nextCursor: nextCursorId,
    prevCursor: cursor || null,
  };
}

export async function addChatMessage(
  chatId: string,
  userId: string,
  data: { role: "user" | "assistant"; content: string },
  fileIds?: string[]
) {
  // Verify user has access to this chat (owner or member via ChatMember)
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      OR: [
        { userId }, // Direct owner
        { members: { some: { userId } } }, // Member via ChatMember
      ],
    },
    select: { id: true, userId: true },
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  const message = await prisma.message.create({
    data: {
      chatId,
      sender: data.role,
      role: data.role,
      content: data.content,
    },
  });

  // Link files to message if provided
  if (fileIds && fileIds.length > 0) {
    await prisma.messageFile.createMany({
      data: fileIds.map((fileId) => ({
        messageId: message.id,
        fileId,
      })),
    });
  }

  // Update chat's updatedAt
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  // Cache message
  await redis.lpush(
    KEYS.chatMessages(chatId),
    JSON.stringify({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })
  );
  await redis.ltrim(KEYS.chatMessages(chatId), 0, 99);
  await redis.expire(KEYS.chatMessages(chatId), TTL.chatMessages);

  // Publish message event
  await redis.publish(
    CHANNELS.chat(chatId),
    JSON.stringify({
      type: "chat:message:new",
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    })
  );

  // Invalidate user chat list cache (new message changes chat's updatedAt sort order)
  try {
    await redis.del(KEYS.userChats(userId));
  } catch {
    // Redis error, ignore
  }

  // Invalidate file contents cache since new message may affect which files are relevant
  try {
    await redis.del(KEYS.chatFileContents(chatId));
  } catch {
    // Redis error, ignore
  }

  return message;
}

export async function getRecentMessages(chatId: string, limit = 20) {
  // Try Redis first
  const cached = await redis.lrange(KEYS.chatMessages(chatId), 0, -1);
  if (cached.length > 0) {
    return cached.slice(-limit).map((m: string) => JSON.parse(m) as { id: string; role: string; content: string; createdAt: string });
  }

  // Fallback to DB
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return messages.reverse().map((m: typeof messages[number]) => ({
    id: m.id,
    role: m.role as string,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));
}

/**
 * Create embeddings for a file's content
 * Called after file upload completes
 */
export async function createFileChunks(
  fileId: string,
  extractedContent: string
): Promise<{ chunkCount: number; tokenCount: number } | null> {
  try {
    const { embedFile } = await import("@/services/rag.service");
    return await embedFile(fileId, extractedContent);
  } catch (error) {
    console.error("[StackServer] Failed to create file chunks:", error);
    return null;
  }
}

/**
 * Create embeddings for a memory
 * Called when memory is created or updated
 */
export async function createMemoryEmbeddings(
  memoryId: string,
  content: string
): Promise<{ chunkCount: number; tokenCount: number } | null> {
  try {
    const { embedMemory } = await import("@/services/rag.service");
    return await embedMemory(memoryId, content);
  } catch (error) {
    console.error("[StackServer] Failed to create memory embeddings:", error);
    return null;
  }
}

/**
 * Delete embeddings when a file is deleted
 */
export async function deleteFileEmbeddings(fileId: string): Promise<void> {
  try {
    const { deleteFileEmbeddings: del } = await import("@/services/rag.service");
    await del(fileId);
  } catch (error) {
    console.error("[StackServer] Failed to delete file embeddings:", error);
  }
}

/**
 * Delete embeddings when a memory is deleted
 */
export async function deleteMemoryEmbeddings(memoryId: string): Promise<void> {
  try {
    const { deleteMemoryEmbeddings: del } = await import("@/services/rag.service");
    await del(memoryId);
  } catch (error) {
    console.error("[StackServer] Failed to delete memory embeddings:", error);
  }
}
