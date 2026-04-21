/**
 * Settings API
 * GET/PATCH /api/settings - Get or update user settings
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { updateSettingsSchema } from "@/schemas/validation";
import { getUserSettings, invalidateUserSettingsCache } from "@/services/settings.service";

const DEFAULT_SETTINGS = {
  theme: "system",
  language: "en",
  autoTitle: true,
  enterToSend: false,
  showSuggestions: true,
  compactMode: false,
  reducedMotion: false,
  streaming: true,
  codeHighlight: true,
  persistentMemory: false,
  emailUpdates: true,
  emailMarketing: false,
  browserNotifs: false,
  usageAlerts: true,
  analytics: true,
  usageData: false,
  crashReports: true,
};

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up prisma user to get internal UUID
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use cached settings (falls back to defaults if no record)
    const settings = await getUserSettings(prismaUser.id);

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get prisma user by stackId to get the numeric id
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if settings already exist
    const existingSettings = await prisma.settings.findUnique({
      where: { userId: prismaUser.id },
    });

    let settings;
    if (existingSettings) {
      // Update only the fields provided
      settings = await prisma.settings.update({
        where: { userId: prismaUser.id },
        data,
      });
    } else {
      // Create with defaults + provided data
      settings = await prisma.settings.create({
        data: {
          userId: prismaUser.id,
          theme: data.theme as typeof DEFAULT_SETTINGS.theme || DEFAULT_SETTINGS.theme,
          language: data.language || DEFAULT_SETTINGS.language,
          autoTitle: data.autoTitle ?? DEFAULT_SETTINGS.autoTitle,
          enterToSend: data.enterToSend ?? DEFAULT_SETTINGS.enterToSend,
          showSuggestions: data.showSuggestions ?? DEFAULT_SETTINGS.showSuggestions,
          compactMode: data.compactMode ?? DEFAULT_SETTINGS.compactMode,
          reducedMotion: data.reducedMotion ?? DEFAULT_SETTINGS.reducedMotion,
          streaming: data.streaming ?? DEFAULT_SETTINGS.streaming,
          codeHighlight: data.codeHighlight ?? DEFAULT_SETTINGS.codeHighlight,
          persistentMemory: data.persistentMemory ?? DEFAULT_SETTINGS.persistentMemory,
          emailUpdates: data.emailUpdates ?? DEFAULT_SETTINGS.emailUpdates,
          emailMarketing: data.emailMarketing ?? DEFAULT_SETTINGS.emailMarketing,
          browserNotifs: data.browserNotifs ?? DEFAULT_SETTINGS.browserNotifs,
          usageAlerts: data.usageAlerts ?? DEFAULT_SETTINGS.usageAlerts,
          analytics: data.analytics ?? DEFAULT_SETTINGS.analytics,
          usageData: data.usageData ?? DEFAULT_SETTINGS.usageData,
          crashReports: data.crashReports ?? DEFAULT_SETTINGS.crashReports,
        },
      });
    }

    // Invalidate cache so next request gets fresh data
    await invalidateUserSettingsCache(prismaUser.id);

    return NextResponse.json({
      theme: settings.theme,
      language: settings.language,
      autoTitle: settings.autoTitle,
      enterToSend: settings.enterToSend,
      showSuggestions: settings.showSuggestions,
      compactMode: settings.compactMode,
      reducedMotion: settings.reducedMotion,
      streaming: settings.streaming,
      codeHighlight: settings.codeHighlight,
      persistentMemory: settings.persistentMemory,
      emailUpdates: settings.emailUpdates,
      emailMarketing: settings.emailMarketing,
      browserNotifs: settings.browserNotifs,
      usageAlerts: settings.usageAlerts,
      analytics: settings.analytics,
      usageData: settings.usageData,
      crashReports: settings.crashReports,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
