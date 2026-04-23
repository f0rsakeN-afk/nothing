/**
 * Account API
 * GET /api/account - Get user account info
 * PATCH /api/account - Update account info
 * DELETE /api/account - Soft delete account
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateAccountSchema } from "@/schemas/validation";
import { getAccountData, invalidateAccountCache } from "@/services/account.service";
import { invalidateUserPreferencesCache } from "@/services/preferences.service";
import { invalidateUserLimitsCache } from "@/services/limit.service";

export async function GET(request: NextRequest) {
  try {
    // Use validateAuth which checks proxy-set headers first (fast path)
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use cached account data
    const accountData = await getAccountData(user.id);

    const response = NextResponse.json(accountData);
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    console.error("Get account error:", error);
    return NextResponse.json({ error: "Failed to get account" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Use validateAuth which checks proxy-set headers first (fast path)
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fullUser = await prisma.user.findUnique({
      where: { stackId: user.stackId },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Update name in customize table
    if (data.name !== undefined) {
      await prisma.customize.upsert({
        where: { userId: fullUser.id },
        create: {
          userId: fullUser.id,
          name: data.name,
          responseTone: "professional",
          knowledgeDetail: "BALANCED",
          interest: [],
        },
        update: { name: data.name },
      });

      // Invalidate preferences cache since name is in customize
      await invalidateUserPreferencesCache(fullUser.id);
    }

    // Track if any plan-related fields changed
    let planFieldsChanged = false;

    // Admin-only fields
    if (fullUser.role === "ADMIN" || fullUser.role === "MODERATOR") {
      const updateData: Record<string, unknown> = {};
      if (data.plan !== undefined) {
        updateData.planTier = data.plan.toUpperCase();
        planFieldsChanged = true;
      }
      if (data.credits !== undefined) {
        updateData.credits = data.credits;
        planFieldsChanged = true;
      }
      if (data.maxChats !== undefined) {
        updateData.maxChats = data.maxChats;
        planFieldsChanged = true;
      }
      if (data.maxProjects !== undefined) {
        updateData.maxProjects = data.maxProjects;
        planFieldsChanged = true;
      }
      if (data.maxMessages !== undefined) {
        updateData.maxMessages = data.maxMessages;
        planFieldsChanged = true;
      }
      if (data.features !== undefined) {
        updateData.features = data.features;
        planFieldsChanged = true;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: fullUser.id },
          data: updateData,
        });
      }
    }

    // Invalidate caches
    await invalidateAccountCache(fullUser.id);
    if (planFieldsChanged) {
      await invalidateUserLimitsCache(fullUser.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update account error:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Use validateAuth which checks proxy-set headers first (fast path)
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fullUser = await prisma.user.findUnique({
      where: { stackId: user.stackId },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Soft delete - set isActive to false
    await prisma.user.update({
      where: { id: fullUser.id },
      data: { isActive: false },
    });

    // Invalidate all caches for this user
    await invalidateAccountCache(fullUser.id);
    await invalidateUserLimitsCache(fullUser.id);

    return NextResponse.json({ success: true, message: "Account deactivated" });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}