/**
 * Chat API Client - Clean API calls separated from UI logic
 */

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  status: "running" | "completed" | "error";
  result?: unknown;
  error?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  chatId?: string; // Included so branch feature can access chatId from message
  searchResults?: SearchResult[]; // Web search results for AI response
  steps?: Array<{ step: string; status: string; message: string }>; // Progress steps
  toolResults?: ToolResult[]; // MCP tool execution results
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  messageCount: number;
  firstMessagePreview: string | null;
  parentChatId?: string | null;
  archivedAt?: string | null;
  pinnedAt?: string | null;
  visibility?: "public" | "private";
}

export interface ChatListResponse {
  chats: Chat[];
  nextCursor: string | null;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  prevCursor: string | null;
}

export interface SearchSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  content: string;
  image?: string;
  source: "stackoverflow" | "reddit" | "github" | "news" | "blog" | "other";
  score: number;
  savedAt: string;
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  topic: string;
}

export interface SearchResponse {
  sources: SearchSource[];
  suggestedQuestions: SuggestedQuestion[];
  query: string;
  totalResults: number;
}

// Chat CRUD
export async function getChats(limit = 50): Promise<ChatListResponse> {
  const res = await fetch(`/api/chats?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
}

export async function getArchivedChats(limit = 50): Promise<ChatListResponse> {
  const res = await fetch(`/api/chats?limit=${limit}&archived=true`);
  if (!res.ok) throw new Error("Failed to fetch archived chats");
  return res.json();
}

export async function getProjectChats(projectId: string, limit = 50): Promise<ChatListResponse> {
  const res = await fetch(`/api/chats?limit=${limit}&projectId=${projectId}`);
  if (!res.ok) throw new Error("Failed to fetch project chats");
  return res.json();
}

export async function getChat(chatId: string): Promise<Chat> {
  const res = await fetch(`/api/chats/${chatId}`);
  if (!res.ok) throw new Error("Failed to fetch chat");
  return res.json();
}

export async function createChat(firstMessage?: string): Promise<Chat> {
  const res = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstMessage }),
  });
  if (!res.ok) throw new Error("Failed to create chat");
  return res.json();
}

export async function updateChat(
  chatId: string,
  data: { title?: string; archivedAt?: string | null; projectId?: string | null; pinnedAt?: string | null }
): Promise<Chat> {
  const res = await fetch(`/api/chats/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update chat");
  return res.json();
}

export async function deleteChat(chatId: string): Promise<void> {
  const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete chat");
}

export async function archiveChat(chatId: string): Promise<Chat> {
  return updateChat(chatId, {
    archivedAt: new Date().toISOString(),
  });
}

export async function unarchiveChat(chatId: string): Promise<Chat> {
  return updateChat(chatId, {
    archivedAt: null,
  });
}

export async function pinChat(chatId: string): Promise<Chat> {
  return updateChat(chatId, {
    pinnedAt: new Date().toISOString(),
  });
}

export async function unpinChat(chatId: string): Promise<Chat> {
  return updateChat(chatId, {
    pinnedAt: null,
  });
}

export async function branchChat(
  chatId: string,
  messageId: string
): Promise<{ newChatId: string; branchTitle: string; messageCount: number }> {
  const res = await fetch(`/api/chats/${chatId}/branch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to branch chat" }));
    const err = new Error(error.error || "Failed to branch chat") as Error & { code?: string; message?: string; upgradeTo?: string };
    err.code = error.code;
    err.message = error.message;
    err.upgradeTo = error.upgradeTo;
    throw err;
  }
  return res.json();
}

// Share/Visibility
export async function updateChatVisibility(
  chatId: string,
  visibility: "public" | "private"
): Promise<{ success: boolean; visibility: string }> {
  const res = await fetch(`/api/chat/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility }),
  });
  if (!res.ok) throw new Error("Failed to update visibility");
  return res.json();
}

// Messages
export async function getMessages(
  chatId: string,
  options: { limit?: number; cursor?: string; direction?: "before" | "after" } = {}
): Promise<MessagesResponse> {
  const { limit = 30, cursor, direction = "before" } = options;
  let url = `/api/chats/${chatId}/messages?limit=${limit}&direction=${direction}`;
  if (cursor) url += `&cursor=${cursor}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function sendMessage(
  chatId: string,
  data: { role: "user" | "assistant"; content: string },
  fileIds?: string[]
): Promise<Message> {
  const res = await fetch(`/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, fileIds }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function generateTitle(chatId: string): Promise<{ title: string }> {
  const res = await fetch(`/api/chats/${chatId}/title`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to generate title");
  return res.json();
}

export async function searchWeb(
  query: string,
  userId?: string
): Promise<SearchResponse> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, userId }),
  });
  if (!res.ok) throw new Error("Failed to search");
  return res.json();
}

// Chat API (streaming)
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  engine?: string;
  publishedDate?: string;
  thumbnail?: string;
}

export interface StreamCallbacks {
  onChunk: (content: string, isResume?: boolean) => void;
  onComplete?: (fullResponse: string, isResume?: boolean) => void;
  onError?: (error: Error, isResume?: boolean) => void;
  onSearchComplete?: (results: SearchResult[]) => void;
  onStep?: (step: { step: string; status: string; message: string; results?: SearchResult[] }) => void;
  onResume?: () => void; // Called when stream was resumed from existing chunks
  onToolStart?: (toolName: string, toolCallId: string) => void;
  onToolComplete?: (toolName: string, toolCallId: string, result?: unknown, error?: string) => void;
}

export async function streamChat(
  chatId: string,
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  mode?: "chat" | "web",
  options?: { resume?: boolean; maxRetries?: number }
): Promise<string> {
  const { onChunk, onComplete, onError, onSearchComplete, onStep, onResume, onToolStart, onToolComplete } = callbacks;
  const maxRetries = options?.maxRetries ?? 2;
  let attempt = 0;

  const doFetch = async (isResume: boolean): Promise<{ res: Response; resumed: boolean }> => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, messages, mode, resume: isResume }),
      signal,
    });

    const resumed = res.headers.get("X-Stream-Resumed") === "true";
    return { res, resumed };
  };

  while (attempt <= maxRetries) {
    try {
      const { res, resumed } = await doFetch(attempt > 0);

      // If we successfully resumed, call onResume
      if (resumed && attempt > 0) {
        onResume?.();
      }

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        let errorData: { error: string; message?: string; required?: number; current?: number; upgradeTo?: string } = { error: "Request failed" };
        if (contentType?.includes("application/json")) {
          try {
            errorData = await res.json();
          } catch { /* ignore parse failure */ }
        }
        const err = new Error(errorData.error || `Request failed with status ${res.status}`) as Error & { code?: string; message?: string; required?: number; current?: number; upgradeTo?: string };
        err.code = "CREDIT_ERROR";
        err.message = errorData.message || `Insufficient credits. Required: ${errorData.required}, Current: ${errorData.current}`;
        err.required = errorData.required;
        err.current = errorData.current;
        err.upgradeTo = "Pro";
        throw err;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      if (resumed) {
        onResume?.();
        console.log("[streamChat] Stream resumed successfully");
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      // Throttle chunk updates for smooth rendering (~60fps)
      let pendingDeltas: string[] = [];
      let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
      const THROTTLE_MS = 16; // ~60fps

      const flushDeltas = () => {
        if (pendingDeltas.length > 0) {
          const combined = pendingDeltas.join("");
          onChunk(combined);
          pendingDeltas = [];
        }
        throttleTimeout = null;
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "step") {
              onStep?.({
                step: parsed.step,
                status: parsed.status,
                message: parsed.message,
                results: parsed.results,
              });
              if (parsed.step === "search" && parsed.status === "complete" && parsed.results) {
                onSearchComplete?.(parsed.results);
              }
              continue;
            }

            if (parsed.type === "tool_call") {
              onToolStart?.(parsed.toolName, parsed.toolCallId);
              continue;
            }

            if (parsed.type === "tool_result") {
              onToolComplete?.(parsed.toolName, parsed.toolCallId, parsed.result, parsed.error);
              continue;
            }

            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              pendingDeltas.push(delta);
              if (!throttleTimeout) {
                throttleTimeout = setTimeout(flushDeltas, THROTTLE_MS);
              }
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
        flushDeltas();
      }

      onComplete?.(accumulated);
      return accumulated;
    } catch (error) {
      // Check if it's an abort error (user cancelled)
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      attempt++;

      if (attempt <= maxRetries) {
        console.log(`[streamChat] Stream interrupted, retrying (${attempt}/${maxRetries})...`);
        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
      } else {
        const err = error instanceof Error ? error : new Error("Stream failed after retries");
        onError?.(err);
        throw err;
      }
    }
  }

  throw new Error("Stream failed");
}

/**
 * Stop a running stream (broadcasts to all processes)
 */
export async function stopStream(chatId: string): Promise<void> {
  try {
    await fetch("/api/chat", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId }),
    });
  } catch (error) {
    console.error("[stopStream] Failed to stop stream:", error);
  }
}
