/**
 * Credit Service
 * Handles credit balance and deductions
 * Uses DB-backed plans via plan.service.ts
 */

import prisma from "@/lib/prisma";
import { polarConfig } from "@/lib/polar-config";
import { invalidateUserLimitsCache } from "@/services/limit.service";
import redis, { KEYS } from "@/lib/redis";

// Credit costs remain in polar-config (not plan-specific)
export type CreditOperation = keyof typeof polarConfig.creditCosts;

export interface CreditResult {
  success: boolean;
  remainingCredits: number;
  error?: string;
}

export interface DeductionResult extends CreditResult {
  deducted: number;
  operation: string;
}

export async function getUserCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits || 0;
}

/**
 * Invalidate user credits cache
 */
async function invalidateUserCreditsCache(userId: string): Promise<void> {
  try {
    await redis.del(KEYS.userCredits(userId));
  } catch {
    // Redis error, ignore
  }
}

export async function deductCredits(
  userId: string,
  operation: CreditOperation,
  customAmount?: number
): Promise<DeductionResult> {
  const cost = customAmount ?? polarConfig.creditCosts[operation] ?? 1;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, planTier: true, planId: true },
    });

    if (!user) {
      return {
        success: false,
        deducted: 0,
        remainingCredits: 0,
        operation,
        error: "User not found",
      };
    }

    const currentBalance = user.credits || 0;

    if (currentBalance < cost) {
      return {
        success: false,
        deducted: 0,
        remainingCredits: currentBalance,
        operation,
        error: "Insufficient credits",
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: cost,
        },
      },
      select: { credits: true },
    });

    // Invalidate credits cache after deduction
    await invalidateUserCreditsCache(userId);

    // If credits reached 0 after deduction and user had a paid tier, remove premium features
    // This handles the edge case where subscription ended but user had credits that just ran out
    if (updatedUser.credits === 0 && user.planTier !== "FREE") {
      const freePlan = await prisma.plan.findUnique({ where: { id: "free" } });
      if (freePlan) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            planTier: "FREE",
            planId: null,
            features: freePlan.features,
            // Keep maxChats/maxProjects/maxMessages as is to maintain fair usage limits
          },
        });

        // Invalidate cache so next request gets fresh free tier limits
        await invalidateUserLimitsCache(userId);
      }
    }

    return {
      success: true,
      deducted: cost,
      remainingCredits: updatedUser.credits || 0,
      operation,
    };
  } catch (error) {
    console.error("Credit deduction error:", error);
    return {
      success: false,
      deducted: 0,
      remainingCredits: 0,
      operation,
      error: "Failed to deduct credits",
    };
  }
}

export async function addCredits(
  userId: string,
  amount: number
): Promise<CreditResult> {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: amount,
        },
      },
      select: { credits: true },
    });

    // Invalidate credits cache after addition
    await invalidateUserCreditsCache(userId);

    return {
      success: true,
      remainingCredits: updatedUser.credits || 0,
    };
  } catch (error) {
    console.error("Add credits error:", error);
    return {
      success: false,
      remainingCredits: 0,
      error: "Failed to add credits",
    };
  }
}

export async function checkCreditsForOperation(
  userId: string,
  operation: CreditOperation
): Promise<boolean> {
  const cost = polarConfig.creditCosts[operation] ?? 1;
  const balance = await getUserCredits(userId);
  return balance >= cost;
}

export async function getUserSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userPlan: true,
      subscription: {
        include: {
          plan: true,
        },
      },
    },
  });

  if (!user) return null;

  // Use DB plan if available, fallback to defaults
  const planData = user.userPlan;
  const subscription = user.subscription;

  return {
    plan: user.plan,
    planTier: user.planTier,
    planId: user.planId,
    planName: planData?.name || "Free",
    displayName: planData?.name || "Free Plan",
    credits: user.credits,
    limits: {
      chats: user.maxChats,
      projects: user.maxProjects,
      messages: user.maxMessages,
    },
    features: user.features,
    subscription: subscription
      ? {
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
  };
}
