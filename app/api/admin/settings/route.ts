/**
 * GET /api/admin/settings - Get all settings
 * PATCH /api/admin/settings - Update settings
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";
import { z } from "zod";

const SETTINGS_CACHE_KEY = "admin:settings";

const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

async function getSettings(): Promise<Record<string, string>> {
  const cached = await redis.get(SETTINGS_CACHE_KEY);
  if (cached) return JSON.parse(cached);
  const rows = await prisma.adminSetting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  await redis.setex(SETTINGS_CACHE_KEY, 300, JSON.stringify(settings));
  return settings;
}

async function invalidateSettingsCache(): Promise<void> {
  try {
    await redis.del(SETTINGS_CACHE_KEY);
  } catch {
    // Redis unavailable
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { type: "authentication_required", message: "Authentication required" } },
        { status: 401 },
      );
    }

    if (!(await isAdminOrModerator(user.id))) {
      return NextResponse.json(
        { error: { type: "forbidden", message: "Admin or moderator role required" } },
        { status: 403 },
      );
    }

    const settings = await getSettings();

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Admin settings error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch settings" } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { type: "authentication_required", message: "Authentication required" } },
        { status: 401 },
      );
    }

    if (!(await isAdminOrModerator(user.id))) {
      return NextResponse.json(
        { error: { type: "forbidden", message: "Admin or moderator role required" } },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation_error", message: parsed.error.issues } },
        { status: 400 },
      );
    }

    const { settings } = parsed.data;

    // Upsert each setting
    for (const [key, value] of Object.entries(settings)) {
      await prisma.adminSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    logAuditEvent({
      action: "ADMIN_SETTINGS_CHANGE",
      userId: user.id,
      metadata: { changedKeys: Object.keys(settings) },
      request,
    });

    await invalidateSettingsCache();

    const allSettings = await getSettings();
    return NextResponse.json({ settings: allSettings });
  } catch (error) {
    console.error("Admin settings update error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to update settings" } },
      { status: 500 },
    );
  }
}
