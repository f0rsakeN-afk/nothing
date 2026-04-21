"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Message } from "@/services/chat.service";

export type UseAutoResumeParams = {
  chatId: string;
  initialMessages: Message[];
  autoResume: boolean;
};

interface AppendMessageData {
  type: "data-appendMessage";
  data: string;
}

export function useAutoResume({
  chatId,
  initialMessages,
  autoResume = true,
}: UseAutoResumeParams) {
  const queryClient = useQueryClient();
  const hasAttemptedAutoResumeRef = useRef(false);

  useEffect(() => {
    if (!autoResume) return;
    if (hasAttemptedAutoResumeRef.current) return;
    hasAttemptedAutoResumeRef.current = true;

    // Check if the most recent message is from user (meaning AI should be streaming)
    const mostRecentMessage = initialMessages[initialMessages.length - 1];

    if (mostRecentMessage?.role === "user") {
      // User message without AI response - try to resume or start stream
      console.log("[useAutoResume] User message without AI response, attempting resume");
      resumeAIStream(chatId, queryClient);
    }
  }, [autoResume, initialMessages, chatId, queryClient]);
}

async function resumeAIStream(chatId: string, queryClient: ReturnType<typeof useQueryClient>) {
  try {
    const response = await fetch(`/api/chats/${chatId}/ai-stream`);

    if (!response.ok || !response.body) {
      console.log("[useAutoResume] No stream to resume");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);

        if (data === "[DONE]") continue;

        try {
          const parsed: AppendMessageData = JSON.parse(data);

          if (parsed.type === "data-appendMessage") {
            const message: Message = JSON.parse(parsed.data);
            console.log("[useAutoResume] Restored message:", message.id);

            // Update React Query cache with the restored message
            queryClient.setQueryData(
              ["chat-messages", chatId],
              (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                if (!old) return old;

                // Avoid duplicates
                const page0 = old.pages[0];
                if (page0?.messages.some((m) => m.id === message.id)) {
                  return old;
                }

                return {
                  ...old,
                  pages: old.pages.map((page, i) =>
                    i === 0 ? { messages: [...(page.messages || []), message] } : page
                  ),
                };
              }
            );
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } catch (error) {
    console.error("[useAutoResume] Error resuming stream:", error);
  }
}
