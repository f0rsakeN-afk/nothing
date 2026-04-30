/**
 * Khalti Success Handler
 * GET /api/khalti/success - Called by Khalti after payment
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyKhaltiPayment } from "@/services/khalti.service";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { invalidateUserLimitsCache } from "@/services/limit.service";
import { invalidateAccountCache } from "@/services/account.service";
import { invalidateSubscriptionCache } from "@/lib/subscription-cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get payment data from Khalti
    const pidx = searchParams.get("pidx");
    const purchase_order_id = searchParams.get("purchase_order_id");
    const status = searchParams.get("status");

    if (!pidx) {
      return NextResponse.redirect(new URL("/?payment=error", request.url));
    }

    // Verify with Khalti
    const verification = await verifyKhaltiPayment(pidx);

    if (!verification || verification.status !== "Completed") {
      logger.error("[Khalti] Payment not verified or not complete: " + verification?.status);
      return NextResponse.redirect(new URL("/?payment=failed", request.url));
    }

    // Parse purchase_order_id to get userId and planId
    // Format: planId-userId-timestamp
    if (!purchase_order_id) {
      logger.error("[Khalti] Missing purchase_order_id");
      return NextResponse.redirect(new URL("/?payment=error", request.url));
    }
    const parts = purchase_order_id.split("-");
    const planId = parts[0];
    const userId = parts[1];

    if (!planId || !userId) {
      logger.error("[Khalti] Invalid purchase_order_id format: " + purchase_order_id);
      return NextResponse.redirect(new URL("/?payment=error", request.url));
    }

    // Activate subscription
    await activateSubscription(userId, planId, "khalti", pidx);

    // Redirect to app with success
    return NextResponse.redirect(new URL("/?payment=success", request.url));
  } catch (error) {
    logger.error("[Khalti] Success handler error:", error as Error);
    return NextResponse.redirect(new URL("/?payment=error", request.url));
  }
}

async function activateSubscription(userId: string, planId: string, paymentMethod: string, paymentId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    logger.error(`[Khalti] Plan not found: ${planId}`);
    return;
  }

  // Find or create subscription
  const existingSub = await prisma.subscription.findUnique({
    where: { userId },
  });

  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

  if (existingSub) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        planId,
        paymentMethod,
        paymentId,
        status: "ACTIVE",
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
        paymentMethod,
        paymentId,
        status: "ACTIVE",
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
      maxChats: plan.maxChats,
      maxProjects: plan.maxProjects,
      maxMessages: plan.maxMessages,
      features: plan.features,
    },
  });

  // Record the transaction
  await prisma.paymentTransaction.create({
    data: {
      userId,
      planId,
      paymentMethod,
      paymentId,
      amount: plan.price, // Price in NPR
      status: "completed",
    },
  });

  // Invalidate caches
  await invalidateUserLimitsCache(userId);
  await invalidateAccountCache(userId);
  await invalidateSubscriptionCache(userId);

  logger.info(`[Khalti] Subscription activated for user ${userId}, plan: ${planId}, payment: ${paymentMethod}`);
}