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

export async function PATCH(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      where: { userId: user.id },
      create: {
        userId: user.id,
        language,
      },
      update: {
        language,
      },
    });

    return NextResponse.json({ success: true, language });
  } catch (error) {
    console.error("[Settings/Locale] Error:", error);
    return NextResponse.json(
      { error: "Failed to update language" },
      { status: 500 }
    );
  }
}
