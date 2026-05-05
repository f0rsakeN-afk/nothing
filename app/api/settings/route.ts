/**
 * Settings API
 * GET/PATCH /api/settings - Get or update user settings
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { updateSettingsSchema } from "@/schemas/validation";
import { getUserSettings, invalidateUserSettingsCache } from "@/services/settings.service";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import {
  unauthorizedError,
  notFoundError,
  internalError,
  validationError,
} from "@/lib/api-response";

const DEFAULT_SETTINGS = {
  mode: "system",
  colorScheme: "civic",
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
  hapticsEnabled: true,
  showChips: true,
  showTagline: true,
  showMemory: true,
  showFiles: true,
  showApps: true,
  showSearch: true,
  showNewChat: true,
};

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return unauthorizedError();
    }

    // Look up prisma user to get internal UUID
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return notFoundError("User");
    }

    // Use cached settings (falls back to defaults if no record)
    const settings = await getUserSettings(prismaUser.id);

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    return internalError("Failed to get settings");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return unauthorizedError();
    }

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const data = parsed.data;

    // Get prisma user by stackId to get the numeric id
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return notFoundError("User");
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
          mode: data.mode as typeof DEFAULT_SETTINGS.mode || DEFAULT_SETTINGS.mode,
          colorScheme: data.colorScheme || DEFAULT_SETTINGS.colorScheme,
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
          hapticsEnabled: data.hapticsEnabled ?? DEFAULT_SETTINGS.hapticsEnabled,
          showChips: data.showChips ?? DEFAULT_SETTINGS.showChips,
          showTagline: data.showTagline ?? DEFAULT_SETTINGS.showTagline,
          showMemory: data.showMemory ?? DEFAULT_SETTINGS.showMemory,
          showFiles: data.showFiles ?? DEFAULT_SETTINGS.showFiles,
          showApps: data.showApps ?? DEFAULT_SETTINGS.showApps,
          showSearch: data.showSearch ?? DEFAULT_SETTINGS.showSearch,
          showNewChat: data.showNewChat ?? DEFAULT_SETTINGS.showNewChat,
        },
      });
    }

    // Invalidate cache so next request gets fresh data
    await invalidateUserSettingsCache(prismaUser.id);
    // Also bust Next.js Data Cache for the root path to ensure immediate consistency
    revalidatePath("/");

    return NextResponse.json({
      mode: settings.mode,
      colorScheme: settings.colorScheme,
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
      hapticsEnabled: settings.hapticsEnabled,
      showChips: settings.showChips,
      showTagline: settings.showTagline,
      showMemory: settings.showMemory,
      showFiles: settings.showFiles,
      showApps: settings.showApps,
      showSearch: settings.showSearch,
      showNewChat: settings.showNewChat,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return internalError("Failed to update settings");
  }
}
