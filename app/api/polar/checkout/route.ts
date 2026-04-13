/**
 * Polar Checkout API
 * POST /api/polar/checkout - Create a Polar checkout link for subscription or credits
 *
 * @see https://polar.sh/docs/features/checkout/embed
 */

import { NextRequest, NextResponse } from "next/server";
import { polarConfig } from "@/lib/polar-config";
import { validateAuth } from "@/lib/auth";
import { getPlan } from "@/services/plan.service";

export async function POST(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { planId, creditPackageId } = body;

    // Determine if subscription or credit package
    if (creditPackageId) {
      return await createCreditPackageCheckout(user.id, creditPackageId);
    } else if (planId) {
      return await createSubscriptionCheckout(user.id, planId);
    } else {
      return NextResponse.json(
        { error: "planId or creditPackageId required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Polar checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}

/**
 * Create checkout for subscription plan
 */
async function createSubscriptionCheckout(userId: string, planId: string) {
  // Free plan doesn't need checkout
  if (planId === "free") {
    return NextResponse.json({ error: "Free plan doesn't need checkout" }, { status: 400 });
  }

  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (!plan.polarProductId) {
    return NextResponse.json({ error: "Plan not configured for Polar" }, { status: 400 });
  }

  // Create Polar checkout URL
  // Polar checkout links can be created via API or pre-created in dashboard
  // Here we use a pre-created checkout link with metadata
  const checkoutUrl = new URL(`https://polar.sh/checkout/${plan.polarProductId}`);

  // Add metadata for webhook identification
  checkoutUrl.searchParams.set("metadata[userId]", userId);
  checkoutUrl.searchParams.set("metadata[planId]", planId);
  checkoutUrl.searchParams.set("metadata[type]", "subscription");

  // Optional: embed on your site
  checkoutUrl.searchParams.set("embed", "true");
  checkoutUrl.searchParams.set("embed_origin", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

  return NextResponse.json({ url: checkoutUrl.toString() });
}

/**
 * Create checkout for credit package
 */
async function createCreditPackageCheckout(userId: string, packageId: string) {
  const creditPackage = polarConfig.creditPackages.find(p => p.id === packageId);
  if (!creditPackage) {
    return NextResponse.json({ error: "Credit package not found" }, { status: 404 });
  }

  // For credit packages, you would typically have a Polar product per package
  // Use the product ID from environment or map package to product
  const productId = process.env[`POLAR_${packageId.toUpperCase()}_PRODUCT_ID`];
  if (!productId) {
    return NextResponse.json({ error: "Credit package not configured" }, { status: 400 });
  }

  const checkoutUrl = new URL(`https://polar.sh/checkout/${productId}`);
  checkoutUrl.searchParams.set("metadata[userId]", userId);
  checkoutUrl.searchParams.set("metadata[type]", "credit_package");
  checkoutUrl.searchParams.set("metadata[credits]", String(creditPackage.credits));
  checkoutUrl.searchParams.set("embed", "true");
  checkoutUrl.searchParams.set("embed_origin", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

  return NextResponse.json({ url: checkoutUrl.toString() });
}