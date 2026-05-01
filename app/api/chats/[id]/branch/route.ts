import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import { checkBranchLimit, getUserLimits } from "@/services/limit.service";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "chat");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const body = await request.json().catch(() => ({}));
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    const originalChat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!originalChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const branchPointIndex = originalChat.messages.findIndex((m) => m.id === messageId);
    if (branchPointIndex === -1) {
      return NextResponse.json({ error: "Message not found in chat" }, { status: 404 });
    }

    // Check branch limit
    const limitCheck = await checkBranchLimit(user.id, chatId);
    if (!limitCheck.allowed) {
      const limits = await getUserLimits(user.id);

      if (limits.maxBranchesPerChat === 0) {
        return NextResponse.json(
          {
            error: "Chat branches not available",
            code: "BRANCH_NOT_AVAILABLE",
            message: "Upgrade to a paid plan to unlock chat branching and explore different conversation paths.",
            action: "upgrade",
            upgradeTo: "Pro",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: "Branch limit reached",
          code: "BRANCH_LIMIT_REACHED",
          message: `You've reached the maximum of ${limitCheck.limit} branches for this chat.`,
          action: "upgrade",
          upgradeTo: null,
          limits: {
            current: limitCheck.current,
            max: limitCheck.limit,
          },
        },
        { status: 403 }
      );
    }

    const messagesToCopy = originalChat.messages.slice(0, branchPointIndex + 1);
    const branchTitle = "Branch: " + originalChat.title.slice(0, 42);

    const newChat = await prisma.chat.create({
      data: {
        userId: user.id,
        title: branchTitle,
        visibility: "private",
        parentChatId: chatId,
        messages: {
          create: messagesToCopy.map((m) => ({
            sender: m.sender,
            role: m.role,
            content: m.content,
            type: m.type,
            parentId: m.parentId,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, newChatId: newChat.id, branchTitle });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    console.error("Branch chat error:", error);
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
  }
}