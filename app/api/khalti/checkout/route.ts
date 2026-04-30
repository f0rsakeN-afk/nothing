/**
 * Khalti Checkout API
 * POST /api/khalti/checkout - Create Khalti payment session
 *
 * @see https://docs.khalti.com/
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";
import { initiateKhaltiPayment } from "@/services/khalti.service";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkApiRateLimit(request, "default");
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

    if (planId === "free") {
      return NextResponse.json({ error: "Free plan doesn't need checkout" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Amount in rupees (Khalti expects paisa but our SDK handles conversion)
    const amount = plan.price; // Already in rupees

    const productIdentity = `${planId}-${user.id.slice(0, 8)}-${Date.now()}`;
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/khalti/success`;
    const failureUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/khalti/failure`;

    const result = await initiateKhaltiPayment({
      amount,
      productIdentity,
      productName: `${plan.name} Subscription`,
      customerName: "User",
      customerEmail: user.email || "",
      customerPhone: "",
      successUrl,
      failureUrl,
      metadata: { userId: user.id, planId, type: "subscription" },
    });

    if (!result) {
      return NextResponse.json({ error: "Failed to initiate Khalti payment" }, { status: 500 });
    }

    return NextResponse.json({
      paymentUrl: result.payment_url,
      pidx: result.pidx,
    });
  } catch (error) {
    logger.error("Khalti checkout error:", error as Error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
