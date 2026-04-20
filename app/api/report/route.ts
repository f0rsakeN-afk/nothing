/**
 * Report API
 * POST /api/report - Submit a bug report or issue
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to submit a report." },
        { status: 401 }
      );
    }

    // Get prisma user by stackId to get internal UUID
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { reason, description } = body;

    if (!reason || !description) {
      return NextResponse.json(
        { error: "Reason and description are required." },
        { status: 400 }
      );
    }

    // Create report linked to user
    const report = await prisma.report.create({
      data: {
        userId: prismaUser.id,
        reason,
        description,
        email: user.primaryEmail || "",
        image: body.image || "",
      },
    });

    return NextResponse.json(
      { message: "Report submitted successfully.", id: report.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Report submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit report." },
      { status: 500 }
    );
  }
}
