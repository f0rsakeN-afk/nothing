/**
 * Webhook Handler Service
 * Processes Polar webhook events from queue
 *
 * This separates webhook reception (fast, must respond quickly)
 * from webhook processing (can be queued, retried on failure)
 */

import { SubscriptionStatus } from "@/src/generated/prisma/client";
import prisma from "@/lib/prisma";
import { invalidateUserLimitsCache } from "@/services/limit.service";
import { invalidateUserCreditsCache } from "@/services/credit.service";
import { publishCreditsUpdated } from "@/services/credit-pubsub.service";
import { logger } from "@/lib/logger";

/**
 * Map Polar subscription status to our enum
 */
function mapSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "canceled":
      return "CANCELED";
    case "past_due":
      return "PAST_DUE";
    case "trialing":
      return "TRIALING";
    case "unpaid":
      return "UNPAID";
    default:
      return "ACTIVE";
  }
}

/**
 * Extract userId from Polar event metadata
 */
function getUserIdFromEvent(data: Record<string, unknown>): string | null {
  const metadata = data.metadata as Record<string, string> | undefined;
  if (metadata?.userId) return metadata.userId;

  const organization = data.organization as { metadata?: Record<string, string> } | undefined;
  if (organization?.metadata?.userId) return organization.metadata.userId;

  if (metadata?.user_id) return metadata.user_id;

  return null;
}

/**
 * Handle Polar webhook event
 */
export async function handlePolarWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  logger.info(`[WebhookHandler] Processing ${eventType}`);

  switch (eventType) {
    case "order.paid":
      await handleOrderPaid(payload);
      break;

    case "subscription.created":
      await handleSubscriptionCreated(payload);
      break;

    case "subscription.updated":
      await handleSubscriptionUpdated(payload);
      break;

    case "subscription.canceled":
      await handleSubscriptionCanceled(payload);
      break;

    case "benefit_grant.cycled":
      await handleBenefitGrantCycled(payload);
      break;

    default:
      logger.info(`[WebhookHandler] Unhandled event type: ${eventType}`);
  }
}

/**
 * Handle credit package purchase
 */
async function handleOrderPaid(payload: Record<string, unknown>): Promise<void> {
  const userId = getUserIdFromEvent(payload);
  if (!userId) {
    logger.error("[WebhookHandler] No userId in order.paid event");
    return;
  }

  // Get credits from metadata
  const metadata = payload.metadata as Record<string, string> | undefined;
  const credits = parseInt(metadata?.credits || "0", 10);

  if (credits <= 0) {
    logger.error(`[WebhookHandler] Invalid credits in order.paid: ${credits}`);
    return;
  }

  // Add credits to user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    logger.error(`[WebhookHandler] User not found: ${userId}`);
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: { increment: credits },
    },
  });

  // Invalidate caches
  await invalidateUserCreditsCache(userId);
  await invalidateUserLimitsCache(userId);

  // Publish real-time update to subscribers
  publishCreditsUpdated(userId, "purchase").catch((err) => {
    logger.error("[WebhookHandler] Failed to publish credits update:", err);
  });

  logger.info(`[WebhookHandler] Added ${credits} credits to user ${userId}`);
}

/**
 * Handle new subscription
 */
async function handleSubscriptionCreated(payload: Record<string, unknown>): Promise<void> {
  const userId = getUserIdFromEvent(payload);
  if (!userId) {
    logger.error("[WebhookHandler] No userId in subscription.created");
    return;
  }

  const metadata = payload.metadata as Record<string, string> | undefined;
  const planId = metadata?.planId;

  if (!planId) {
    logger.error("[WebhookHandler] No planId in subscription.created");
    return;
  }

  // Get plan details
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    logger.error(`[WebhookHandler] Plan not found: ${planId}`);
    return;
  }

  // Find or create subscription
  const existingSub = await prisma.subscription.findUnique({
    where: { userId },
  });

  const status = mapSubscriptionStatus(
    (payload.status as string) || "active"
  );

  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

  const stripeSubId = (payload.id as string) || null;
  const stripeCustomerId = ((payload.customer || {}) as { id?: string })?.id || null;

  if (existingSub) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        planId,
        stripeSubId,
        stripeCustomerId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        canceledAt: null,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId,
        planId,
        stripeSubId,
        stripeCustomerId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
      },
    });
  }

  // Update user plan
  await prisma.user.update({
    where: { id: userId },
    data: {
      planId,
      planTier: plan.tier,
      credits: plan.credits,
      maxChats: plan.maxChats,
      maxProjects: plan.maxProjects,
      maxMessages: plan.maxMessages,
      features: plan.features,
    },
  });

  // Invalidate caches
  await invalidateUserCreditsCache(userId);
  await invalidateUserLimitsCache(userId);

  logger.info(`[WebhookHandler] Subscription created for user ${userId}, plan: ${planId}`);
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdated(payload: Record<string, unknown>): Promise<void> {
  const userId = getUserIdFromEvent(payload);
  if (!userId) {
    logger.error("[WebhookHandler] No userId in subscription.updated");
    return;
  }

  const stripeSubId = payload.id as string;
  if (!stripeSubId) {
    logger.error("[WebhookHandler] No subscription ID in subscription.updated");
    return;
  }

  // Find subscription by stripe ID
  const subscription = await prisma.subscription.findFirst({
    where: { OR: [{ stripeSubId }, { userId }] },
  });

  if (!subscription) {
    logger.error(`[WebhookHandler] Subscription not found for ${stripeSubId}`);
    return;
  }

  const status = mapSubscriptionStatus(
    (payload.status as string) || "active"
  );

  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      currentPeriodStart,
      currentPeriodEnd,
    },
  });

  // Invalidate caches
  await invalidateUserCreditsCache(userId);
  await invalidateUserLimitsCache(userId);

  logger.info(`[WebhookHandler] Subscription updated for user ${userId}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(payload: Record<string, unknown>): Promise<void> {
  const userId = getUserIdFromEvent(payload);
  if (!userId) {
    logger.error("[WebhookHandler] No userId in subscription.canceled");
    return;
  }

  const stripeSubId = payload.id as string;

  const updateData: Record<string, unknown> = {
    status: "CANCELED",
    canceledAt: new Date(),
  };

  if (stripeSubId) {
    await prisma.subscription.updateMany({
      where: { stripeSubId },
      data: updateData,
    });
  } else {
    await prisma.subscription.updateMany({
      where: { userId },
      data: updateData,
    });
  }

  // User keeps credits but loses subscription benefits
  // They stay on current plan until credits run out
  await invalidateUserCreditsCache(userId);
  await invalidateUserLimitsCache(userId);

  logger.info(`[WebhookHandler] Subscription canceled for user ${userId}`);
}

/**
 * Handle benefit grant (credits added on subscription cycle)
 */
async function handleBenefitGrantCycled(payload: Record<string, unknown>): Promise<void> {
  const userId = getUserIdFromEvent(payload);
  if (!userId) {
    logger.error("[WebhookHandler] No userId in benefit_grant.cycled");
    return;
  }

  // Get user's current plan and add credits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userPlan: true },
  });

  if (!user || !user.userPlan) {
    logger.error(`[WebhookHandler] User or plan not found: ${userId}`);
    return;
  }

  // Add credits from plan
  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: { increment: user.userPlan.credits },
    },
  });

  await invalidateUserCreditsCache(userId);

  // Publish real-time update to subscribers
  publishCreditsUpdated(userId, "subscription_cycle").catch((err) => {
    logger.error("[WebhookHandler] Failed to publish credits update:", err);
  });

  logger.info(`[WebhookHandler] Added ${user.userPlan.credits} credits for subscription cycle, user: ${userId}`);
}
