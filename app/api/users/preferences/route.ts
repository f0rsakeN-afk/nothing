/**
 * User Preferences API
 * GET/PATCH /api/users/preferences - Get or update user preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { invalidateUserPreferencesCache } from "@/services/preferences.service";

export async function GET(request: NextRequest) {
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

    const prefs = await prisma.userPreference.findUnique({
      where: { userId: prismaUser.id },
    });

    if (!prefs) {
      // Return defaults for new user
      return NextResponse.json({
        preferredTone: "balanced",
        detailLevel: "BALANCED",
      });
    }

    // Only return user-facing fields
    return NextResponse.json({
      preferredTone: prefs.preferredTone,
      detailLevel: prefs.detailLevel,
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    return NextResponse.json({ error: "Failed to get preferences" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const { preferredTone, detailLevel } = body;

    const prefs = await prisma.userPreference.upsert({
      where: { userId: prismaUser.id },
      create: { userId: prismaUser.id },
      update: {
        ...(preferredTone && { preferredTone }),
        ...(detailLevel && { detailLevel }),
      },
    });

    // Invalidate cache so next request gets fresh data
    await invalidateUserPreferencesCache(prismaUser.id);

    // Only return user-facing fields
    return NextResponse.json({
      preferredTone: prefs.preferredTone,
      detailLevel: prefs.detailLevel,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}