import { NextRequest, NextResponse } from "next/server";
import { getChatMessages, addChatMessage } from "@/lib/stack-server";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import { requireChatAccess, PERMISSIONS, getChatRole } from "@/lib/chat-access";
import { publishMessageNew } from "@/services/chat-pubsub.service";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const cursor = searchParams.get("cursor") || undefined;
    const direction = (searchParams.get("direction") as "before" | "after") || "before";

    // Check access (any role can view messages)
    await requireChatAccess(user.id, chatId, "VIEWER");

    const result = await getChatMessages(chatId, user.id, limit, cursor, direction);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
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
    // Rate limiting
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const body = await request.json();
    const { role, content, fileIds } = body;

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

    // Check access - viewers cannot send messages
    const userRole = await requireChatAccess(user.id, chatId, "VIEWER");
    if (!PERMISSIONS.canSendMessage(userRole)) {
      return NextResponse.json({ error: "Viewers cannot send messages" }, { status: 403 });
    }

    const message = await addChatMessage(chatId, user.id, { role, content }, fileIds);

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
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error adding message:", error);
    return NextResponse.json(
      { error: "Failed to add message" },
      { status: 500 }
    );
  }
}
