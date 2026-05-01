/**
 * Unified Payment Checkout API
 * POST /api/payment/checkout - Create payment session for subscription
 *
 * Accepts: { planId }
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
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    if (planId === "free") {
      return NextResponse.json({ error: "Free plan doesn't need checkout" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Use a separator that's not in UUIDs (colons are safe)
    const transactionUuid = `${planId}:${user.id}:${Date.now()}`;
    const successUrl = `${baseUrl}/api/esewa/success`;
    const failureUrl = `${baseUrl}/api/esewa/failure`;

    const { formData } = createEsewaPayment({
      amount: plan.price,
      taxAmount: 0,
      productServiceCharge: 0,
      productDeliveryCharge: 0,
      successUrl,
      failureUrl,
      transactionUuid,
      metadata: { userId: user.id, planId, type: "subscription" },
    });

    return NextResponse.json({
      method: "esewa",
      paymentUrl: getEsewaPaymentUrl(),
      formData,
      transactionUuid,
    });
  } catch (error) {
    logger.error("Payment checkout error:", error as Error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}