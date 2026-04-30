/**
 * Webhook Handler Service
 * DEPRECATED: Polar webhooks are no longer used.
 * Payment confirmation is now handled directly via eSewa and Khalti success routes.
 *
 * This file is kept for backwards compatibility but handles no events.
 */

import { logger } from "@/lib/logger";

/**
 * Handle Polar webhook event - DEPRECATED
 * No-op since we no longer use Polar for payments
 */
export async function handlePolarWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  logger.info(`[WebhookHandler] Ignoring Polar event (deprecated): ${eventType}`);
}