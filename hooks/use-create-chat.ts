/**
 * useCreateChat - Centralized chat creation hook
 *
 * Handles:
 * - Creating chat via API with optional projectId
 * - Optimistic updates for both global chats and project-scoped chats
 * - Automatic navigation after creation
 * - Proper error rollback
 * - Query invalidation for real-time sync
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Chat, ChatListResponse } from "@/services/chat.service";
import { logger } from "@/lib/logger";

interface CreateChatParams {
  firstMessage?: string;
  projectId?: string;
  webSearchEnabled?: boolean;
}

interface CreateChatResult {
  id: string;
  title: string;
  shouldTriggerAI: boolean;
}

interface UseCreateChatOptions {
  /** Project ID to scope the chat to (optional) */
  projectId?: string;
  /** Custom navigation path generator (defaults to /chat/{id}) */
  getNavigatePath?: (chatId: string, firstMessage: string, shouldTriggerAI: boolean) => string;
  /** Called before navigation (useful for analytics, etc.) */
  onBeforeNavigate?: (chatId: string, firstMessage: string) => void;
  /** Called on creation error */
  onError?: (error: Error) => void;
}

interface UseCreateChatReturn {
  /** Trigger chat creation */
  createChat: (firstMessage?: string) => Promise<void>;
  /** Whether a chat is currently being created */
  isCreating: boolean;
  /** The error from the last creation attempt */
  error: Error | null;
}

async function createChatAPI(params: CreateChatParams): Promise<CreateChatResult> {
  const res = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(params.projectId && { projectId: params.projectId }),
      firstMessage: params.firstMessage,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Failed to create chat" }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export function useCreateChat(options: UseCreateChatOptions = {}): UseCreateChatReturn {
  const { projectId, getNavigatePath, onBeforeNavigate, onError } = options;
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (firstMessage?: string) =>
      createChatAPI({ firstMessage, projectId }),

    onMutate: async (firstMessage) => {
      // Cancel any in-flight queries to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      if (projectId) {
        await queryClient.cancelQueries({ queryKey: ["project-chats", projectId] });
      }

      // Snapshot current state for rollback
      const previousChats = queryClient.getQueryData<ChatListResponse>(["chats"]);
      const previousProjectChats = projectId
        ? queryClient.getQueryData<ChatListResponse>(["project-chats", projectId])
        : undefined;

      // Create optimistic chat
      const tempChat: Chat = {
        id: `temp-${Date.now()}`,
        title: firstMessage?.slice(0, 50) || "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: projectId ?? null,
        messageCount: 0,
        firstMessagePreview: firstMessage ?? null,
      };

      // Optimistically update global chats list
      queryClient.setQueryData<ChatListResponse>(
        ["chats"],
        (old) => {
          if (!old) return { chats: [tempChat], nextCursor: null };
          // Avoid duplicates
          if (old.chats.some((c) => c.id === tempChat.id)) return old;
          return { ...old, chats: [tempChat, ...old.chats] };
        }
      );

      // Optimistically update project-scoped chats list
      if (projectId) {
        queryClient.setQueryData<ChatListResponse>(
          ["project-chats", projectId],
          (old) => {
            if (!old) return { chats: [tempChat], nextCursor: null };
            if (old.chats.some((c) => c.id === tempChat.id)) return old;
            return { ...old, chats: [tempChat, ...old.chats] };
          }
        );
      }

      return { previousChats, previousProjectChats };
    },

    onError: (_err, _vars, context) => {
      // Rollback to previous state on error
      if (context?.previousChats) {
        queryClient.setQueryData(["chats"], context.previousChats);
      }
      if (projectId && context?.previousProjectChats !== undefined) {
        queryClient.setQueryData(["project-chats", projectId], context.previousProjectChats);
      }
      onError?.(_err as Error);
    },

    onSuccess: (data, firstMessage) => {
      logger.info("Chat created", { chatId: data.id, projectId });

      // Invalidate to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-chats", projectId] });
      }

      // Navigate to the new chat
      onBeforeNavigate?.(data.id, firstMessage ?? "");

      const navPath = getNavigatePath
        ? getNavigatePath(data.id, firstMessage ?? "", data.shouldTriggerAI)
        : `/chat/${data.id}?q=${encodeURIComponent(firstMessage ?? "")}${data.shouldTriggerAI ? "&trigger=1" : ""}`;

      router.push(navPath);
    },
  });

  const createChat = useCallback(
    async (firstMessage?: string) => {
      await mutation.mutateAsync(firstMessage);
    },
    [mutation]
  );

  return {
    createChat,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}
