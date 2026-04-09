/**
 * User Preferences API
 * GET/PATCH /api/users/preferences - Get or update user preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefs = await prisma.userPreference.findUnique({
      where: { userId: user.id },
    });

    if (!prefs) {
      // Create default preferences
      const newPrefs = await prisma.userPreference.create({
        data: { userId: user.id },
      });
      return NextResponse.json(newPrefs);
    }

    return NextResponse.json(prefs);
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

    const body = await request.json();
    const { preferredTone, detailLevel } = body;

    const prefs = await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {
        ...(preferredTone && { preferredTone }),
        ...(detailLevel && { detailLevel }),
      },
    });

    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
