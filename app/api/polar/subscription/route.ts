/**
 * Polar Subscription API
 * POST /api/polar/subscription - Cancel subscription
 * DELETE /api/polar/subscription - Reactivate canceled subscription
 *
 * @see https://polar.sh/docs
 */

import { NextRequest, NextResponse } from "next/server";
import { polarConfig, polar } from "@/lib/polar-config";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invalidateUserLimitsCache } from "@/services/limit.service";

export async function POST(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    if (subscription.status === "CANCELED") {
      return NextResponse.json({ error: "Subscription already canceled" }, { status: 400 });
    }

    // With Polar, you cancel via customer portal or API
    // For now, we mark as pending cancellation
    // The actual cancellation happens via webhook from Polar

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription will be canceled at period end via Polar"
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return NextResponse.json({ error: "Subscription is not scheduled for cancellation" }, { status: 400 });
    }

    // Clear cancel at period end
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false },
    });

    // Reactivate user features if needed
    if (subscription.plan) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          planTier: subscription.plan.tier,
          planId: subscription.plan.id,
          features: subscription.plan.features,
        },
      });

      await invalidateUserLimitsCache(user.id);
    }

    return NextResponse.json({ success: true, message: "Subscription reactivated" });
  } catch (error) {
    console.error("Reactivate subscription error:", error);
    return NextResponse.json({ error: "Failed to reactivate subscription" }, { status: 500 });
  }
}