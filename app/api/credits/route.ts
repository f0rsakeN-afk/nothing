/**
 * Credits API
 * GET /api/credits - Get user's credit balance, usage, and subscription info
 * Uses Redis caching to avoid hitting DB on every request
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis, { KEYS, TTL } from "@/lib/redis";

interface CreditsCache {
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
}

export async function GET(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = KEYS.userCredits(user.id);

    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached) as CreditsCache);
      }
    } catch {
      // Redis error, continue to DB
    }

    // Get user with plan info
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userPlan: true,
        subscription: true,
      },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentCredits = fullUser.credits;
    const planCredits = fullUser.userPlan?.credits || 25;
    const hasActiveSubscription = fullUser.subscription?.status === "ACTIVE" || fullUser.subscription?.status === "TRIALING";

    // Calculate used credits (plan credits - remaining)
    const usedCredits = Math.max(0, planCredits - currentCredits);

    // Calculate percentage used
    const usedPct = planCredits > 0 ? Math.round((usedCredits / planCredits) * 100) : 0;

    // Get subscription period info if active
    let periodEnd: string | null = null;
    if (hasActiveSubscription && fullUser.subscription) {
      periodEnd = fullUser.subscription.currentPeriodEnd.toISOString();
    }

    // Calculate days until reset
    let daysUntilReset: number | null = null;
    if (periodEnd) {
      const now = new Date();
      const periodEndDate = new Date(periodEnd);
      const diff = periodEndDate.getTime() - now.getTime();
      daysUntilReset = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const result: CreditsCache = {
      credits: {
        current: currentCredits,
        plan: planCredits,
        used: usedCredits,
        usedPct,
        isRollover: hasActiveSubscription,
      },
      subscription: hasActiveSubscription && fullUser.subscription
        ? {
            active: true,
            status: String(fullUser.subscription.status),
            periodEnd,
            daysUntilReset: daysUntilReset ?? undefined,
          }
        : {
            active: false,
          },
      plan: {
        name: fullUser.userPlan?.name || "Free",
        tier: fullUser.planTier,
      },
    };

    // Cache the result
    try {
      await redis.setex(cacheKey, TTL.userCredits, JSON.stringify(result));
    } catch {
      // Redis error, ignore
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get credits error:", error);
    return NextResponse.json({ error: "Failed to get credits" }, { status: 500 });
  }
}
