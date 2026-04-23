/**
 * Cookie Consent API
 * GET /api/cookie-consent - Get user's cookie consent
 * POST /api/cookie-consent - Save user's cookie consent
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has cookie consent stored
    const existingConsent = await prisma.user.findUnique({
      where: { id: prismaUser.id },
      select: { email: true }, // We just need to check if user exists
    });

    if (!existingConsent) {
      return NextResponse.json({ consent: null });
    }

    // For now, we return success - actual consent is stored client-side
    // This endpoint is mainly for audit trail and future sync capabilities
    return NextResponse.json({ consent: null });
  } catch (error) {
    logger.error("[CookieConsent] GET error:", error as Error);
    return NextResponse.json({ error: "Failed to get consent" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { analytics, personalization, marketing } = body;

    // Store consent metadata for compliance
    // In a real app, you'd create a CookieConsent model
    // For now we just log it
    logger.info("[CookieConsent] User consent updated", {
      userId: prismaUser.id,
      analytics,
      personalization,
      marketing,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[CookieConsent] POST error:", error as Error);
    return NextResponse.json({ error: "Failed to save consent" }, { status: 500 });
  }
}
