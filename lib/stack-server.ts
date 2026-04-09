import prisma from "./prisma";
import redis, { KEYS, TTL, CHANNELS } from "./redis";
import { generateTitle } from "./title";

export interface ChatWithMessages {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  archivedAt: Date | null;
  projectId: string | null;
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }[];
}

export async function getUserChats(userId: string, limit = 20, cursor?: string) {
  // Try cache first (only for non-paginated queries - cursor means pagination)
  if (!cursor) {
    try {
      const cached = await redis.get(KEYS.userChats(userId));
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
      deletedAt: null,
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
    })),
    nextCursor: hasMore ? chats[chats.length - 1].id : null,
  };

  // Cache the result (only for non-paginated queries)
  if (!cursor) {
    try {
      await redis.setex(KEYS.userChats(userId), TTL.userChats, JSON.stringify(result));
    } catch {
      // Cache error, continue without caching
    }
  }

  return result;
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

  // Return chat with trigger flag
  return {
    ...chat,
    _shouldTriggerAI: shouldTriggerAI,
  };
}

export async function getChatById(chatId: string, userId: string) {
  // Try cache first
  const cached = await redis.hgetall(KEYS.chatMeta(chatId));
  if (cached && Object.keys(cached).length > 0) {
    return {
      id: chatId,
      title: cached.title,
      createdAt: cached.createdAt,
      projectId: cached.projectId || null,
    };
  }

  // Fallback to DB
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId, deletedAt: null },
    select: {
      id: true,
      title: true,
      createdAt: true,
      projectId: true,
    },
  });

  return chat;
}

export async function updateChat(
  chatId: string,
  userId: string,
  data: { title?: string; archivedAt?: Date | null }
) {
  // Verify ownership first
  const existing = await prisma.chat.findFirst({
    where: { id: chatId, userId, deletedAt: null },
    select: { id: true, userId: true },
  });

  if (!existing) {
    throw new Error("Chat not found");
  }

  const chat = await prisma.chat.update({
    where: { id: chatId },
    data: {
      ...data,
      ...(data.title && { title: data.title }),
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  // Update cache
  if (data.title) {
    await redis.hset(KEYS.chatMeta(chat.id), "title", data.title);
  }

  // Invalidate user chat list cache (covers rename, archive, project changes)
  try {
    await redis.del(KEYS.userChats(userId));
  } catch {
    // Redis error, ignore
  }

  // Publish sidebar event
  await redis.publish(
    CHANNELS.sidebar(userId),
    JSON.stringify({
      type: data.archivedAt ? "chat:archived" : "chat:renamed",
      chatId: chat.id,
      title: chat.title,
    })
  );

  return chat;
}

export async function deleteChat(chatId: string, userId: string) {
  // Verify ownership first
  const existing = await prisma.chat.findFirst({
    where: { id: chatId, userId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Chat not found");
  }

  await prisma.chat.update({
    where: { id: chatId },
    data: { deletedAt: new Date() },
  });

  // Clear cache
  await redis.del(KEYS.chatMessages(chatId));
  await redis.del(KEYS.chatMeta(chatId));

  // Invalidate user chat list cache
  try {
    await redis.del(KEYS.userChats(userId));
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
  if (!cursor || direction === "before") {
    const cached = await redis.lrange(KEYS.chatMessages(chatId), 0, -1);
    if (cached.length >= limit && !cursor) {
      const messages = cached.map((m: string) => JSON.parse(m));
      return { messages, nextCursor: null, prevCursor: null };
    }
  }

  // Fallback to DB with bidirectional pagination
  const whereClause = cursor
    ? direction === "before"
      ? { chatId, chat: { userId, deletedAt: null }, deletedAt: null, id: { lt: cursor } }
      : { chatId, chat: { userId, deletedAt: null }, deletedAt: null, id: { gt: cursor } }
    : { chatId, chat: { userId, deletedAt: null }, deletedAt: null };

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

  // For "before", reverse to get chronological order
  const orderedMessages = direction === "before" ? messages.reverse() : messages;

  // Populate cache (only for initial "before" load)
  if (!cursor && orderedMessages.length > 0 && direction === "before") {
    const pipeline = redis.pipeline();
    orderedMessages.forEach((msg: typeof orderedMessages[number]) => {
      pipeline.lpush(
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
    await pipeline.exec();
  }

  return {
    messages: orderedMessages.map((m) => ({
      id: m.id,
      role: m.role as string,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
    nextCursor: hasMore
      ? direction === "before"
        ? messages[messages.length - 1].id
        : messages[0].id
      : null,
    prevCursor: cursor || null,
  };
}

export async function addChatMessage(
  chatId: string,
  userId: string,
  data: { role: "user" | "assistant"; content: string }
) {
  // Verify user owns this chat
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId, deletedAt: null },
    select: { id: true },
  });

  if (!chat) {
    // Debug: check what chat actually exists
    const anyChat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, userId: true, deletedAt: true },
    });
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
      type: "message:new",
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
    where: { chatId, deletedAt: null },
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
