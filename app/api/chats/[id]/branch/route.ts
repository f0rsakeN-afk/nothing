import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error("Branch chat error:", error);
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
  }
}