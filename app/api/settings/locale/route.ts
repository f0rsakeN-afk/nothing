/**
 * User Locale API
 * PATCH /api/settings/locale
 *
 * Updates user's preferred language in settings
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { routing, type Locale } from "@/routing";
import { invalidateUserSettingsCache } from "@/services/settings.service";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";
import {
  unauthorizedError,
  notFoundError,
  badRequestError,
  internalError,
  validationError,
} from "@/lib/api-response";

const updateLocaleSchema = z.object({
  language: z.string().min(2).max(10),
});

export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return unauthorizedError();
    }

    // Get prisma user by stackId to get the numeric id
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return notFoundError("User");
    }

    const body = await request.json();
    const parsed = updateLocaleSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const { language } = parsed.data;

    // Validate locale
    if (!routing.locales.includes(language as Locale)) {
      return badRequestError("Invalid locale");
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
    return internalError("Failed to update language");
  }
}
