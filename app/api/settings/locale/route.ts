/**
 * User Locale API
 * PATCH /api/settings/locale
 *
 * Updates user's preferred language in settings
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { routing, type Locale } from "@/routing";
import { invalidateUserSettingsCache } from "@/services/settings.service";

export async function PATCH(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get prisma user by stackId to get the numeric id
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { language } = body;

    // Validate locale
    if (!language || !routing.locales.includes(language as Locale)) {
      return NextResponse.json(
        { error: "Invalid locale" },
        { status: 400 }
      );
    }

    // Update or create settings with language
    await prisma.settings.upsert({
      where: { userId: prismaUser.id },
      create: {
        userId: prismaUser.id,
        language,
      },
      update: {
        language,
      },
    });

    // Invalidate settings cache so next request gets fresh data
    await invalidateUserSettingsCache(prismaUser.id);

    return NextResponse.json({ success: true, language });
  } catch (error) {
    console.error("[Settings/Locale] Error:", error);
    return NextResponse.json(
      { error: "Failed to update language" },
      { status: 500 }
    );
  }
}
