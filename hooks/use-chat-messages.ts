"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useMemo } from "react";
import * as React from "react";
import type { Message } from "@/services/chat.service";
import { getMessages, sendMessage, streamChat, stopStream } from "@/services/chat.service";
import { retryQueueService } from "@/services/retry-queue.service";

interface UseChatMessagesOptions {
  chatId: string;
  initialQuery?: string;
  skipFirstMessage?: boolean; // true when chat was created via /api/chats with firstMessage
}

interface UseChatMessagesResult {
  messages: Message[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasOlder: boolean;
  isFetchingOlder: boolean;
  refetch: () => void;
  sendUserMessage: (content: string, mode?: "chat" | "web", fileIds?: string[]) => Promise<void>;
  loadOlder: () => void;
  abortCurrentMessage: () => void;
  isStreaming: boolean;
}

export function useChatMessages({
  chatId,
  initialQuery,
  skipFirstMessage = false,
}: UseChatMessagesOptions): UseChatMessagesResult {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);

  // Seed message from query param
  const seedMessage = useMemo<Message | null>(
    () =>
      initialQuery
        ? { id: `seed-${Date.now()}`, role: "user", content: initialQuery }
        : null,
    [initialQuery]
  );

  // Infinite query for messages
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["chat-messages", chatId],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: async ({ pageParam }) => {
      return getMessages(chatId, {
        limit: 30,
        cursor: pageParam,
        direction: "before",
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!chatId,
  });

  // Flatten all pages into messages array with deduplication
  // API returns newest first (desc order for "before" pagination)
  // Page 0 = newest, Page N = oldest
  // We want output: oldest-first (for chat display where newest at bottom)
  const messages = useMemo(() => {
    const seenIds = new Set<string>();
    const allMessages: Message[] = [];

    // Process pages in reverse order (oldest first) so we append in correct position
    // [...data?.pages].reverse() creates a copy and reverses it
    const reversedPages = [...(data?.pages || [])].reverse();

    reversedPages.forEach((page) => {
      page.messages.forEach((m) => {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          allMessages.push(m);
        }
      });
    });

    // If query has messages, use them (seed should not show once saved)
    if (allMessages.length > 0) {
      return allMessages;
    }

    // Only show seed if query returned nothing
    if (seedMessage) {
      return [seedMessage];
    }

    return allMessages;
  }, [data, seedMessage]);

  // Send user message and get AI response
  const sendUserMessage = useCallback(
    async (content: string, mode: "chat" | "web" = "chat", fileIds?: string[]) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      isStreamingRef.current = true;

      const aiMsgId = crypto.randomUUID();

      // Get cached query data to check if messages exist
      const cachedData = queryClient.getQueryData<{ pages: Array<{ messages: Message[] }> }>(["chat-messages", chatId]);
      // Check if there are any messages in cache (excluding seed which isn't in query cache)
      const hasMessagesInCache = cachedData?.pages?.some(page => page.messages.length > 0);
      const isFirstMessage = !hasMessagesInCache && !skipFirstMessage;

      if (skipFirstMessage) {
        // Message was already saved via /api/chats - add AI placeholder and stream response
        console.debug("[sendUserMessage] skipFirstMessage=true, streaming AI response");

        queryClient.setQueryData(
          ["chat-messages", chatId],
          (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page, i) =>
                i === 0
                  ? { messages: [...(page.messages || []), { id: aiMsgId, role: "assistant", content: "", isStreaming: true }] }
                  : page
              ),
            };
          }
        );

        try {
          await streamChat(
            chatId,
            [{ role: "user" as const, content }],
            {
              onChunk: (delta) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, content: m.content + delta } : m
                        ),
                      })),
                    };
                  }
                );
              },
              onComplete: () => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, isStreaming: false } : m
                        ),
                      })),
                    };
                  }
                );
                queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
              },
              onSearchComplete: (results) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, searchResults: results } : m
                        ),
                      })),
                    };
                  }
                );
              },
              onStep: (step) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) => {
                          if (m.id !== aiMsgId) return m;
                          const steps = m.steps ? [...m.steps] : [];
                          const existingIdx = steps.findIndex((s) => s.step === step.step);
                          if (existingIdx >= 0) {
                            steps[existingIdx] = step;
                          } else {
                            steps.push(step);
                          }
                          return { ...m, steps };
                        }),
                      })),
                    };
                  }
                );
              },
              onToolStart: (toolName, toolCallId) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) => {
                          if (m.id !== aiMsgId) return m;
                          const existingResults = m.toolResults || [];
                          // Avoid duplicates if same toolCallId fires twice
                          if (existingResults.some((r: unknown) => (r as { toolCallId?: string }).toolCallId === toolCallId)) return m;
                          return {
                            ...m,
                            toolResults: [
                              ...existingResults,
                              { toolCallId, toolName, status: "running" as const },
                            ],
                          };
                        }),
                      })),
                    };
                  }
                );
              },
              onToolComplete: (toolName, toolCallId, result, error) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) => {
                          if (m.id !== aiMsgId) return m;
                          const toolResults = m.toolResults || [];
                          return {
                            ...m,
                            toolResults: toolResults.map((r: unknown) =>
                              r.toolCallId === toolCallId
                                ? { ...r, status: error ? ("error" as const) : ("completed" as const), result, error }
                                : r
                            ),
                          };
                        }),
                      })),
                    };
                  }
                );
              },
            },
            abortControllerRef.current.signal,
            mode
          );
        } catch (err) {
          console.error("[sendUserMessage] error:", err);
          isStreamingRef.current = false;
          abortControllerRef.current = null;
          throw err;
        }
      } else if (isFirstMessage) {
        // FIRST MESSAGE: Save to DB, let query naturally show saved message.
        // The AI placeholder is added via setQueryData and persists separately.
        // We DON'T invalidate - let the query show real data when it fetches.
        try {
          const savedUserMsg = await sendMessage(chatId, { role: "user", content }, fileIds);

          // Build API messages - send savedUserMsg for AI context
          // Server fetches recentMessages from DB (empty for new chat)
          // So AI gets the message only once via incomingMessages
          const apiMessages = [savedUserMsg].map(({ role, content }) => ({
            role,
            content,
          }));

          // Add AI placeholder to cache - this persists via onChunk/onComplete
          // It won't be overwritten by query refetch because query data flows into
          // useMemo separately from our direct setQueryData updates
          queryClient.setQueryData(
            ["chat-messages", chatId],
            (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
              if (!old) {
                return {
                  pages: [{ messages: [savedUserMsg, { id: aiMsgId, role: "assistant", content: "", isStreaming: true }], nextCursor: null, prevCursor: null }],
                };
              }
              return {
                ...old,
                pages: old.pages.map((page, i) =>
                  i === 0
                    ? { messages: [...(page.messages || []), savedUserMsg, { id: aiMsgId, role: "assistant", content: "", isStreaming: true }] }
                    : page
                ),
              };
            }
          );

          await streamChat(
            chatId,
            apiMessages,
            {
              onChunk: (delta) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, content: m.content + delta } : m
                        ),
                      })),
                    };
                  }
                );
              },
              onComplete: () => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, isStreaming: false } : m
                        ),
                      })),
                    };
                  }
                );
                // Only after streaming completes, sync with server
                queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
              },
              onSearchComplete: (results) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, searchResults: results } : m
                        ),
                      })),
                    };
                  }
                );
              },
              onStep: (step) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) => {
                          if (m.id !== aiMsgId) return m;
                          const steps = m.steps ? [...m.steps] : [];
                          const existingIdx = steps.findIndex((s) => s.step === step.step);
                          if (existingIdx >= 0) {
                            steps[existingIdx] = step;
                          } else {
                            steps.push(step);
                          }
                          return { ...m, steps };
                        }),
                      })),
                    };
                  }
                );
              },
              onToolStart: (toolName, toolCallId) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) => {
                          if (m.id !== aiMsgId) return m;
                          const existingResults = m.toolResults || [];
                          // Avoid duplicates if same toolCallId fires twice
                          if (existingResults.some((r: unknown) => (r as { toolCallId?: string }).toolCallId === toolCallId)) return m;
                          return {
                            ...m,
                            toolResults: [
                              ...existingResults,
                              { toolCallId, toolName, status: "running" as const },
                            ],
                          };
                        }),
                      })),
                    };
                  }
                );
              },
              onToolComplete: (toolName, toolCallId, result, error) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) => {
                          if (m.id !== aiMsgId) return m;
                          const toolResults = m.toolResults || [];
                          return {
                            ...m,
                            toolResults: toolResults.map((r: unknown) =>
                              r.toolCallId === toolCallId
                                ? { ...r, status: error ? ("error" as const) : ("completed" as const), result, error }
                                : r
                            ),
                          };
                        }),
                      })),
                    };
                  }
                );
              },
            },
            abortControllerRef.current.signal,
            mode
          );
        } catch (err) {
          console.error("[sendUserMessage] error:", err);
          isStreamingRef.current = false;
          abortControllerRef.current = null;
          throw err;
        }
      } else {
        // SUBSEQUENT MESSAGES: Use optimistic update
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: "user",
          content,
        };

        queryClient.setQueryData(
          ["chat-messages", chatId],
          (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page, i) =>
                i === 0
                  ? { messages: [...(page.messages || []), userMsg, { id: aiMsgId, role: "assistant", content: "", isStreaming: true }] }
                  : page
              ),
            };
          }
        );

        try {
          const savedUserMsg = await sendMessage(chatId, { role: "user", content }, fileIds);

          // Replace optimistic with saved
          queryClient.setQueryData(
            ["chat-messages", chatId],
            (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((m) =>
                    m.id === userMsg.id ? savedUserMsg : m
                  ),
                })),
              };
            }
          );

          // For subsequent messages: server fetches history from DB via getRecentMessages
          // We send the user's message so the model has context if needed
          const apiMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

          // If this is the first message being sent to a new chat, include it
          // Otherwise the server will fetch history from DB
          if (messages.length === 0) {
            apiMessages.push({ role: "user", content });
          }

          await streamChat(
            chatId,
            apiMessages,
            {
              onChunk: (delta) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, content: m.content + delta } : m
                        ),
                      })),
                    };
                  }
                );
              },
              onComplete: () => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, isStreaming: false } : m
                        ),
                      })),
                    };
                  }
                );
                queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
              },
              onSearchComplete: (results) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, searchResults: results } : m
                        ),
                      })),
                    };
                  }
                );
              },
              onStep: (step) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) => {
                          if (m.id !== aiMsgId) return m;
                          const steps = m.steps ? [...m.steps] : [];
                          const existingIdx = steps.findIndex((s) => s.step === step.step);
                          if (existingIdx >= 0) {
                            steps[existingIdx] = step;
                          } else {
                            steps.push(step);
                          }
                          return { ...m, steps };
                        }),
                      })),
                    };
                  }
                );
              },
              onToolStart: (toolName, toolCallId) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) => {
                          if (m.id !== aiMsgId) return m;
                          const existingResults = m.toolResults || [];
                          // Avoid duplicates if same toolCallId fires twice
                          if (existingResults.some((r: unknown) => (r as { toolCallId?: string }).toolCallId === toolCallId)) return m;
                          return {
                            ...m,
                            toolResults: [
                              ...existingResults,
                              { toolCallId, toolName, status: "running" as const },
                            ],
                          };
                        }),
                      })),
                    };
                  }
                );
              },
              onToolComplete: (toolName, toolCallId, result, error) => {
                queryClient.setQueryData(
                  ["chat-messages", chatId],
                  (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map((page) => ({
                        ...page,
                        messages: page.messages.map((m) => {
                          if (m.id !== aiMsgId) return m;
                          const toolResults = m.toolResults || [];
                          return {
                            ...m,
                            toolResults: toolResults.map((r: unknown) =>
                              r.toolCallId === toolCallId
                                ? { ...r, status: error ? ("error" as const) : ("completed" as const), result, error }
                                : r
                            ),
                          };
                        }),
                      })),
                    };
                  }
                );
              },
            },
            abortControllerRef.current.signal,
            mode
          );
        } catch (err) {
          console.error("[sendUserMessage] error:", err);
          // Remove optimistic on error
          queryClient.setQueryData(
            ["chat-messages", chatId],
            (old: { pages: Array<{ messages: Message[] }> } | undefined) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  messages: page.messages.filter((m) => m.id !== userMsg.id && m.id !== aiMsgId),
                })),
              };
            }
          );
          isStreamingRef.current = false;
          abortControllerRef.current = null;
          throw err;
        }
      }

      isStreamingRef.current = false;
      abortControllerRef.current = null;
    },
    [chatId, queryClient]
  );

  const abortCurrentMessage = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      isStreamingRef.current = false;
    }
    // Broadcast stop to all processes via Redis pub/sub
    stopStream(chatId);
  }, [chatId]);

  const loadOlder = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Cleanup
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    messages,
    isLoading,
    isError,
    error: error as Error | null,
    hasOlder: hasNextPage || false,
    isFetchingOlder: isFetchingNextPage,
    refetch,
    sendUserMessage,
    loadOlder,
    abortCurrentMessage,
    isStreaming: isStreamingRef.current,
  };
}
