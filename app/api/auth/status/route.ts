/**
 * Auth Status API
 * Returns current user info including onboarding status
 * Used for client-side auth checks and onboarding redirects
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimitWithAuth(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    const dbUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true, seenOnboarding: true, email: true, isActive: true },
    });

    return NextResponse.json({
      authenticated: true,
      userId: dbUser?.id,
      email: user.primaryEmail,
      seenOnboarding: dbUser?.seenOnboarding ?? false,
    });
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json({ error: "Failed to get auth status" }, { status: 500 });
  }
}
