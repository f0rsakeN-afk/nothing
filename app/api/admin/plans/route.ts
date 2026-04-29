/**
 * GET /api/admin/plans - List all plans
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const PLANS_CACHE_KEY = "admin:plans";

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

    logAuditEvent({ action: "ADMIN_PLAN_LIST", userId: user.id, request });

    const cached = await redis.get(PLANS_CACHE_KEY);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
    });

    await redis.setex(PLANS_CACHE_KEY, 60, JSON.stringify(plans));
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Admin plans list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch plans" } },
      { status: 500 },
    );
  }
}
