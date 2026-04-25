/**
 * Polar Plans API
 * GET /api/polar/plans - Get all available plans with user's current plan
 *
 * Caching strategy:
 * - Static plan data: Module-level in-memory cache (never changes)
 * - User subscription: Redis cache with 2-min TTL (handles rapid clicking)
 */

import { NextRequest, NextResponse } from "next/server";
import { polarConfig } from "@/lib/polar-config";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getSubscriptionCache,
  setSubscriptionCache,
} from "@/lib/subscription-cache";

// ---------------------------------------------------------------------------
// Static plan data cache (module-level, survives across requests)
// ---------------------------------------------------------------------------

interface CachedPlans {
  plans: {
    free: Omit<typeof polarConfig.plans.free, "name" | "description" | "features"> & {
      name: string;
      description: string;
      features: readonly string[];
      polarProductId: string | null;
    };
    basic: typeof polarConfig.plans.basic & { polarProductId: string };
    pro: typeof polarConfig.plans.pro & { polarProductId: string };
    enterprise: typeof polarConfig.plans.enterprise & { polarProductId: string };
  };
}

let plansCache: CachedPlans | null = null;
let plansCacheTimestamp = 0;
const PLANS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getPlans(): CachedPlans {
  const now = Date.now();

  if (plansCache && now - plansCacheTimestamp < PLANS_CACHE_TTL_MS) {
    return plansCache;
  }

  plansCache = {
    plans: {
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
    },
  };
  plansCacheTimestamp = now;
  return plansCache;
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Auth is optional - only needed to show user's current plan
    const user = await validateAuth(request);

    // Get static plan data (cached in memory, ~0 overhead)
    const { plans } = getPlans();

    // Determine current plan - only if authenticated
    let currentPlan = "free";

    if (user) {
      // Try Redis cache first
      const cached = await getSubscriptionCache(user.id);

      if (cached?.status === "ACTIVE" && cached.planTier) {
        currentPlan = cached.planTier;
      } else {
        // Cache miss or not active - fetch from DB
        const subscription = await prisma.subscription.findUnique({
          where: { userId: user.id },
          include: { plan: true },
        });

        if (subscription?.status === "ACTIVE") {
          currentPlan = subscription.plan.tier.toLowerCase();

          // Populate cache for future requests
          await setSubscriptionCache(user.id, {
            planTier: subscription.plan.tier.toLowerCase(),
            status: subscription.status,
          });
        }
      }
    }

    return NextResponse.json({ plans, currentPlan });
  } catch (error) {
    console.error("[Plans API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
