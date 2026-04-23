/**
 * Settings - Deactivate Account
 * POST /api/settings/deactivate - Deactivate user account (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true, isActive: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!prismaUser.isActive) {
      return NextResponse.json({ error: "Account is already deactivated" }, { status: 400 });
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
    return NextResponse.json({ error: "Failed to deactivate account" }, { status: 500 });
  }
}
