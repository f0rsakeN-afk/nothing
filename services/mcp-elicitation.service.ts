/**
 * MCP Elicitation Service
 * Handles model elicitation requests (asking user for input mid-stream)
 * Uses Redis for cross-instance coordination
 */

import redis from "@/lib/redis";

type ElicitResult = { action: "accept" | "decline" | "cancel"; content?: Record<string, unknown> };

// Module-scope map of pending elicitation resolvers.
// Lives as long as the server process — works for both long-running and
// per-request (same process) serverless invocations.
export const pendingElicitations = new Map<string, (result: ElicitResult) => void>();

const ELICITATION_RESPONSE_KEY_PREFIX = "mcp:elicitation:response:";
const ELICITATION_PENDING_KEY_PREFIX = "mcp:elicitation:pending:";
const ELICITATION_TIMEOUT_MS = 5 * 60 * 1000;

function getElicitationResponseKey(elicitationId: string) {
  return `${ELICITATION_RESPONSE_KEY_PREFIX}${elicitationId}`;
}

function getElicitationPendingKey(elicitationId: string) {
  return `${ELICITATION_PENDING_KEY_PREFIX}${elicitationId}`;
}

/**
 * Wait for an elicitation response, with Redis polling for cross-instance coordination
 */
export function waitForElicitation(elicitationId: string): Promise<ElicitResult> {
  return new Promise<ElicitResult>((resolve) => {
    const responseKey = getElicitationResponseKey(elicitationId);
    const pendingKey = getElicitationPendingKey(elicitationId);
    let interval: ReturnType<typeof setInterval> | null = null;
    let settled = false;

    const settle = (result: ElicitResult) => {
      if (settled) return;
      settled = true;
      if (interval) clearInterval(interval);
      pendingElicitations.delete(elicitationId);
      resolve(result);
    };

    pendingElicitations.set(elicitationId, (result) => {
      settle(result);
    });

    // Mark as pending so responders can validate/diagnose lifecycle.
    void redis.set(pendingKey, "1", "EX", Math.ceil(ELICITATION_TIMEOUT_MS / 1000) + 60);

    const pollRedis = async () => {
      try {
        const persisted = await redis.get<string>(responseKey);
        if (!persisted) return;
        const result = JSON.parse(persisted) as ElicitResult;
        await redis.del(responseKey);
        settle(result);
      } catch {
        // Ignore transient Redis issues; in-process resolver may still complete.
      }
    };

    interval = setInterval(() => {
      void pollRedis();
    }, 500);
    void pollRedis();
  });
}
