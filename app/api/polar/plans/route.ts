/**
 * Polar Plans API
 * GET /api/polar/plans - Get all available plans
 */

import { NextRequest, NextResponse } from "next/server";
import { polarConfig } from "@/lib/polar-config";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await validateAuth(request);

    const plans = {
      free: {
        ...polarConfig.plans.free,
        polarProductId: null,
      },
      basic: {
        ...polarConfig.plans.basic,
        polarProductId: polarConfig.plans.basic.polarProductId,
      },
      pro: {
        ...polarConfig.plans.pro,
        polarProductId: polarConfig.plans.pro.polarProductId,
      },
      enterprise: {
        ...polarConfig.plans.enterprise,
        polarProductId: polarConfig.plans.enterprise.polarProductId,
      },
    };

    let currentPlan = "free";

    if (user) {
      // Single query: subscription + plan + user planTier in one round-trip
      const subscription = await prisma.subscription.findUnique({
        where: { userId: user.id },
        include: { plan: true },
      });

      if (subscription && subscription.status === "ACTIVE") {
        currentPlan = subscription.plan.tier.toLowerCase();
      } else {
        // User record already available from validateAuth via Redis cache
        // No extra query needed - fall back to free plan
        currentPlan = "free";
      }
    }

    return NextResponse.json({ plans, currentPlan });
  } catch (error) {
    console.error("Plans API error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
