/**
 * PATCH /api/admin/plans/[id] - Update a plan
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";
import { z } from "zod";

const PLANS_CACHE_KEY = "admin:plans";

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().int().min(0).optional(),
  maxChats: z.number().int().optional(),
  maxProjects: z.number().int().optional(),
  maxMessages: z.number().int().optional(),
  maxMemoryItems: z.number().int().optional(),
  maxBranchesPerChat: z.number().int().optional(),
  maxFolders: z.number().int().optional(),
  maxAttachmentsPerChat: z.number().int().optional(),
  maxFileSizeMb: z.number().int().optional(),
  canExport: z.boolean().optional(),
  canApiAccess: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  polarProductId: z.string().optional().nullable(),
  polarPriceId: z.string().optional().nullable(),
});

async function invalidatePlansCache(): Promise<void> {
  try {
    await redis.del(PLANS_CACHE_KEY);
    await redis.del("polar:plans");
  } catch {
    // Redis unavailable
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();
    const parsed = updatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation_error", message: parsed.error.issues } },
        { status: 400 },
      );
    }

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Plan not found" } },
        { status: 404 },
      );
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: parsed.data,
    });

    logAuditEvent({
      action: "ADMIN_PLAN_UPDATE",
      userId: user.id,
      metadata: { planId: id, planTier: updated.tier },
      request,
    });

    await invalidatePlansCache();

    return NextResponse.json({ plan: updated });
  } catch (error) {
    console.error("Admin update plan error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to update plan" } },
      { status: 500 },
    );
  }
}
