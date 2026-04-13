/**
 * Polar Webhook API
 * POST /api/polar/webhook - Handle Polar webhook events
 * Handles subscription creation, updates, cancellations, and credit purchases
 *
 * @see https://polar.sh/docs/integrate/webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { polarConfig } from "@/lib/polar-config";
import { SubscriptionStatus } from "@/src/generated/prisma/client";
import prisma from "@/lib/prisma";
import { invalidateUserLimitsCache } from "@/services/limit.service";

const polar = new Polar({
  accessToken: polarConfig.accessToken,
  server: polarConfig.server,
});

/**
 * Validate and parse Polar webhook event
 * @see https://polar.sh/docs/integrate/webhooks/delivery
 */
async function validateWebhook(
  body: string,
  headers: Headers
): Promise<{ type: string; data: Record<string, unknown> } | null> {
  try {
    // Polar SDK webhook validation
    const { validateEvent } = await import("@polar-sh/sdk/webhooks");
    const signature = headers.get("polar-signature");
    const timestamp = headers.get("polar-timestamp");

    if (!signature || !timestamp) {
      console.error("Missing Polar webhook signature or timestamp");
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
  } catch (error) {
    console.error("Polar webhook validation failed:", error);
    return null;
  }
}

/**
 * Map Polar subscription status to our SubscriptionStatus enum
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
  // Check metadata for userId
  const metadata = data.metadata as Record<string, string> | undefined;
  if (metadata?.userId) {
    return metadata.userId;
  }

  // Check customer organization for userId
  const organization = data.organization as { metadata?: Record<string, string> } | undefined;
  if (organization?.metadata?.userId) {
    return organization.metadata.userId;
  }

  // Check custom metadata
  if (metadata?.user_id) {
    return metadata.user_id;
  }

  return null;
}

/**
 * Handle checkout.created event
 */
async function handleCheckoutCreated(data: Record<string, unknown>) {
  const checkout = data as {
    id: string;
    customerId: string;
    productId: string;
    amount: number;
    currency: string;
    status: string;
    metadata?: Record<string, string>;
  };

  console.log(`Checkout created: ${checkout.id}`);
  return { success: true };
}

/**
 * Handle order.paid event - This is where credits/subscription are activated
 */
async function handleOrderPaid(data: Record<string, unknown>) {
  const order = data as {
    id: string;
    customerId: string;
    productId: string;
    amount: number;
    currency: string;
    status: string;
    metadata?: Record<string, string>;
  };

  console.log(`Order paid: ${order.id}`);

  const userId = getUserIdFromEvent(order);
  if (!userId) {
    console.error("No userId in order metadata");
    return { success: false, error: "No userId" };
  }

  // Determine if credit package or subscription
  const isCreditPackage = order.metadata?.type === "credit_package";

  if (isCreditPackage) {
    const credits = parseInt(order.metadata?.credits || "0", 10);
    if (credits > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
      });
      console.log(`Added ${credits} credits to user ${userId}`);
    }
  } else {
    const planId = order.metadata?.planId;
    if (planId) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (plan) {
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            planId,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          update: {
            planId,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: {
            planTier: plan.tier,
            planId: plan.id,
            credits: { increment: plan.credits },
            maxChats: plan.maxChats,
            maxProjects: plan.maxProjects,
            maxMessages: plan.maxMessages,
            features: plan.features,
          },
        });

        await invalidateUserLimitsCache(userId);
        console.log(`Subscription activated for user ${userId}, plan ${planId}`);
      }
    }
  }

  return { success: true };
}

/**
 * Handle order.refunded event
 */
async function handleOrderRefunded(data: Record<string, unknown>) {
  const order = data as {
    id: string;
    customerId: string;
    productId: string;
    amount: number;
    metadata?: Record<string, string>;
  };

  console.log(`Order refunded: ${order.id}`);
  return { success: true };
}

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(data: Record<string, unknown>) {
  const subscription = data as {
    id: string;
    customerId: string;
    productId: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    metadata?: Record<string, string>;
  };

  console.log(`Subscription created: ${subscription.id}`);

  const userId = getUserIdFromEvent(subscription);
  if (!userId) {
    console.error("No userId in subscription metadata");
    return { success: false, error: "No userId" };
  }

  const planId = subscription.metadata?.planId;
  if (!planId) {
    console.error("No planId in subscription metadata");
    return { success: false, error: "No planId" };
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    console.error(`Plan not found: ${planId}`);
    return { success: false, error: "Plan not found" };
  }

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planId,
      status: mapSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.currentPeriodStart * 1000),
      currentPeriodEnd: new Date(subscription.currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
    update: {
      planId,
      status: mapSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.currentPeriodStart * 1000),
      currentPeriodEnd: new Date(subscription.currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier: plan.tier,
      planId: plan.id,
      features: plan.features,
    },
  });

  await invalidateUserLimitsCache(userId);
  return { success: true };
}

/**
 * Handle subscription.active event
 */
async function handleSubscriptionActive(data: Record<string, unknown>) {
  const subscription = data as {
    id: string;
    customerId: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    metadata?: Record<string, string>;
  };

  console.log(`Subscription active: ${subscription.id}`);

  await prisma.subscription.updateMany({
    where: { userId: getUserIdFromEvent(subscription) },
    data: {
      status: "ACTIVE",
      currentPeriodStart: new Date(subscription.currentPeriodStart * 1000),
      currentPeriodEnd: new Date(subscription.currentPeriodEnd * 1000),
    },
  });

  return { success: true };
}

/**
 * Handle subscription.canceled event
 */
async function handleSubscriptionCanceled(data: Record<string, unknown>) {
  const subscription = data as {
    id: string;
    customerId: string;
    status: string;
    canceledAt?: number;
    metadata?: Record<string, string>;
  };

  console.log(`Subscription canceled: ${subscription.id}`);

  const userId = getUserIdFromEvent(subscription);
  if (!userId) {
    console.error("No userId in subscription metadata");
    return { success: false, error: "No userId" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, features: true },
  });

  const remainingCredits = user?.credits || 0;

  await prisma.subscription.updateMany({
    where: { userId },
    data: {
      status: "CANCELED",
      canceledAt: subscription.canceledAt ? new Date(subscription.canceledAt * 1000) : new Date(),
    },
  });

  const freePlan = await prisma.plan.findUnique({ where: { id: "free" } });

  if (freePlan) {
    const keepFeatures = remainingCredits > 0;

    await prisma.user.update({
      where: { id: userId },
      data: {
        planTier: "FREE",
        planId: null,
        credits: remainingCredits,
        maxChats: freePlan.maxChats,
        maxProjects: freePlan.maxProjects,
        maxMessages: freePlan.maxMessages,
        features: keepFeatures ? user?.features || freePlan.features : freePlan.features,
      },
    });

    await invalidateUserLimitsCache(userId);
  }

  return { success: true };
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(data: Record<string, unknown>) {
  const subscription = data as {
    id: string;
    customerId: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    metadata?: Record<string, string>;
  };

  console.log(`Subscription updated: ${subscription.id}`);

  await prisma.subscription.updateMany({
    where: { userId: getUserIdFromEvent(subscription) },
    data: {
      status: mapSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.currentPeriodStart * 1000),
      currentPeriodEnd: new Date(subscription.currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
  });

  return { success: true };
}

/**
 * Handle subscription.uncanceled event
 */
async function handleSubscriptionUncanceled(data: Record<string, unknown>) {
  const subscription = data as {
    id: string;
    customerId: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    metadata?: Record<string, string>;
  };

  console.log(`Subscription uncanceled: ${subscription.id}`);

  const userId = getUserIdFromEvent(subscription);
  if (!userId) return { success: false };

  const existingSub = await prisma.subscription.findFirst({
    where: { userId },
    include: { plan: true },
  });

  if (existingSub) {
    const plan = existingSub.plan;

    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        status: "ACTIVE",
        cancelAtPeriodEnd: false,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        planTier: plan.tier,
        planId: plan.id,
        features: plan.features,
      },
    });

    await invalidateUserLimitsCache(userId);
  }

  return { success: true };
}

/**
 * Handle benefit_grant.cycled event (credit rollover on renewal)
 */
async function handleBenefitGrantCycled(data: Record<string, unknown>) {
  const benefitGrant = data as {
    id: string;
    benefitId: string;
    customerId: string;
    productId: string;
    metadata?: Record<string, string>;
  };

  console.log(`Benefit grant cycled: ${benefitGrant.id}`);

  const userId = getUserIdFromEvent(benefitGrant);
  if (!userId) return { success: false };

  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    include: { plan: true },
  });

  if (subscription?.plan) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: subscription.plan.credits },
      },
    });
    console.log(`Added ${subscription.plan.credits} rollover credits to user ${userId}`);
  }

  return { success: true };
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;

    const event = await validateWebhook(body, headers);
    if (!event) {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }

    console.log(`Polar webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.created":
        await handleCheckoutCreated(event.data);
        break;
      case "order.paid":
        await handleOrderPaid(event.data);
        break;
      case "order.refunded":
        await handleOrderRefunded(event.data);
        break;
      case "subscription.created":
        await handleSubscriptionCreated(event.data);
        break;
      case "subscription.active":
        await handleSubscriptionActive(event.data);
        break;
      case "subscription.canceled":
        await handleSubscriptionCanceled(event.data);
        break;
      case "subscription.updated":
        await handleSubscriptionUpdated(event.data);
        break;
      case "subscription.uncanceled":
        await handleSubscriptionUncanceled(event.data);
        break;
      case "benefit_grant.cycled":
        await handleBenefitGrantCycled(event.data);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Polar webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}