import { NextRequest, NextResponse } from "next/server";
import { getChatMessages, addChatMessage } from "@/lib/stack-server";
import { validateAuth } from "@/lib/auth";
import { publishMessageNew } from "@/services/chat-pubsub.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const cursor = searchParams.get("cursor") || undefined;
    const direction = (searchParams.get("direction") as "before" | "after") || "before";

    const result = await getChatMessages(chatId, user.id, limit, cursor, direction);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const { role, content } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: "Missing role or content" },
        { status: 400 }
      );
    }

    if (role !== "user" && role !== "assistant") {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const message = await addChatMessage(chatId, user.id, { role, content });

    // Publish new message event for real-time sync
    await publishMessageNew(chatId, user.id, {
      id: message.id,
      role: message.role || "user",
      content: message.content,
      createdAt: message.createdAt,
    });

    return NextResponse.json(
      {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding message:", error);
    return NextResponse.json(
      { error: "Failed to add message" },
      { status: 500 }
    );
  }
}
