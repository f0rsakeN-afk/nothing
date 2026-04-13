"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Message } from "@/services/chat.service";

// Event types for chat message stream
type ChatStreamEvent =
  | { type: "connected"; chatId: string }
  | { type: "chat:message:new"; chatId: string; message: { id: string; role: string; content: string; createdAt: string } };

interface UseChatStreamOptions {
  chatId: string;
  /** Called when a new message arrives from another device */
  onNewMessage?: (message: Message) => void;
}

/**
 * Subscribe to real-time message updates for a specific chat
 * Use this when viewing a chat to receive messages from other devices
 *
 * Note: This does NOT receive your own messages - those are handled locally
 * through the streaming response. This is only for cross-device sync.
 */
export function useChatStream({ chatId, onNewMessage }: UseChatStreamOptions) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const isUnmounted = useRef(false);

  const connect = useCallback(() => {
    if (isUnmounted.current || !chatId) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/chats/${chatId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onerror = () => {
      if (isUnmounted.current) return;

      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmounted.current) {
          connect();
        }
      }, delay);
    };

    // Handle incoming messages
    eventSource.addEventListener("chat:message:new", (e) => {
      if (isUnmounted.current) return;

      try {
        const data: ChatStreamEvent = JSON.parse(e.data);
        if (data.type !== "chat:message:new") return;

        const message: Message = {
          id: data.message.id,
          role: data.message.role as "user" | "assistant",
          content: data.message.content,
          createdAt: data.message.createdAt,
        };

        // Update React Query cache
        queryClient.setQueryData(
          ["chat-messages", chatId],
          (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
            if (!old) return old;

            // Avoid duplicate
            const page0 = old.pages[0];
            if (page0?.messages.some((m) => m.id === message.id)) {
              return old;
            }

            return {
              ...old,
              pages: old.pages.map((page, i) =>
                i === 0
                  ? { messages: [...(page.messages || []), message] }
                  : page
              ),
            };
          }
        );

        // Call optional callback
        onNewMessage?.(message);
      } catch {
        // Silently ignore parse errors
      }
    });

    eventSource.addEventListener("connected", () => {
      reconnectAttempts.current = 0;
    });
  }, [chatId, queryClient, onNewMessage]);

  useEffect(() => {
    if (!chatId) return;

    isUnmounted.current = false;
    connect();

    return () => {
      isUnmounted.current = true;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);
}