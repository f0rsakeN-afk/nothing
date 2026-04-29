/**
 * Polar Plans API
 * GET /api/polar/plans - Get all available plans with user's current plan
 *
 * Caching strategy:
 * - Plan data: Redis cache with 60s TTL
 * - User subscription: Redis cache with 2-min TTL
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import {
  getSubscriptionCache,
  setSubscriptionCache,
} from "@/lib/subscription-cache";

const POLAR_PLANS_CACHE_KEY = "polar:plans";
const POLAR_PLANS_CACHE_TTL = 60; // 60 seconds

interface PlanData {
  id: string;
  tier: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  maxChats: number;
  maxProjects: number;
  maxMessages: number;
  maxMemoryItems: number;
  maxBranchesPerChat: number;
  maxFolders: number;
  maxAttachmentsPerChat: number;
  maxFileSizeMb: number;
  canExport: boolean;
  canApiAccess: boolean;
  features: string[];
  polarPriceId: string | null;
  polarProductId: string | null;
  isActive: boolean;
  isVisible: boolean;
  isDefault: boolean;
}

async function getCachedPlans(): Promise<PlanData[] | null> {
  try {
    const cached = await redis.get(POLAR_PLANS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setCachedPlans(plans: PlanData[]): Promise<void> {
  try {
    await redis.setex(POLAR_PLANS_CACHE_KEY, POLAR_PLANS_CACHE_TTL, JSON.stringify(plans));
  } catch {
    // Redis unavailable
  }
}

async function getPlans(): Promise<PlanData[]> {
  // Try cache first
  const cached = await getCachedPlans();
  if (cached) return cached;

  // Fetch from DB - only active and visible plans
  const plans = await prisma.plan.findMany({
    where: { isActive: true, isVisible: true },
    orderBy: { sortOrder: "asc" },
  });

  const planData: PlanData[] = plans.map((p) => ({
    id: p.id,
    tier: p.tier,
    name: p.name,
    description: p.description,
    price: p.price,
    credits: p.credits,
    maxChats: p.maxChats,
    maxProjects: p.maxProjects,
    maxMessages: p.maxMessages,
    maxMemoryItems: p.maxMemoryItems,
    maxBranchesPerChat: p.maxBranchesPerChat,
    maxFolders: p.maxFolders,
    maxAttachmentsPerChat: p.maxAttachmentsPerChat,
    maxFileSizeMb: p.maxFileSizeMb,
    canExport: p.canExport,
    canApiAccess: p.canApiAccess,
    features: p.features,
    polarPriceId: p.polarPriceId,
    polarProductId: p.polarProductId,
    isActive: p.isActive,
    isVisible: p.isVisible,
    isDefault: p.isDefault,
  }));

  await setCachedPlans(planData);
  return planData;
}

export async function GET(request: NextRequest) {
  try {
    // Auth is optional - only needed to show user's current plan
    const user = await validateAuth(request);

    // Get plan data from DB (with Redis caching)
    const plans = await getPlans();

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
