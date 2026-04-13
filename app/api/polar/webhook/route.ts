/**
 * Polar Webhook API
 * POST /api/polar/webhook - Handle Polar webhook events
 *
 * Uses BullMQ queue for reliable async processing:
 * 1. Validate webhook signature
 * 2. Queue event for processing (returns 200 immediately)
 * 3. Worker processes event with retry logic
 *
 * @see https://polar.sh/docs/integrate/webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import { polarConfig } from "@/lib/polar-config";
import { queueWebhook } from "@/services/queue.service";
import { logger } from "@/lib/logger";

/**
 * Validate and parse Polar webhook event
 */
async function validateWebhookPayload(
  body: string,
  headers: Headers
): Promise<{ type: string; data: Record<string, unknown> } | null> {
  try {
    const signature = headers.get("polar-signature");
    const timestamp = headers.get("polar-timestamp");

    if (!signature || !timestamp) {
      logger.error("[Webhook] Missing Polar webhook signature or timestamp");
      return null;
    }

    const event = validateEvent(
      body,
      {
        "polar-signature": signature,
        "polar-timestamp": timestamp,
      },
      polarConfig.webhookSecret
    );

    return event as { type: string; data: Record<string, unknown> };
  } catch (err) {
    logger.error("[Webhook] Polar webhook validation failed", err as Error);
    return null;
  }
}

/**
 * Generate idempotency key from event
 * Prevents duplicate processing if Polar retries
 */
function generateIdempotencyKey(eventType: string, eventId: string): string {
  return `polar:${eventType}:${eventId}`;
}

/**
 * Main webhook handler
 * Validates webhook, queues for processing, returns immediately
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;

    // 1. Validate webhook
    const event = await validateWebhookPayload(body, headers);
    if (!event) {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }

    logger.info(`[Webhook] Received ${event.type}`);

    // 2. Generate idempotency key
    const eventId = (event.data.id as string) || `ts-${Date.now()}`;
    const idempotencyKey = generateIdempotencyKey(event.type, eventId);

    // 3. Queue event for async processing with retry
    // BullMQ will handle retries if processing fails
    await queueWebhook(event.type, event.data, idempotencyKey);

    logger.info(`[Webhook] Queued ${event.type} with key ${idempotencyKey}`);

    // 4. Return immediately - don't wait for processing
    return NextResponse.json({ received: true, queued: true });
  } catch (err) {
    logger.error("[Webhook] Failed to queue webhook", err as Error);
    return NextResponse.json(
      { error: "Failed to queue webhook" },
      { status: 500 }
    );
  }
}
