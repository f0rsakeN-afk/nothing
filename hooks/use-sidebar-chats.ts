"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getChats,
  getArchivedChats,
  createChat,
  updateChat,
  deleteChat,
  archiveChat,
  unarchiveChat,
  pinChat,
  unpinChat,
  branchChat,
  updateChatVisibility,
  type Chat,
} from "@/services/chat.service";

interface UseSidebarChatsResult {
  chats: Chat[];
  archivedChats: Chat[];
  sharedChats: Chat[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  refetchArchived: () => void;
  createNewChat: (firstMessage?: string) => Promise<Chat>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  deleteChatById: (chatId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string) => Promise<void>;
  unpinChat: (chatId: string) => Promise<void>;
  shareChat: (chatId: string, visibility: "public" | "private") => Promise<void>;
  branchChat: (chatId: string, messageId: string) => Promise<{ newChatId: string }>;
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
    queryFn: () => getChats(50, true),
    staleTime: 30 * 1000,
    retry: false,
  });

  const {
    data: archivedData,
    refetch: refetchArchived,
  } = useQuery({
    queryKey: ["chats", "archived"],
    queryFn: () => getArchivedChats(50),
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
    mutationFn: (chatId: string) => archiveChat(chatId),
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
      queryClient.invalidateQueries({ queryKey: ["chats", "archived"] });
    },
  });

  // Unarchive chat
  const unarchiveMutation = useMutation({
    mutationFn: (chatId: string) => unarchiveChat(chatId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["chats", "archived"] });
    },
  });

  // Share/Visibility chat
  const shareMutation = useMutation({
    mutationFn: ({ chatId, visibility }: { chatId: string; visibility: "public" | "private" }) =>
      updateChatVisibility(chatId, visibility),
    onMutate: async ({ chatId, visibility }) => {
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      const previous = queryClient.getQueryData(["chats"]);

      queryClient.setQueryData(
        ["chats"],
        (old: { chats: Chat[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            chats: old.chats.map((c) =>
              c.id === chatId ? { ...c, visibility } : c
            ),
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

  // Branch chat
  const branchMutation = useMutation({
    mutationFn: ({ chatId, messageId }: { chatId: string; messageId: string }) =>
      branchChat(chatId, messageId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  // Pin chat
  const pinMutation = useMutation({
    mutationFn: (chatId: string) => pinChat(chatId),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      const previous = queryClient.getQueryData(["chats"]);

      queryClient.setQueryData(
        ["chats"],
        (old: { chats: Chat[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            chats: old.chats.map((c) =>
              c.id === chatId ? { ...c, pinnedAt: new Date().toISOString() } : c
            ),
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

  // Unpin chat
  const unpinMutation = useMutation({
    mutationFn: (chatId: string) => unpinChat(chatId),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      const previous = queryClient.getQueryData(["chats"]);

      queryClient.setQueryData(
        ["chats"],
        (old: { chats: Chat[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            chats: old.chats.map((c) =>
              c.id === chatId ? { ...c, pinnedAt: null } : c
            ),
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

  const createNewChat = useCallback(
    (firstMessage?: string) => createMutation.mutateAsync(firstMessage),
    [createMutation]
  );

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      await renameMutation.mutateAsync({ chatId, title });
    },
    [renameMutation]
  );

  const deleteChatById = useCallback(
    async (chatId: string) => {
      await deleteMutation.mutateAsync(chatId);
    },
    [deleteMutation]
  );

  const archiveChatFn = useCallback(
    async (chatId: string) => {
      await archiveMutation.mutateAsync(chatId);
    },
    [archiveMutation]
  );

  const unarchiveChatFn = useCallback(
    async (chatId: string) => {
      await unarchiveMutation.mutateAsync(chatId);
    },
    [unarchiveMutation]
  );

  const shareChatFn = useCallback(
    async (chatId: string, visibility: "public" | "private") => {
      await shareMutation.mutateAsync({ chatId, visibility });
    },
    [shareMutation]
  );

  const branchChatFn = useCallback(
    (chatId: string, messageId: string) =>
      branchMutation.mutateAsync({ chatId, messageId }),
    [branchMutation]
  );

  const pinChatFn = useCallback(
    async (chatId: string) => {
      await pinMutation.mutateAsync(chatId);
    },
    [pinMutation]
  );

  const unpinChatFn = useCallback(
    async (chatId: string) => {
      await unpinMutation.mutateAsync(chatId);
    },
    [unpinMutation]
  );

  return {
    chats: (data?.chats || []).filter(c => !c.isShared),
    sharedChats: (data?.chats || []).filter(c => c.isShared),
    archivedChats: archivedData?.chats || [],
    isLoading,
    isError,
    refetch,
    refetchArchived,
    createNewChat,
    renameChat,
    deleteChatById,
    archiveChat: archiveChatFn,
    unarchiveChat: unarchiveChatFn,
    pinChat: pinChatFn,
    unpinChat: unpinChatFn,
    shareChat: shareChatFn,
    branchChat: branchChatFn,
  };
}
