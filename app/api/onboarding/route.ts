/**
 * Onboarding API
 * POST /api/onboarding - Complete onboarding for a user
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get prisma user by stackId to get internal UUID
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { profession, source } = body;

    // Update user's seenOnboarding flag
    await prisma.user.update({
      where: { id: prismaUser.id },
      data: { seenOnboarding: true },
    });

    // Store onboarding data
    try {
      await prisma.onboardingData.upsert({
        where: { userId: prismaUser.id },
        create: {
          userId: prismaUser.id,
          profession: profession || "",
          source: source || "",
        },
        update: {
          profession: profession || "",
          source: source || "",
        },
      });
    } catch {
      // Ignore errors - onboarding data is optional
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}