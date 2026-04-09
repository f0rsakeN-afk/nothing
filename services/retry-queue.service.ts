/**
 * Retry Queue Service - Queue failed messages for retry with offline support
 */

export interface FailedMessage {
  id: string;
  chatId: string;
  content: string;
  timestamp: number;
  retryCount: number;
  status: "pending" | "retrying" | "failed";
}

const RETRY_STORAGE_KEY = "chat_retry_queue";
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 5000; // 5 seconds

// Load queue from localStorage
function loadQueue(): FailedMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RETRY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save queue to localStorage
function saveQueue(queue: FailedMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RETRY_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable
  }
}

export interface RetryQueueService {
  add: (chatId: string, content: string) => FailedMessage;
  remove: (id: string) => void;
  getAll: () => FailedMessage[];
  getByChatId: (chatId: string) => FailedMessage[];
  markRetrying: (id: string) => void;
  markFailed: (id: string) => void;
  incrementRetry: (id: string) => void;
  shouldRetry: (id: string) => boolean;
  clear: () => void;
}

export function createRetryQueueService(): RetryQueueService {
  let queue: FailedMessage[] = loadQueue();

  return {
    add(chatId: string, content: string): FailedMessage {
      const message: FailedMessage = {
        id: crypto.randomUUID(),
        chatId,
        content,
        timestamp: Date.now(),
        retryCount: 0,
        status: "pending",
      };
      queue.push(message);
      saveQueue(queue);
      return message;
    },

    remove(id: string): void {
      queue = queue.filter((m) => m.id !== id);
      saveQueue(queue);
    },

    getAll(): FailedMessage[] {
      return [...queue];
    },

    getByChatId(chatId: string): FailedMessage[] {
      return queue.filter((m) => m.chatId === chatId);
    },

    markRetrying(id: string): void {
      queue = queue.map((m) => (m.id === id ? { ...m, status: "retrying" as const } : m));
      saveQueue(queue);
    },

    markFailed(id: string): void {
      queue = queue.map((m) => (m.id === id ? { ...m, status: "failed" as const } : m));
      saveQueue(queue);
    },

    incrementRetry(id: string): void {
      queue = queue.map((m) =>
        m.id === id ? { ...m, retryCount: m.retryCount + 1 } : m
      );
      saveQueue(queue);
    },

    shouldRetry(id: string): boolean {
      const msg = queue.find((m) => m.id === id);
      return msg ? msg.retryCount < MAX_RETRIES : false;
    },

    clear(): void {
      queue = [];
      saveQueue(queue);
    },
  };
}

// Singleton instance
export const retryQueueService = createRetryQueueService();

// Auto-retry processor
let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

export function startRetryProcessor(
  onRetry: (message: FailedMessage) => Promise<void>
): void {
  const processQueue = async () => {
    const pending = retryQueueService.getAll().filter((m) => m.status === "pending");

    for (const message of pending) {
      if (!retryQueueService.shouldRetry(message.id)) {
        retryQueueService.markFailed(message.id);
        continue;
      }

      retryQueueService.markRetrying(message.id);

      try {
        await onRetry(message);
        retryQueueService.remove(message.id);
      } catch {
        retryQueueService.incrementRetry(message.id);
        if (retryQueueService.shouldRetry(message.id)) {
          retryQueueService.markFailed(message.id);
        }
      }
    }

    // Schedule next check
    retryTimeoutId = setTimeout(processQueue, RETRY_DELAY_MS);
  };

  // Initial check after short delay
  retryTimeoutId = setTimeout(processQueue, RETRY_DELAY_MS);
}

export function stopRetryProcessor(): void {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
}
