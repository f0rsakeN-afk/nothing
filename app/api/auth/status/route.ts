/**
 * Auth Status API
 * Returns current user info including onboarding status
 * Used for client-side auth checks and onboarding redirects
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    const dbUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { seenOnboarding: true, email: true, isActive: true },
    });

    return NextResponse.json({
      authenticated: true,
      email: user.primaryEmail,
      seenOnboarding: dbUser?.seenOnboarding ?? false,
    });
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json({ error: "Failed to get auth status" }, { status: 500 });
  }
}
