import prisma from "@/lib/prisma";
import { feedbackSchema } from "@/schemas/feedback.schema";
import { stackServerApp } from "@/src/stack/server";
import { NextRequest, NextResponse } from "next/server";
import { treeifyError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: req });

    if (!user) {
      return NextResponse.json(
        {
          message: "You are not authorized. Please signin to get access",
        },
        { status: 401 },
      );
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
        userId: user.id,
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
      return NextResponse.json({
        message: "You are not authorized. Please signin to get access",
      });
    }

    return NextResponse.json({ message: "Feedback endpoint working" });
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
