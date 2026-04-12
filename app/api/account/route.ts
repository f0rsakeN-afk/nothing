/**
 * Account API
 * GET/PATCH /api/account - Get or update user account info and subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { updateAccountSchema } from "@/schemas/validation";
import { getPlan } from "@/services/plan.service";

export type PlanType = "free" | "basic" | "pro" | "enterprise";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get full user with settings and customize
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        chats: { where: { archivedAt: null } },
        projects: { where: { archivedAt: null } },
        userPlan: true,
        subscription: true,
      },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get plan limits from DB
    const planData = fullUser.userPlan || (await getPlan("free"))!;
    const hasSubscription = fullUser.subscription?.status === "ACTIVE" || fullUser.subscription?.status === "TRIALING";
    const subscription = fullUser.subscription;

    // Count usage
    const chatCount = fullUser.chats.length;
    const projectCount = fullUser.projects.length;

    // Get message count from all chats
    const messageCountResult = await prisma.message.count({
      where: {
        chat: {
          userId: fullUser.id,
        },
      },
    });

    return NextResponse.json({
      profile: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.email?.split("@")[0] || "User",
        createdAt: fullUser.createdAt,
      },
      plan: {
        name: planData.id,
        displayName: planData.name,
        credits: fullUser.credits,
        limits: {
          chats: planData.maxChats === -1 ? "unlimited" : planData.maxChats,
          projects: planData.maxProjects === -1 ? "unlimited" : planData.maxProjects,
          messages: planData.maxMessages === -1 ? "unlimited" : planData.maxMessages,
        },
        features: planData.features,
        limitsDetail: {
          maxMemoryItems: planData.maxMemoryItems,
          maxBranchesPerChat: planData.maxBranchesPerChat,
          maxFolders: planData.maxFolders,
          maxAttachmentsPerChat: planData.maxAttachmentsPerChat,
          maxFileSizeMb: planData.maxFileSizeMb,
          canExport: planData.canExport,
          canApiAccess: planData.canApiAccess,
        },
      },
      subscription: subscription
        ? {
            active: true,
            status: subscription.status,
            periodEnd: subscription.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : { active: false },
      usage: {
        chats: chatCount,
        projects: projectCount,
        messages: messageCountResult,
      },
    });
  } catch (error) {
    console.error("Get account error:", error);
    return NextResponse.json({ error: "Failed to get account" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update plan/credits
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
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

    // Plan changes require admin role (would check via middleware in production)
    // For now, allow users to update their own profile name
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      // Name is stored in customize, not directly on user
      await prisma.customize.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          name: data.name,
          responseTone: "professional",
          knowledgeDetail: "BALANCED",
          interest: [],
        },
        update: { name: data.name },
      });
    }

    // These fields are admin-only in production
    if (fullUser.role === "ADMIN" || fullUser.role === "MODERATOR") {
      if (data.plan !== undefined) updateData.planTier = data.plan.toUpperCase();
      if (data.credits !== undefined) updateData.credits = data.credits;
      if (data.maxChats !== undefined) updateData.maxChats = data.maxChats;
      if (data.maxProjects !== undefined) updateData.maxProjects = data.maxProjects;
      if (data.maxMessages !== undefined) updateData.maxMessages = data.maxMessages;
      if (data.features !== undefined) updateData.features = data.features;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update account error:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
