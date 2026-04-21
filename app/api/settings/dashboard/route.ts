/**
 * Settings Dashboard API
 * GET /api/settings/dashboard - Get all settings + account data in one call
 *
 * Returns: settings + account (plan, usage, subscription) combined
 * Uses cached services for optimal performance
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { getUserSettings } from "@/services/settings.service";
import { getAccountData } from "@/services/account.service";

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

    // Run both cached queries in parallel
    const [settings, account] = await Promise.all([
      getUserSettings(prismaUser.id),
      getAccountData(prismaUser.id),
    ]);

    return NextResponse.json({
      settings,
      ...account,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to get dashboard data" }, { status: 500 });
  }
}