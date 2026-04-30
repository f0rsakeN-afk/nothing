/**
 * eSewa Success Handler
 * GET /api/esewa/success - Called by eSewa after successful payment
 *
 * @see https://developer.esewa.com.np/pages/Epay
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyEsewaTransaction } from "@/services/esewa.service";
import prisma from "@/lib/prisma";
import { invalidateUserLimitsCache } from "@/services/limit.service";
import { invalidateAccountCache } from "@/services/account.service";
import { invalidateSubscriptionCache } from "@/lib/subscription-cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    console.log("[eSewa] Success callback URL:", request.url);

    // Get response data from eSewa (Base64 encoded)
    const encodedData = searchParams.get("data");
    if (!encodedData) {
      console.error("[eSewa] No data param in callback");
      return NextResponse.redirect(new URL("/?payment=error", request.url));
    }

    // Decode the response
    let responseData: Record<string, string>;
    try {
      const decoded = Buffer.from(encodedData, "base64").toString("utf-8");
      console.log("[eSewa] Decoded data:", decoded);
      responseData = JSON.parse(decoded);
    } catch {
      console.error("[eSewa] Failed to decode response data");
      return NextResponse.redirect(new URL("/?payment=error", request.url));
    }

    const { transaction_uuid, total_amount, status } = responseData;
    console.log("[eSewa] Response fields:", { transaction_uuid, total_amount, status });

    // Verify transaction with eSewa
    const verification = await verifyEsewaTransaction({
      totalAmount: parseFloat(total_amount),
      transactionUuid: transaction_uuid,
    });

    console.log("[eSewa] Verification full result:", JSON.stringify(verification));

    if (!verification) {
      console.error("[eSewa] Verification returned null - API call likely failed");
      return NextResponse.redirect(new URL("/?payment=failed", request.url));
    }

    if (verification.status !== "COMPLETE") {
      console.error("[eSewa] Transaction status is not COMPLETE:", verification.status);
      return NextResponse.redirect(new URL("/?payment=failed", request.url));
    }

    // Parse transaction_uuid to get userId and planId
    // Format: planId:userId:timestamp (colon separated to avoid UUID hyphen issues)
    const parts = transaction_uuid.split(":");
    const planId = parts[0];
    const userId = parts[1];

    if (!planId || !userId) {
      console.error("[eSewa] Invalid transaction_uuid format:", transaction_uuid);
      return NextResponse.redirect(new URL("/?payment=error", request.url));
    }

    // Activate subscription
    activateSubscription(userId, planId, "esewa", transaction_uuid);
    return NextResponse.redirect(new URL("/?payment=success", request.url));
  } catch (error) {
    console.error("[eSewa] Success handler error:", error);
    return NextResponse.redirect(new URL("/?payment=error", request.url));
  }
}

async function activateSubscription(userId: string, planId: string, paymentMethod: string, paymentId: string) {
  console.log("[eSewa] Activating subscription for user:", userId, "plan:", planId);

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    console.error("[eSewa] Plan not found:", planId);
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

  console.log(`[eSewa] Subscription activated for user ${userId}, plan: ${planId}, payment: ${paymentMethod}`);
}
