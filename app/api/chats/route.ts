import { NextRequest, NextResponse } from "next/server";
import { getUserChats, createChat } from "@/lib/stack-server";
import { getOrCreateUser, AccountDeactivatedError } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";
import { createChatSchema } from "@/schemas/validation";
import { logger } from "@/lib/logger";
import { publishChatCreated } from "@/services/chat-pubsub.service";
import { checkLimit } from "@/services/limits/service";
import { limitExceededResponse } from "@/lib/limits/middleware";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    // Validate auth and get user
    const user = await getOrCreateUser(request);

    // Validate query params
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get("limit");
    const rawCursor = searchParams.get("cursor");
    const archived = searchParams.get("archived") === "true";
    const projectId = searchParams.get("projectId");
    const includeShared = searchParams.get("includeShared") === "true";

    // Manual parse to avoid schema caching issues
    const limit = rawLimit ? parseInt(rawLimit, 10) : 20;
    const cursor = rawCursor && rawCursor !== "null" ? rawCursor : undefined;

    const result = await getUserChats(user.id, Math.min(Math.max(limit, 1), 100), cursor, { archived, projectId: projectId || undefined, includeShared });

    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error("Error fetching chats", error as Error, { userId: "unknown" });
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for chat creation
    const rateLimitResult = await rateLimit(request, "chat");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    // Validate auth and get user
    const user = await getOrCreateUser(request);

    // Validate request body
    const body = await request.json().catch(() => ({}));
    const validationResult = createChatSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { projectId, firstMessage } = validationResult.data;

    // Check chat limit before creating
    const limitCheck = await checkLimit(user.id, "CHAT");
    if (!limitCheck.allowed) {
      return limitExceededResponse(limitCheck);
    }

    logger.info("Creating chat", { userId: user.id, projectId });

    const chat = await createChat(user.id, { projectId, firstMessage });

    // Publish new chat event for real-time sync
    await publishChatCreated(chat, user.id);

    return NextResponse.json(
      {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        shouldTriggerAI: chat._shouldTriggerAI,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error("Error creating chat", error as Error, { userId: "unknown" });
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
