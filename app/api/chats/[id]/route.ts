import { NextRequest, NextResponse } from "next/server";
import { getChatById, updateChat, deleteChat } from "@/lib/stack-server";
import { validateAuth } from "@/lib/auth";
import { publishChatRenamed, publishChatArchived, publishChatDeleted } from "@/services/chat-pubsub.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const chat = await getChatById(id, user.id);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, archivedAt, projectId, pinnedAt } = body;

    const chat = await updateChat(id, user.id, {
      ...(title !== undefined && { title }),
      ...(archivedAt !== undefined && { archivedAt }),
      ...(projectId !== undefined && { projectId }),
      ...(pinnedAt !== undefined && { pinnedAt }),
    });

    // Publish events for real-time sync
    if (title !== undefined) {
      await publishChatRenamed(id, user.id, title);
    }
    if (archivedAt !== undefined) {
      await publishChatArchived(id, user.id);
    }

    return NextResponse.json({
      ...chat,
      archivedAt: chat.archivedAt?.toISOString() ?? null,
      pinnedAt: chat.pinnedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteChat(id, user.id);

    // Publish delete event for real-time sync
    await publishChatDeleted(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
