/**
 * Credits API
 * GET /api/credits - Get user's credit balance, usage, and subscription info
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    let periodEnd = null;
    if (hasActiveSubscription && fullUser.subscription) {
      periodEnd = fullUser.subscription.currentPeriodEnd;
    }

    // Calculate days until reset
    let daysUntilReset = null;
    if (periodEnd) {
      const now = new Date();
      const diff = periodEnd.getTime() - now.getTime();
      daysUntilReset = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      credits: {
        current: currentCredits,
        plan: planCredits,
        used: usedCredits,
        usedPct,
        isRollover: hasActiveSubscription, // if true, credits roll over monthly
      },
      subscription: hasActiveSubscription && fullUser.subscription
        ? {
            active: true,
            status: fullUser.subscription.status,
            periodEnd: periodEnd?.toISOString(),
            daysUntilReset,
          }
        : {
            active: false,
          },
      plan: {
        name: fullUser.userPlan?.name || "Free",
        tier: fullUser.planTier,
      },
    });
  } catch (error) {
    console.error("Get credits error:", error);
    return NextResponse.json({ error: "Failed to get credits" }, { status: 500 });
  }
}
