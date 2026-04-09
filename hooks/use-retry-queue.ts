"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  retryQueueService,
  startRetryProcessor,
  stopRetryProcessor,
  type FailedMessage,
} from "@/services/retry-queue.service";
import type { Message } from "@/services/chat.service";

interface UseRetryQueueResult {
  failedMessages: FailedMessage[];
  retryMessage: (id: string) => Promise<void>;
  dismissMessage: (id: string) => void;
  clearAllFailed: () => void;
  hasFailedMessages: boolean;
}

export function useRetryQueue(chatId: string): UseRetryQueueResult {
  const queryClient = useQueryClient();
  const [failedMessages, setFailedMessages] = useState<FailedMessage[]>([]);

  const loadFailedMessages = useCallback(() => {
    setFailedMessages(retryQueueService.getByChatId(chatId));
  }, [chatId]);

  useEffect(() => {
    loadFailedMessages();
    startRetryProcessor(async (message) => {
      // This would trigger a resend of the message
      // The actual retry logic is handled by the chat page
      console.log("Auto-retrying message:", message.id);
    });

    return () => {
      stopRetryProcessor();
    };
  }, [loadFailedMessages]);

  const retryMessage = useCallback(
    async (id: string) => {
      const message = failedMessages.find((m) => m.id === id);
      if (!message) return;

      retryQueueService.markRetrying(id);

      try {
        // Invalidate messages query to trigger refetch
        queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
        retryQueueService.remove(id);
        loadFailedMessages();
      } catch {
        retryQueueService.markFailed(id);
        loadFailedMessages();
      }
    },
    [failedMessages, chatId, queryClient, loadFailedMessages]
  );

  const dismissMessage = useCallback(
    (id: string) => {
      retryQueueService.remove(id);
      loadFailedMessages();
    },
    [loadFailedMessages]
  );

  const clearAllFailed = useCallback(() => {
    const allFailed = retryQueueService.getAll();
    allFailed.forEach((m) => retryQueueService.remove(m.id));
    loadFailedMessages();
  }, [loadFailedMessages]);

  return {
    failedMessages,
    retryMessage,
    dismissMessage,
    clearAllFailed,
    hasFailedMessages: failedMessages.length > 0,
  };
}

// Hook to record a failed message
export function useRecordFailedMessage() {
  const recordFailed = useCallback((chatId: string, content: string) => {
    return retryQueueService.add(chatId, content);
  }, []);

  return { recordFailed };
}
