/**
 * Resumable Pub/Sub Service - Production Grade
 * Handles cross-container active stream tracking with TTL-based heartbeats
 * to prevent ghost streams from container crashes.
 *
 * Key fixes from v1:
 * 1. TTL heartbeats instead of permanent set entries
 * 2. Auto-expiration on crash (no ghost streams)
 * 3. Container ID tracking for debugging
 */

import redis from "@/lib/redis";
import os from "os";

const ACTIVE_STREAMS_KEY = "active:streams";
const HEARTBEAT_TTL_SECONDS = 30;
const HEARTBEAT_INTERVAL_MS = 10_000;

interface HeartbeatData {
  containerId: string;
  hostname: string;
  lastSeen: number;
}

let containerId: string | null = null;

function getContainerId(): string {
  if (!containerId) {
    containerId = `${os.hostname()}-${process.pid}-${Date.now()}`;
  }
  return containerId;
}

const heartbeatIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Track a stream as active with TTL-based heartbeat
 * The heartbeat auto-expires if we crash → no ghost streams
 */
export async function trackActiveStream(streamId: string): Promise<void> {
  try {
    const heartbeatKey = `stream:${streamId}:heartbeat`;
    const heartbeatData: HeartbeatData = {
      containerId: getContainerId(),
      hostname: os.hostname(),
      lastSeen: Date.now(),
    };

    // SET with EX (TTL) - auto-expires if we crash
    await redis.set(heartbeatKey, JSON.stringify(heartbeatData), {
      EX: HEARTBEAT_TTL_SECONDS,
    });

    // Also add to legacy set for backward compatibility
    await redis.sadd(ACTIVE_STREAMS_KEY, streamId);

    // Start heartbeat refresh interval
    if (!heartbeatIntervals.has(streamId)) {
      const intervalId = setInterval(() => {
        refreshHeartbeat(streamId).catch((err) => {
          console.error("[ResumablePubSub] Failed to refresh heartbeat:", err);
        });
      }, HEARTBEAT_INTERVAL_MS);
      heartbeatIntervals.set(streamId, intervalId);
    }
  } catch (error) {
    console.error("[ResumablePubSub] Failed to track active stream:", error);
  }
}

/**
 * Refresh heartbeat TTL (call periodically)
 */
async function refreshHeartbeat(streamId: string): Promise<void> {
  const heartbeatKey = `stream:${streamId}:heartbeat`;
  const heartbeatData: HeartbeatData = {
    containerId: getContainerId(),
    hostname: os.hostname(),
    lastSeen: Date.now(),
  };

  await redis.set(heartbeatKey, JSON.stringify(heartbeatData), {
    EX: HEARTBEAT_TTL_SECONDS,
  });
}

/**
 * Remove a stream from active tracking (graceful shutdown)
 */
export async function untrackActiveStream(streamId: string): Promise<void> {
  try {
    const heartbeatKey = `stream:${streamId}:heartbeat`;
    await redis.del(heartbeatKey);
    await redis.srem(ACTIVE_STREAMS_KEY, streamId);

    // Stop heartbeat interval
    const intervalId = heartbeatIntervals.get(streamId);
    if (intervalId) {
      clearInterval(intervalId);
      heartbeatIntervals.delete(streamId);
    }
  } catch (error) {
    console.error("[ResumablePubSub] Failed to untrack active stream:", error);
  }
}

/**
 * Check if a stream is alive by checking its heartbeat
 * Returns false if heartbeat expired (container crashed)
 */
export async function isStreamHeartbeatAlive(streamId: string): Promise<boolean> {
  const heartbeatKey = `stream:${streamId}:heartbeat`;
  const exists = await redis.exists(heartbeatKey);
  return exists === 1;
}

/**
 * Get heartbeat info for a stream
 */
export async function getStreamHeartbeatInfo(
  streamId: string
): Promise<{ alive: boolean; containerId?: string; lastSeen?: number }> {
  const heartbeatKey = `stream:${streamId}:heartbeat`;
  const data = await redis.get(heartbeatKey);

  if (!data) {
    return { alive: false };
  }

  try {
    const parsed: HeartbeatData = JSON.parse(data);
    return {
      alive: true,
      containerId: parsed.containerId,
      lastSeen: parsed.lastSeen,
    };
  } catch {
    return { alive: false };
  }
}

/**
 * Get all active streams across all containers
 * Filters out streams with expired heartbeats
 */
export async function getCrossContainerActiveStreams(): Promise<string[]> {
  try {
    // Get all streams from legacy set
    const candidates = await redis.smembers(ACTIVE_STREAMS_KEY);
    const aliveStreams: string[] = [];

    for (const streamId of candidates) {
      const isAlive = await isStreamHeartbeatAlive(streamId);
      if (isAlive) {
        aliveStreams.push(streamId);
      } else {
        // Clean up expired entry from set
        await redis.srem(ACTIVE_STREAMS_KEY, streamId);
      }
    }

    return aliveStreams;
  } catch (error) {
    console.error("[ResumablePubSub] Failed to get active streams:", error);
    return [];
  }
}

/**
 * Check if a stream is active across any container
 * Uses heartbeat check for accuracy
 */
export async function isStreamActiveCrossContainer(streamId: string): Promise<boolean> {
  return isStreamHeartbeatAlive(streamId);
}

/**
 * Clear all active stream tracking (use with caution)
 */
export async function clearAllActiveStreams(): Promise<void> {
  try {
    // Delete all heartbeat keys
    const heartbeatKeys = await redis.keys("stream:*:heartbeat");
    if (heartbeatKeys.length > 0) {
      await redis.del(...heartbeatKeys);
    }

    // Clear the set
    await redis.del(ACTIVE_STREAMS_KEY);

    // Clear all intervals
    for (const intervalId of heartbeatIntervals.values()) {
      clearInterval(intervalId);
    }
    heartbeatIntervals.clear();
  } catch (error) {
    console.error("[ResumablePubSub] Failed to clear active streams:", error);
  }
}

/**
 * Cleanup all heartbeats on shutdown
 */
export function cleanupAllHeartbeats(): void {
  for (const intervalId of heartbeatIntervals.values()) {
    clearInterval(intervalId);
  }
  heartbeatIntervals.clear();
}