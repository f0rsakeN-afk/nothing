"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getChats, createChat, updateChat, deleteChat } from "@/services/chat.service";
import type { Chat } from "@/services/chat.service";

interface UseSidebarChatsResult {
  chats: Chat[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  createNewChat: (firstMessage?: string) => Promise<Chat>;
  renameChat: (chatId: string, title: string) => Promise<Chat>;
  deleteChatById: (chatId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<Chat>;
}

export function useSidebarChats(): UseSidebarChatsResult {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: () => getChats(50),
    staleTime: 30 * 1000,
    retry: false,
  });

  // Create chat
  const createMutation = useMutation({
    mutationFn: (firstMessage?: string) => createChat(firstMessage),
    onMutate: async (firstMessage) => {
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      const previous = queryClient.getQueryData(["chats"]);

      const tempChat: Chat = {
        id: `temp-${Date.now()}`,
        title: firstMessage?.slice(0, 50) || "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: null,
        messageCount: 0,
        firstMessagePreview: firstMessage || null,
      };

      queryClient.setQueryData(
        ["chats"],
        (old: { chats: Chat[]; nextCursor: string | null } | undefined) => {
          if (!old) return { chats: [tempChat], nextCursor: null };
          return { ...old, chats: [tempChat, ...old.chats] };
        }
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chats"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  // Rename chat
  const renameMutation = useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      updateChat(chatId, { title }),
    onMutate: async ({ chatId, title }) => {
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      const previous = queryClient.getQueryData(["chats"]);

      queryClient.setQueryData(
        ["chats"],
        (old: { chats: Chat[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            chats: old.chats.map((c) => (c.id === chatId ? { ...c, title } : c)),
          };
        }
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chats"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  // Delete chat
  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => deleteChat(chatId),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      const previous = queryClient.getQueryData(["chats"]);

      queryClient.setQueryData(
        ["chats"],
        (old: { chats: Chat[] } | undefined) => {
          if (!old) return old;
          return { ...old, chats: old.chats.filter((c) => c.id !== chatId) };
        }
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chats"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  // Archive chat
  const archiveMutation = useMutation({
    mutationFn: (chatId: string) =>
      updateChat(chatId, { archivedAt: new Date().toISOString() }),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      const previous = queryClient.getQueryData(["chats"]);

      queryClient.setQueryData(
        ["chats"],
        (old: { chats: Chat[] } | undefined) => {
          if (!old) return old;
          return { ...old, chats: old.chats.filter((c) => c.id !== chatId) };
        }
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chats"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const createNewChat = useCallback(
    (firstMessage?: string) => createMutation.mutateAsync(firstMessage),
    [createMutation]
  );

  const renameChat = useCallback(
    (chatId: string, title: string) =>
      renameMutation.mutateAsync({ chatId, title }),
    [renameMutation]
  );

  const deleteChatById = useCallback(
    (chatId: string) => deleteMutation.mutateAsync(chatId),
    [deleteMutation]
  );

  const archiveChat = useCallback(
    (chatId: string) => archiveMutation.mutateAsync(chatId),
    [archiveMutation]
  );

  return {
    chats: data?.chats || [],
    isLoading,
    isError,
    refetch,
    createNewChat,
    renameChat,
    deleteChatById,
    archiveChat,
  };
}
