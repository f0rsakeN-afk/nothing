"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getChatMembers,
  addChatMember,
  updateChatMemberRole,
  removeChatMember,
  type ChatMemberWithUser,
} from "@/services/collaboration.service";

export function useChatMembers(chatId: string | undefined) {
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ["chat", chatId, "members"],
    queryFn: () => getChatMembers(chatId!),
    enabled: !!chatId,
    staleTime: 30000, // 30 seconds
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role?: "VIEWER" | "EDITOR" }) =>
      addChatMember(chatId!, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId, "members"] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "VIEWER" | "EDITOR" | "OWNER" }) =>
      updateChatMemberRole(chatId!, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId, "members"] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeChatMember(chatId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId, "members"] });
    },
  });

  return {
    members: membersQuery.data ?? ([] as ChatMemberWithUser[]),
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
    addMember: addMemberMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    isAdding: addMemberMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
  };
}