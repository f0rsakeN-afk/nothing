import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { visibility } = body as { visibility?: "public" | "private" };

    if (!visibility || !["public", "private"].includes(visibility)) {
      return NextResponse.json({ error: "Valid visibility required" }, { status: 400 });
    }

    // Verify user owns this chat
    const chat = await prisma.chat.findFirst({
      where: { id, userId: user.id },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    await prisma.chat.update({
      where: { id },
      data: { visibility },
    });

    return NextResponse.json({ success: true, visibility });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    console.error("Chat visibility update error:", error);
    return NextResponse.json({ error: "Failed to update visibility" }, { status: 500 });
  }
}
