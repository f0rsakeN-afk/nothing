/**
 * Resumable Pub/Sub Service
 * Handles cross-container active stream tracking via Redis pub/sub
 */

import redis from "@/lib/redis";

const ACTIVE_STREAMS_KEY = "active:streams";

/**
 * Track a stream as active across all containers
 */
export async function trackActiveStream(streamId: string): Promise<void> {
  try {
    await redis.sadd(ACTIVE_STREAMS_KEY, streamId);
  } catch (error) {
    console.error("[ResumablePubSub] Failed to track active stream:", error);
  }
}

/**
 * Remove a stream from active tracking
 */
export async function untrackActiveStream(streamId: string): Promise<void> {
  try {
    await redis.srem(ACTIVE_STREAMS_KEY, streamId);
  } catch (error) {
    console.error("[ResumablePubSub] Failed to untrack active stream:", error);
  }
}

/**
 * Get all active streams across all containers
 */
export async function getCrossContainerActiveStreams(): Promise<string[]> {
  try {
    return await redis.smembers(ACTIVE_STREAMS_KEY);
  } catch (error) {
    console.error("[ResumablePubSub] Failed to get active streams:", error);
    return [];
  }
}

/**
 * Check if a stream is active across any container
 */
export async function isStreamActiveCrossContainer(streamId: string): Promise<boolean> {
  try {
    const result = await redis.sismember(ACTIVE_STREAMS_KEY, streamId);
    return result === 1;
  } catch (error) {
    console.error("[ResumablePubSub] Failed to check active stream:", error);
    return false;
  }
}

/**
 * Clear all active stream tracking (use with caution)
 */
export async function clearAllActiveStreams(): Promise<void> {
  try {
    await redis.del(ACTIVE_STREAMS_KEY);
  } catch (error) {
    console.error("[ResumablePubSub] Failed to clear active streams:", error);
  }
}
