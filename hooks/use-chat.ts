"use client";

import { useQuery } from "@tanstack/react-query";
import { getChat } from "@/services/chat.service";

export function useChat(chatId: string | undefined) {
  return useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      if (!chatId) throw new Error("Chat ID required");
      return getChat(chatId);
    },
    enabled: !!chatId,
  });
}
