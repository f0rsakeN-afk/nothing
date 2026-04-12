/**
 * Stripe Payment Intent API
 * POST /api/stripe/payment-intent - Create a payment intent for purchasing credits
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import Stripe from "stripe";
import { stripeConfig } from "@/lib/stripe-config";
import prisma from "@/lib/prisma";

const stripe = new Stripe(stripeConfig.secretKey);

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { packageId } = body;

    // Find the package
    const creditPackage = stripeConfig.creditPackages.find(p => p.id === packageId);
    if (!creditPackage) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: creditPackage.amount,
      currency: "usd",
      metadata: {
        userId: user.id,
        credits: creditPackage.credits.toString(),
        packageId: creditPackage.id,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: creditPackage.amount,
      credits: creditPackage.credits,
    });
  } catch (error) {
    console.error("Payment intent error:", error);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}
