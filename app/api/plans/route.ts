/**
 * Plans API
 * GET /api/plans - Get all available plans with user's current plan
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { KEYS, TTL } from "@/lib/redis";

const PLANS_CACHE_KEY = "plans:all";
const PLANS_CACHE_TTL = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Auth is optional - only needed to show user's current plan
    const user = await validateAuth(request);

    // Try cache first
    let plans;
    try {
      const cached = await redis.get(PLANS_CACHE_KEY);
      if (cached) {
        plans = JSON.parse(cached);
      }
    } catch {
      // Redis unavailable
    }

    // Fetch from DB if not cached
    if (!plans) {
      plans = await prisma.plan.findMany({
        where: { isActive: true, isVisible: true },
        orderBy: { sortOrder: "asc" },
      });

      // Cache for 5 minutes
      try {
        await redis.setex(PLANS_CACHE_KEY, PLANS_CACHE_TTL, JSON.stringify(plans));
      } catch {
        // Redis unavailable
      }
    }

    // Determine current plan
    let currentPlan = "free";
    if (user) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: user.id },
        include: { plan: true },
      });

      if (subscription?.status === "ACTIVE") {
        currentPlan = subscription.plan.tier.toLowerCase();
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
