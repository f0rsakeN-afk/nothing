/**
 * Chat API Client - Clean API calls separated from UI logic
 */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  messageCount: number;
  firstMessagePreview: string | null;
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
  data: { title?: string; archivedAt?: string }
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
  data: { role: "user" | "assistant"; content: string }
): Promise<Message> {
  const res = await fetch(`/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
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
export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export async function streamChat(
  chatId: string,
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  mode?: "chat" | "web",
  performWebSearch?: boolean
): Promise<string> {
  const { onChunk, onComplete, onError } = callbacks;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, messages, mode, performWebSearch }),
      signal,
    });

    if (!res.ok) {
      console.error("[streamChat] response not ok:", res.status, res.statusText);
      throw new Error("Failed to get response");
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let accumulated = "";

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
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            onChunk(delta);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    onComplete?.(accumulated);
    return accumulated;
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Stream failed");
    onError?.(err);
    throw err;
  }
}
