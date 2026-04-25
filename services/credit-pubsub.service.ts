/**
 * Credit PubSub Service
 * Publishes real-time credit updates via Redis Pub/Sub
 *
 * Events published:
 * - credits:updated - Credit balance changed (deduct, add, refund)
 */

import redis, { CHANNELS } from "@/lib/redis";

export interface CreditsUpdatedEvent {
  type: "credits:updated";
  credits: {
    current: number;
    plan: number;
    used: number;
    usedPct: number;
    isRollover: boolean;
  };
  subscription: {
    active: boolean;
    status?: string;
    periodEnd?: string | null;
    daysUntilReset?: number;
  };
  plan: {
    name: string;
    tier: string;
  };
  /** What triggered the update */
  reason: "deduction" | "refund" | "purchase" | "subscription_cycle" | "manual";
}

export type CreditEvent = CreditsUpdatedEvent;

/**
 * Build the full credits data payload
 * Used when publishing updates after any credit operation
 */
export async function buildCreditsPayload(userId: string): Promise<Omit<CreditsUpdatedEvent, "type" | "reason">> {
  const { getUserSubscription } = await import("@/services/credit.service");

  const userData = await getUserSubscription(userId);
  if (!userData) {
    throw new Error("User not found");
  }

  const currentCredits = userData.credits;
  // Use plan's credit allocation from userData, fallback to 25 for free tier
  const planCredits = userData.planCredits || 25;
  const hasActiveSubscription = userData.subscription?.status === "ACTIVE" || userData.subscription?.status === "TRIALING";

  const usedCredits = Math.max(0, planCredits - currentCredits);
  const usedPct = planCredits > 0 ? Math.round((usedCredits / planCredits) * 100) : 0;

  let periodEnd: string | null = null;
  if (hasActiveSubscription && userData.subscription?.currentPeriodEnd) {
    periodEnd = userData.subscription.currentPeriodEnd.toISOString();
  }

  let daysUntilReset: number | null = null;
  if (periodEnd) {
    const now = new Date();
    const periodEndDate = new Date(periodEnd);
    const diff = periodEndDate.getTime() - now.getTime();
    daysUntilReset = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return {
    credits: {
      current: currentCredits,
      plan: planCredits,
      used: usedCredits,
      usedPct,
      isRollover: hasActiveSubscription,
    },
    subscription: hasActiveSubscription && userData.subscription
      ? {
          active: true,
          status: String(userData.subscription.status),
          periodEnd,
          daysUntilReset: daysUntilReset ?? undefined,
        }
      : {
          active: false,
        },
    plan: {
      name: userData.planName || "Free",
      tier: String(userData.planTier),
    },
  };
}

/**
 * Publish credit update to user's channel
 */
export async function publishCreditsUpdated(
  userId: string,
  reason: CreditsUpdatedEvent["reason"]
): Promise<void> {
  try {
    const channel = CHANNELS.credits(userId);
    const payload = await buildCreditsPayload(userId);

    const event: CreditsUpdatedEvent = {
      type: "credits:updated",
      ...payload,
      reason,
    };

    await redis.publish(channel, JSON.stringify(event));
  } catch (error) {
    console.error("[CreditPubSub] Failed to publish credits update:", error);
  }
}
