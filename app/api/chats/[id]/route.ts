import { NextRequest, NextResponse } from "next/server";
import { getChatById, updateChat, deleteChat } from "@/lib/stack-server";
import { validateAuth } from "@/lib/auth";
import { requireChatAccess, getChatRole, PERMISSIONS } from "@/lib/chat-access";
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

    // Check access (any role can view)
    await requireChatAccess(user.id, id, "VIEWER");

    const chat = await getChatById(id, user.id);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
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
    const { title, archivedAt, projectId, pinnedAt, visibility } = body;

    // Check access - need at least EDITOR for most changes
    const role = await requireChatAccess(user.id, id, "EDITOR");

    // Check specific permissions
    if (title !== undefined && !PERMISSIONS.canEditTitle(role)) {
      return NextResponse.json({ error: "You cannot edit the chat title" }, { status: 403 });
    }
    if (visibility !== undefined && role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can change visibility" }, { status: 403 });
    }

    const chat = await updateChat(id, user.id, {
      ...(title !== undefined && { title }),
      ...(archivedAt !== undefined && { archivedAt }),
      ...(projectId !== undefined && { projectId }),
      ...(pinnedAt !== undefined && { pinnedAt }),
      ...(visibility !== undefined && { visibility }),
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
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
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

    // Check access - need OWNER to delete
    await requireChatAccess(user.id, id, "OWNER");

    await deleteChat(id, user.id);

    // Publish delete event for real-time sync
    await publishChatDeleted(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
