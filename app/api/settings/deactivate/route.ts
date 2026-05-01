/**
 * Settings - Deactivate Account
 * POST /api/settings/deactivate - Deactivate user account (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";
import {
  unauthorizedError,
  notFoundError,
  badRequestError,
  internalError,
} from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimitWithAuth(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return unauthorizedError();
    }

    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true, isActive: true },
    });

    if (!prismaUser) {
      return notFoundError("User");
    }

    if (!prismaUser.isActive) {
      return badRequestError("Account is already deactivated");
    }

    // Soft deactivate - set isActive to false
    await prisma.user.update({
      where: { id: prismaUser.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Account has been deactivated",
    });
  } catch (error) {
    console.error("Deactivate account error:", error);
    return internalError("Failed to deactivate account");
  }
}
