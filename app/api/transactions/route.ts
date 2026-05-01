/**
 * Transactions API
 * GET /api/transactions - Get user's payment transaction history
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimitWithAuth(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.paymentTransaction.findMany({
      where: { userId: user.id },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            tier: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to recent 50 transactions
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("[Transactions API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}