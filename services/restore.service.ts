/**
 * Restore Service
 * Soft delete with cascade restore logic
 */

import prisma from "@/lib/prisma";

export interface RestoreResult {
  restored: string[];
  orphans: string[];
  failed: { id: string; reason: string }[];
}

export interface TrashItem {
  id: string;
  modelType: string;
  modelId: string;
  data: unknown;
  deletedAt: Date;
  deletedBy: string | null;
  reason: string | null;
}

/**
 * Restore a project and its chats
 * If a chat was independently deleted, it stays deleted (orphan)
 */
export async function restoreProject(
  projectId: string,
  userId: string
): Promise<RestoreResult> {
  const result: RestoreResult = {
    restored: [],
    orphans: [],
    failed: [],
  };

  try {
    // Get project and check if it exists and is deleted
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: { not: null } },
    });

    if (!project) {
      result.failed.push({
        id: projectId,
        reason: "Project not found or not deleted",
      });
      return result;
    }

    // Restore project
    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: null },
    });
    result.restored.push(projectId);

    // Check for orphaned chats (deleted independently)
    const orphanedChats = await prisma.chat.findMany({
      where: { projectId, deletedAt: { not: null } },
      select: { id: true },
    });

    for (const chat of orphanedChats) {
      result.orphans.push(chat.id);
    }

    // All non-deleted chats will be visible again (they were just orphaned by parent's deletion)
    const visibleChats = await prisma.chat.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    });

    for (const chat of visibleChats) {
      result.restored.push(chat.id);
    }

    // Delete from trash tracking if present
    await prisma.trash.deleteMany({
      where: { modelType: "PROJECT", modelId: projectId },
    });

    return result;
  } catch (error) {
    result.failed.push({
      id: projectId,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

/**
 * Restore a chat
 * Chat becomes visible in its project (if project is not deleted)
 */
export async function restoreChat(
  chatId: string,
  userId: string
): Promise<RestoreResult> {
  const result: RestoreResult = {
    restored: [],
    orphans: [],
    failed: [],
  };

  try {
    // Get chat and check if it exists and is deleted
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, deletedAt: { not: null } },
      include: { project: true },
    });

    if (!chat) {
      result.failed.push({
        id: chatId,
        reason: "Chat not found or not deleted",
      });
      return result;
    }

    // Check if parent project is also deleted
    if (chat.project?.deletedAt) {
      result.orphans.push(chatId);
      result.failed.push({
        id: chatId,
        reason: "Parent project is deleted. Restore project first.",
      });
      return result;
    }

    // Restore chat
    await prisma.chat.update({
      where: { id: chatId },
      data: { deletedAt: null },
    });
    result.restored.push(chatId);

    // Delete from trash tracking if present
    await prisma.trash.deleteMany({
      where: { modelType: "CHAT", modelId: chatId },
    });

    return result;
  } catch (error) {
    result.failed.push({
      id: chatId,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

/**
 * Restore a file
 */
export async function restoreFile(
  fileId: string,
  userId: string
): Promise<RestoreResult> {
  const result: RestoreResult = {
    restored: [],
    orphans: [],
    failed: [],
  };

  try {
    // Get file and check if it exists and is deleted
    const file = await prisma.file.findFirst({
      where: { id: fileId, deletedAt: { not: null } },
      include: { project: true },
    });

    if (!file) {
      result.failed.push({
        id: fileId,
        reason: "File not found or not deleted",
      });
      return result;
    }

    // Check if parent project is also deleted
    if (file.project?.deletedAt) {
      result.orphans.push(fileId);
      result.failed.push({
        id: fileId,
        reason: "Parent project is deleted. Restore project first.",
      });
      return result;
    }

    // Restore file
    await prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: null },
    });
    result.restored.push(fileId);

    // Delete from trash tracking if present
    await prisma.trash.deleteMany({
      where: { modelType: "FILE", modelId: fileId },
    });

    return result;
  } catch (error) {
    result.failed.push({
      id: fileId,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

/**
 * Restore a message
 */
export async function restoreMessage(
  messageId: string,
  userId: string
): Promise<RestoreResult> {
  const result: RestoreResult = {
    restored: [],
    orphans: [],
    failed: [],
  };

  try {
    // Get message and check if it exists and is deleted
    const message = await prisma.message.findFirst({
      where: { id: messageId, deletedAt: { not: null } },
      include: { chat: true },
    });

    if (!message) {
      result.failed.push({
        id: messageId,
        reason: "Message not found or not deleted",
      });
      return result;
    }

    // Check if parent chat is also deleted
    if (message.chat?.deletedAt) {
      result.orphans.push(messageId);
      result.failed.push({
        id: messageId,
        reason: "Parent chat is deleted. Restore chat first.",
      });
      return result;
    }

    // Restore message
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: null },
    });
    result.restored.push(messageId);

    // Delete from trash tracking if present
    await prisma.trash.deleteMany({
      where: { modelType: "MESSAGE", modelId: messageId },
    });

    return result;
  } catch (error) {
    result.failed.push({
      id: messageId,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

/**
 * Generic restore by trash item ID
 */
export async function restoreByTrashId(trashId: string): Promise<RestoreResult> {
  const result: RestoreResult = {
    restored: [],
    orphans: [],
    failed: [],
  };

  try {
    const trashItem = await prisma.trash.findUnique({
      where: { id: trashId },
    });

    if (!trashItem) {
      result.failed.push({
        id: trashId,
        reason: "Trash item not found",
      });
      return result;
    }

    const modelType = trashItem.modelType;
    const modelId = trashItem.modelId;

    switch (modelType) {
      case "PROJECT":
        return restoreProject(modelId, "");

      case "CHAT":
        return restoreChat(modelId, "");

      case "FILE":
        return restoreFile(modelId, "");

      case "MESSAGE":
        return restoreMessage(modelId, "");

      default:
        result.failed.push({
          id: trashId,
          reason: `Unknown model type: ${modelType}`,
        });
        return result;
    }
  } catch (error) {
    result.failed.push({
      id: trashId,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

/**
 * Get all trash items for a user
 */
export async function getUserTrash(userId: string): Promise<TrashItem[]> {
  // Get all trash items and filter by user ownership
  // This requires knowing which items belong to the user
  const trashItems = await prisma.trash.findMany({
    orderBy: { deletedAt: "desc" },
    take: 100,
  });

  // Filter by user ownership
  const userProjectIds = await prisma.project.findMany({
    where: { userId },
    select: { id: true },
  });
  const userProjectIdSet = new Set(userProjectIds.map((p) => p.id));

  const chatProjectIds = await prisma.chat.findMany({
    where: { userId },
    select: { id: true, projectId: true },
  });
  const chatProjectMap = new Map(chatProjectIds.map((c) => [c.id, c.projectId]));

  const filtered = trashItems.filter((item) => {
    switch (item.modelType) {
      case "PROJECT":
        return userProjectIdSet.has(item.modelId);

      case "CHAT":
        const chatProjectId = chatProjectMap.get(item.modelId);
        return chatProjectId ? userProjectIdSet.has(chatProjectId) : false;

      default:
        return false;
    }
  });

  return filtered as TrashItem[];
}
