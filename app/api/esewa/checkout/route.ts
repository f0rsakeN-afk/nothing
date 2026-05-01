/**
 * eSewa Checkout API
 * POST /api/esewa/checkout - Create eSewa payment session for subscription
 *
 * @see https://developer.esewa.com.np/pages/Epay
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";
import { createEsewaPayment, getEsewaPaymentUrl } from "@/services/esewa.service";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "planId is required" },
        { status: 400 }
      );
    }

    return await createPlanCheckout(user.id, planId);
  } catch (error) {
    logger.error("eSewa checkout error:", error as Error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}

/**
 * Create checkout for subscription plan
 */
async function createPlanCheckout(userId: string, planId: string) {
  if (planId === "free") {
    return NextResponse.json({ error: "Free plan doesn't need checkout" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Price in NPR (eSewa expects the exact amount being charged)
  const amount = plan.price;

  const transactionUuid = `${planId}-${userId.slice(0, 16)}-${Date.now()}`;
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/esewa/success`;
  const failureUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/esewa/failure`;

  const { formData } = createEsewaPayment({
    amount,
    taxAmount: 0,
    productServiceCharge: 0,
    productDeliveryCharge: 0,
    successUrl,
    failureUrl,
    transactionUuid,
    metadata: { userId, planId, type: "subscription" },
  });

  return NextResponse.json({
    paymentUrl: getEsewaPaymentUrl(),
    formData,
    transactionUuid,
  });
}
