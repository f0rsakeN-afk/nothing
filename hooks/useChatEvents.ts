"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Event types
type SidebarEvent =
  | { type: "connected" }
  | { type: "chat:created"; chat: { id: string; title: string; createdAt: string; updatedAt: string } }
  | { type: "chat:renamed"; chatId: string; title: string }
  | { type: "chat:deleted"; chatId: string }
  | { type: "chat:archived"; chatId: string; title: string };

/**
 * High-performance SSE subscription hook
 * Uses refs to avoid re-renders and direct queryClient updates
 */
export function useChatEvents() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const isUnmounted = useRef(false);

  // Memoized event handler to avoid recreation
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (isUnmounted.current) return;

      try {
        const data: SidebarEvent = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            reconnectAttempts.current = 0; // Reset on successful connection
            break;

          case "chat:created":
            queryClient.setQueryData(
              ["chats"],
              (old: { chats: Array<{ id: string; title: string; createdAt: string; updatedAt: string }>; nextCursor: string | null } | undefined) => {
                if (!old) return { chats: [data.chat], nextCursor: null };
                // Avoid duplicate
                if (old.chats.some((c) => c.id === data.chat.id)) return old;
                return { ...old, chats: [data.chat, ...old.chats] };
              }
            );
            break;

          case "chat:renamed":
            queryClient.setQueryData(
              ["chats"],
              (old: { chats: Array<{ id: string; title: string }> } | undefined) => {
                if (!old) {
                  queryClient.invalidateQueries({ queryKey: ["chats"] });
                  return old;
                }
                return {
                  ...old,
                  chats: old.chats.map((c) =>
                    c.id === data.chatId ? { ...c, title: data.title } : c
                  ),
                };
              }
            );
            break;

          case "chat:deleted":
          case "chat:archived":
            queryClient.setQueryData(
              ["chats"],
              (old: { chats: Array<{ id: string }> } | undefined) => {
                if (!old) return old;
                return {
                  ...old,
                  chats: old.chats.filter((c) => c.id !== data.chatId),
                };
              }
            );
            break;
        }
      } catch {
        // Silently ignore parse errors
      }
    },
    [queryClient]
  );

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (isUnmounted.current) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/chats/stream");
    eventSourceRef.current = eventSource;

    eventSource.onmessage = handleMessage;

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
  }, [handleMessage]);

  
  useEffect(() => {
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
