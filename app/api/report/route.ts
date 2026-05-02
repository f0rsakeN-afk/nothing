/**
 * Report API
 * POST /api/report - Submit a bug report or issue
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import { notFoundError, validationError } from "@/lib/api-response";
import { handleApiError } from "@/lib/error-handling";
import { createReportSchema } from "@/lib/validations/api.validation";
import { validateRequestOrigin, csrfErrorResponse } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF origin
    const csrfError = validateRequestOrigin(request);
    if (csrfError) return csrfError;

    // Rate limiting
    const rateLimitResult = await checkRateLimitWithAuth(request, "default");
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
    const parsed = createReportSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const { reason, description } = parsed.data;

    // Create report linked to user
    const report = await prisma.report.create({
      data: {
        userId: prismaUser.id,
        reason,
        description,
        email: user.primaryEmail || "",
        image: parsed.data.image || "",
      },
    });

    return NextResponse.json(
      { message: "Report submitted successfully.", id: report.id },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError("ReportSubmission", error, {
      requestPath: "/api/report",
      method: "POST",
    });
  }
}
