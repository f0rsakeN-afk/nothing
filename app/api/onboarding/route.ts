/**
 * Onboarding API
 * GET /api/onboarding - Get user's onboarding data
 * POST /api/onboarding - Complete onboarding for a user
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { notFoundError, internalError, validationError, unauthorizedError } from "@/lib/api-response";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";
import { z } from "zod";

const onboardingSchema = z.object({
  profession: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return unauthorizedError();
    }

    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const onboardingData = await prisma.onboardingData.findUnique({
      where: { userId: prismaUser.id },
      select: { profession: true, source: true },
    });

    return NextResponse.json({
      profession: onboardingData?.profession || null,
      source: onboardingData?.source || null,
    });
  } catch (error) {
    console.error("Onboarding GET error:", error);
    return NextResponse.json({ error: "Failed to get onboarding data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return unauthorizedError();
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
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const { profession, source } = parsed.data;

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