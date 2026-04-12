/**
 * Stripe Checkout API
 * POST /api/stripe/checkout - Create a Stripe checkout session for subscription
 * Uses database plan to get Stripe Price ID
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripeConfig } from "@/lib/stripe-config";
import { validateAuth } from "@/lib/auth";
import { getPlan } from "@/services/plan.service";
import prisma from "@/lib/prisma";

const stripe = new Stripe(stripeConfig.secretKey);

export async function POST(request: NextRequest) {
  try {
    // Validate auth
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: "Plan ID required" }, { status: 400 });
    }

    // Free plan doesn't need Stripe checkout
    if (planId === "free") {
      return NextResponse.json({ error: "Free plan doesn't need checkout" }, { status: 400 });
    }

    // Get plan from database to get Stripe price ID
    const plan = await getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Fallback to env var if DB doesn't have Stripe price ID
    const stripePriceId = plan.stripePriceId || stripeConfig.stripeBasicPriceId;

    // Get or create Stripe customer
    const existingSub = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    let customerId = existingSub?.stripeCustomerId || undefined;

    // Create Stripe checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account?canceled=true`,
      metadata: {
        userId: user.id,
        planId,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId,
        },
      },
    };

    // If user has existing customer, reuse it
    if (customerId) {
      sessionConfig.customer = customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
