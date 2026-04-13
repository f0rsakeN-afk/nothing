/**
 * Request Coalescing Service
 * Batches simultaneous identical requests into a single execution
 *
 * Problem: If 100 users request the same data simultaneously,
 * without coalescing: 100 database calls
 * with coalescing: 1 database call, 99 wait for result
 *
 * Use case: Expensive computations, slow external API calls, cached data with cache miss
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  abort: () => void;
}

/**
 * Simple in-memory request coalescing
 * Key = request identifier (e.g., "user:123:preferences")
 * Value = pending promise for that request
 */
const pendingRequests = new Map<string, PendingRequest<unknown>>();

/**
 * Execute or coalesce a request
 * If same key is already being fetched, returns that promise instead of starting new request
 */
export async function coalesceRequests<T>(
  key: string,
  requestFn: () => Promise<T>,
  options: {
    ttlMs?: number;      // Auto-cleanup after TTL (default: 5000ms)
    abortMs?: number;    // Abort waiting requests after timeout (default: 30000ms)
  } = {}
): Promise<T> {
  const { ttlMs = 5000, abortMs = 30000 } = options;

  // Check if there's already a pending request for this key
  const existing = pendingRequests.get(key) as PendingRequest<T> | undefined;
  if (existing) {
    return existing.promise;
  }

  // Create new pending request
  let abortCalled = false;
  const abort = () => {
    abortCalled = true;
    pendingRequests.delete(key);
  };

  const promise = new Promise<T>((resolve, reject) => {
    // Timeout to auto-cleanup
    const timeout = setTimeout(() => {
      if (pendingRequests.get(key)?.abort === abort) {
        pendingRequests.delete(key);
      }
    }, ttlMs);

    // Abort timeout
    const abortTimeout = setTimeout(() => {
      abortCalled = true;
      abort();
      reject(new Error(`Request coalescing timeout for key: ${key}`));
    }, abortMs);

    // Execute the actual request
    requestFn()
      .then((result) => {
        if (!abortCalled) {
          clearTimeout(timeout);
          clearTimeout(abortTimeout);
          pendingRequests.delete(key);
          resolve(result);
        }
      })
      .catch((error) => {
        if (!abortCalled) {
          clearTimeout(timeout);
          clearTimeout(abortTimeout);
          pendingRequests.delete(key);
          reject(error);
        }
      });
  });

  pendingRequests.set(key, { promise, abort });

  return promise;
}

/**
 * Prewarm a cache by executing request without waiting
 * Useful for prefetching expensive data
 */
export function prewarm<T>(
  key: string,
  requestFn: () => Promise<T>,
  options: { ttlMs?: number } = {}
): void {
  // Fire and forget, but will be coalesced if another request for same key comes in
  coalesceRequests(key, requestFn, options).catch(() => {
    // Ignore errors for prewarm
  });
}

/**
 * Invalidate a coalesced request (e.g., after data changes)
 * This will abort any pending request and remove from queue
 */
export function invalidateCoalesced(key: string): void {
  const pending = pendingRequests.get(key);
  if (pending) {
    pending.abort();
    pendingRequests.delete(key);
  }
}

/**
 * Invalidate all coalesced requests matching a prefix
 */
export function invalidateCoalescedPrefix(prefix: string): void {
  for (const key of pendingRequests.keys()) {
    if (key.startsWith(prefix)) {
      invalidateCoalesced(key);
    }
  }
}

/**
 * Get stats about pending coalesced requests (for monitoring)
 */
export function getCoalescingStats(): {
  pendingCount: number;
  pendingKeys: string[];
} {
  return {
    pendingCount: pendingRequests.size,
    pendingKeys: Array.from(pendingRequests.keys()),
  };
}
