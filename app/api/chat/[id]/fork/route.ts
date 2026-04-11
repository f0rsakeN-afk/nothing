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

    const { id } = await params;

    // Get the original chat
    const originalChat = await prisma.chat.findFirst({
      where: { id, visibility: "public" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!originalChat) {
      return NextResponse.json({ error: "Chat not found or not public" }, { status: 404 });
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
    console.error("Fork chat error:", error);
    return NextResponse.json({ error: "Failed to fork chat" }, { status: 500 });
  }
}
