/**
 * Chat PubSub Service
 * Publishes real-time events to Redis for SSE subscribers
 *
 * Events published:
 * - chat:message:new - New message in chat
 * - chat:message:updated - Message edited
 * - chat:renamed - Chat title changed
 * - chat:archived - Chat archived
 * - chat:deleted - Chat deleted
 * - chat:created - New chat created
 * - sidebar:update - Sidebar needs refresh
 */

import redis, { CHANNELS } from "@/lib/redis";

export interface ChatMessageEvent {
  type: "chat:message:new";
  chatId: string;
  message: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  };
}

export interface ChatRenamedEvent {
  type: "chat:renamed";
  chatId: string;
  title: string;
}

export interface ChatArchivedEvent {
  type: "chat:archived";
  chatId: string;
}

export interface ChatDeletedEvent {
  type: "chat:deleted";
  chatId: string;
}

export interface ChatCreatedEvent {
  type: "chat:created";
  chat: {
    id: string;
    title: string;
    createdAt: string;
  };
}

export interface SidebarUpdateEvent {
  type: "sidebar:update";
  action: "refresh";
}

export interface ChatResumeReadyEvent {
  type: "chat:resume:ready";
  chatId: string;
}

export interface ChatMemberAddedEvent {
  type: "chat:member:added";
  chatId: string;
  memberId: string;
}

export interface ChatMemberRemovedEvent {
  type: "chat:member:removed";
  chatId: string;
  memberId: string;
}

export interface ChatMemberRoleChangedEvent {
  type: "chat:member:role_changed";
  chatId: string;
  memberId: string;
  newRole: string;
}

export type ChatEvent =
  | ChatMessageEvent
  | ChatRenamedEvent
  | ChatArchivedEvent
  | ChatDeletedEvent
  | ChatCreatedEvent
  | SidebarUpdateEvent
  | ChatResumeReadyEvent
  | ChatMemberAddedEvent
  | ChatMemberRemovedEvent
  | ChatMemberRoleChangedEvent;

/**
 * Publish event to a chat channel
 */
async function publishToChat(chatId: string, event: ChatEvent): Promise<void> {
  try {
    const channel = CHANNELS.chat(chatId);
    await redis.publish(channel, JSON.stringify(event));
  } catch (error) {
    console.error("[ChatPubSub] Failed to publish to chat:", error);
  }
}

/**
 * Publish event to user's sidebar channel
 */
async function publishToSidebar(userId: string, event: ChatEvent): Promise<void> {
  try {
    const channel = CHANNELS.sidebar(userId);
    await redis.publish(channel, JSON.stringify(event));
  } catch (error) {
    console.error("[ChatPubSub] Failed to publish to sidebar:", error);
  }
}

/**
 * Notify new message in chat
 */
export async function publishMessageNew(
  chatId: string,
  userId: string,
  message: { id: string; role: string; content: string; createdAt: Date }
): Promise<void> {
  const event: ChatMessageEvent = {
    type: "chat:message:new",
    chatId,
    message: {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  };

  await Promise.all([
    publishToChat(chatId, event),
    publishToSidebar(userId, event),
  ]);
}

/**
 * Notify chat was renamed
 */
export async function publishChatRenamed(
  chatId: string,
  userId: string,
  title: string
): Promise<void> {
  const event: ChatRenamedEvent = {
    type: "chat:renamed",
    chatId,
    title,
  };

  await publishToSidebar(userId, event);
}

/**
 * Notify chat was archived
 */
export async function publishChatArchived(
  chatId: string,
  userId: string
): Promise<void> {
  const event: ChatArchivedEvent = {
    type: "chat:archived",
    chatId,
  };

  await publishToSidebar(userId, event);
}

/**
 * Notify chat was deleted - publishes to all member's sidebar channels
 */
export async function publishChatDeleted(
  chatId: string,
  memberIds: string[]
): Promise<void> {
  const event: ChatDeletedEvent = {
    type: "chat:deleted",
    chatId,
  };

  // Publish to all members' sidebar channels
  await Promise.all(memberIds.map((memberId) => publishToSidebar(memberId, event)));
}

/**
 * Notify new chat was created
 */
export async function publishChatCreated(
  chat: { id: string; title: string; createdAt: Date },
  userId: string
): Promise<void> {
  const event: ChatCreatedEvent = {
    type: "chat:created",
    chat: {
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
    },
  };

  await publishToSidebar(userId, event);
}

/**
 * Force sidebar refresh (e.g., after bulk operations)
 */
export async function publishSidebarRefresh(userId: string): Promise<void> {
  const event: SidebarUpdateEvent = {
    type: "sidebar:update",
    action: "refresh",
  };

  await publishToSidebar(userId, event);
}

/**
 * Notify that a resume is ready for a chat (after async retry)
 */
export async function publishChatResumeReady(
  chatId: string,
  userId: string
): Promise<void> {
  const event: ChatResumeReadyEvent = {
    type: "chat:resume:ready",
    chatId,
  };

  // Publish to both the chat channel and sidebar
  await Promise.all([
    publishToChat(chatId, event),
    publishToSidebar(userId, event),
  ]);
}

/**
 * Notify member was added to chat (for collaboration real-time updates)
 */
export async function publishMemberAdded(
  chatId: string,
  memberId: string
): Promise<void> {
  const event: ChatMemberAddedEvent = {
    type: "chat:member:added",
    chatId,
    memberId,
  };

  // Publish to chat channel (for other members) and to member's sidebar (for the new member)
  await Promise.all([
    publishToChat(chatId, event),
    publishToSidebar(memberId, event),
  ]);
}

/**
 * Notify member was removed from chat
 */
export async function publishMemberRemoved(
  chatId: string,
  memberId: string
): Promise<void> {
  const event: ChatMemberRemovedEvent = {
    type: "chat:member:removed",
    chatId,
    memberId,
  };

  // Publish to chat channel (for remaining members) and to removed member's sidebar
  await Promise.all([
    publishToChat(chatId, event),
    publishToSidebar(memberId, event),
  ]);
}

/**
 * Notify member role was changed
 */
export async function publishMemberRoleChanged(
  chatId: string,
  memberId: string,
  newRole: string
): Promise<void> {
  const event: ChatMemberRoleChangedEvent = {
    type: "chat:member:role_changed",
    chatId,
    memberId,
    newRole,
  };

  // Publish to chat channel (for other members) and to affected member's sidebar
  await Promise.all([
    publishToChat(chatId, event),
    publishToSidebar(memberId, event),
  ]);
}
