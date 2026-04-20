import prisma from "@/lib/prisma";
import { feedbackSchema } from "@/schemas/feedback.schema";
import { stackServerApp } from "@/src/stack/server";
import { NextRequest, NextResponse } from "next/server";
import { treeifyError } from "zod";
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(req, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    const user = await stackServerApp.getUser({ tokenStore: req });

    if (!user) {
      return NextResponse.json(
        {
          message: "You are not authorized. Please signin to get access",
        },
        { status: 401 },
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

    const body = await req.json();

    const parsed = await feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    await prisma.feedback.create({
      data: {
        ...parsed.data,
        userId: prismaUser.id,
      },
    });

    return NextResponse.json(
      { message: "Feedback submitted successfully." },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error?.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: req });

    if (!user) {
      return NextResponse.json(
        { message: "You are not authorized. Please signin to get access" },
        { status: 401 }
      );
    }

    return NextResponse.json({ message: "Feedback endpoint working" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
