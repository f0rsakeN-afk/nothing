import { NextRequest } from "next/server";
import { validateAuth } from "@/lib/auth";
import { pendingElicitations } from "@/services/mcp-elicitation.service";
import redis from "@/lib/redis";
import { z } from "zod";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";

const ELICITATION_RESPONSE_KEY_PREFIX = "mcp:elicitation:response:";
const ELICITATION_PENDING_KEY_PREFIX = "mcp:elicitation:pending:";
const ELICITATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function getElicitationResponseKey(elicitationId: string) {
  return `${ELICITATION_RESPONSE_KEY_PREFIX}${elicitationId}`;
}

function getElicitationPendingKey(elicitationId: string) {
  return `${ELICITATION_PENDING_KEY_PREFIX}${elicitationId}`;
}

const respondSchema = z.object({
  elicitationId: z.string().min(1),
  action: z.enum(["accept", "decline", "cancel"]),
  content: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = respondSchema.parse(await request.json());

    // First, check if there's an in-process resolver
    const resolver = pendingElicitations.get(input.elicitationId);

    const responsePayload = {
      action: input.action,
      content: input.content,
    };

    // Always persist response so waiting callback can pick it up cross-instance.
    // Using ioredis API (same operations as @upstash/redis)
    await redis.set(
      getElicitationResponseKey(input.elicitationId),
      JSON.stringify(responsePayload),
      "EX",
      Math.ceil(ELICITATION_TIMEOUT_MS / 1000) + 60
    );

    if (resolver) {
      resolver(responsePayload);
      return Response.json({ ok: true });
    }

    // Check if still pending in Redis
    const stillPending = await redis.exists(getElicitationPendingKey(input.elicitationId));
    if (stillPending) return Response.json({ ok: true, accepted: true });

    return Response.json(
      { ok: false, error: "Elicitation not found or already resolved" },
      { status: 404 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[Elicitation] Respond error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
