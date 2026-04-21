/**
 * Customize API
 * GET/PATCH /api/customize - Get or update user customization preferences
 * GET uses Redis caching via preferences.service.ts
 * PATCH invalidates cache after update
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { updateCustomizeSchema } from "@/schemas/validation";
import { getUserPreferences, invalidateUserPreferencesCache } from "@/services/preferences.service";
import { invalidateAccountCache } from "@/services/account.service";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get prisma user by stackId to get the numeric id
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true, email: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use cached preferences
    const preferences = await getUserPreferences(prismaUser.id, prismaUser.email);

    return NextResponse.json({
      firstName: preferences.firstName,
      lastName: preferences.lastName,
      preferredName: preferences.name,
      responseTone: preferences.tone,
      detailLevel: preferences.detailLevel.toLowerCase(),
      interests: preferences.interests.join(", ") || "",
    });
  } catch (error) {
    console.error("Get customize error:", error);
    return NextResponse.json({ error: "Failed to get preferences" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get prisma user by stackId to get the numeric id
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true, email: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateCustomizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { firstName, lastName, preferredName, responseTone, detailLevel, interests } = parsed.data;

    // Map detailLevel to enum value
    const knowledgeDetail = detailLevel?.toUpperCase() as "CONCISE" | "BALANCED" | "DETAILED";
    const interestArray = interests
      ? interests.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const customize = await prisma.customize.upsert({
      where: { userId: prismaUser.id },
      create: {
        userId: prismaUser.id,
        firstName: firstName || "",
        lastName: lastName || "",
        name: preferredName || prismaUser.email?.split("@")[0] || "User",
        responseTone: responseTone || "professional",
        knowledgeDetail: (knowledgeDetail as "CONCISE" | "BALANCED" | "DETAILED") || "BALANCED",
        interest: interestArray,
      },
      update: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(preferredName !== undefined && { name: preferredName }),
        ...(responseTone !== undefined && { responseTone }),
        ...(detailLevel !== undefined && { knowledgeDetail: knowledgeDetail as "CONCISE" | "BALANCED" | "DETAILED" }),
        ...(interests !== undefined && { interest: interestArray }),
      },
    });

    // Invalidate cache so next request gets fresh data
    await invalidateUserPreferencesCache(prismaUser.id);
    await invalidateAccountCache(prismaUser.id);

    return NextResponse.json({
      firstName: customize.firstName || "",
      lastName: customize.lastName || "",
      preferredName: customize.name,
      responseTone: customize.responseTone,
      detailLevel: customize.knowledgeDetail.toLowerCase(),
      interests: customize.interest?.join(", ") || "",
    });
  } catch (error) {
    console.error("Update customize error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
