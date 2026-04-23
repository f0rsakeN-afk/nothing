import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the original chat by shareToken (not by chat id)
    const originalChat = await prisma.chat.findFirst({
      where: { shareToken: id, visibility: "public" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!originalChat) {
      return NextResponse.json({ error: "Chat not found or not public" }, { status: 404 });
    }

    // Check if share link has expired
    if (originalChat.shareExpiry && originalChat.shareExpiry < new Date()) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    // Create a new chat for the current user
    const newChat = await prisma.chat.create({
      data: {
        userId: user.id,
        title: `Fork of ${originalChat.title}`,
        visibility: "private",
        messages: {
          create: originalChat.messages.map((m) => ({
            sender: m.sender,
            role: m.role,
            content: m.content,
            type: m.type,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, newChatId: newChat.id });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    console.error("Fork chat error:", error);
    return NextResponse.json({ error: "Failed to fork chat" }, { status: 500 });
  }
}
