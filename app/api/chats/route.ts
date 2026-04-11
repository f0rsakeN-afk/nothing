import { NextRequest, NextResponse } from "next/server";
import { getUserChats, createChat } from "@/lib/stack-server";
import { getOrCreateUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";
import { createChatSchema } from "@/schemas/validation";
import { logger } from "@/lib/logger";

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

    // Manual parse to avoid schema caching issues
    const limit = rawLimit ? parseInt(rawLimit, 10) : 20;
    const cursor = rawCursor && rawCursor !== "null" ? rawCursor : undefined;

    const result = await getUserChats(user.id, Math.min(Math.max(limit, 1), 100), cursor, { archived, projectId: projectId || undefined });

    return NextResponse.json(result);
  } catch (error) {
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

    logger.info("Creating chat", { userId: user.id, projectId });

    const chat = await createChat(user.id, { projectId, firstMessage });

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
