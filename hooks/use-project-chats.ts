"use client";

import { useQuery } from "@tanstack/react-query";
import { getProjectChats } from "@/services/chat.service";
import type { ChatListResponse } from "@/services/chat.service";

export function useProjectChats(projectId: string) {
  return useQuery({
    queryKey: ["project-chats", projectId],
    queryFn: async (): Promise<ChatListResponse> => {
      return getProjectChats(projectId, 50);
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}
