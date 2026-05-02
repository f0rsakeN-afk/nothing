import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateAuth } from "@/lib/auth";
import {
  getMemories,
  searchMemories,
  addMemory,
  deleteMemory,
} from "@/services/memory.service";
import { checkMemoryLimit, getUserLimits } from "@/services/limit.service";
import { createMemoryEmbeddings, deleteMemoryEmbeddings } from "@/lib/stack-server";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import {
  unauthorizedError,
  notFoundError,
  badRequestError,
  forbiddenError,
  internalError,
  validationError,
} from "@/lib/api-response";
import { handleApiError } from "@/lib/error-handling";
import {
  memoryQuerySchema,
  createMemorySchema,
  updateMemorySchema,
  memoryIdSchema,
} from "@/lib/validations";
import { updateMemory as updateMemoryService } from "@/services/memory.service";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimitWithAuth(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const user = await validateAuth(request);
    if (!user) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    const parsed = memoryQuerySchema.safeParse(queryParams);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const { q: query, category, limit } = parsed.data;

    if (query?.trim()) {
      const result = await searchMemories(user.id, query, { limit, category });
      return NextResponse.json(result);
    }

    const result = await getMemories(user.id, { limit, category });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError("MemoryGet", error, { requestPath: "/api/memory", method: "GET" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimitWithAuth(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const user = await validateAuth(request);
    if (!user) {
      return unauthorizedError();
    }

    const body = await request.json();
    const parsed = createMemorySchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    // Check memory limit
    const limitCheck = await checkMemoryLimit(user.id);
    if (!limitCheck.allowed) {
      const limits = await getUserLimits(user.id);

      // If feature not available at all
      if (limits.maxMemoryItems === 0) {
        return forbiddenError(
          "Memory feature not available. Upgrade to a paid plan to unlock long-term memory for your AI conversations."
        );
      }

      // If limit reached
      return NextResponse.json(
        {
          error: "Memory limit reached",
          code: "MEMORY_LIMIT_REACHED",
          message: `You've reached your limit of ${limitCheck.limit} memories. Upgrade to store more.`,
          action: "upgrade",
          upgradeTo: limits.maxMemoryItems === 20 ? "Pro" : null,
          limits: {
            current: limitCheck.current,
            max: limitCheck.limit,
          },
        },
        { status: 403 }
      );
    }

    const { title, content, tags, category, metadata } = parsed.data;

    const memory = await addMemory(user.id, {
      title: title || content.slice(0, 100),
      content,
      tags: tags || [],
      category,
      metadata,
    });

    // Create embeddings for RAG
    await createMemoryEmbeddings(memory.id, content);

    return NextResponse.json(memory);
  } catch (error) {
    return handleApiError("MemoryCreate", error, { requestPath: "/api/memory", method: "POST" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimitWithAuth(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const user = await validateAuth(request);
    if (!user) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const idParams = Object.fromEntries(searchParams);
    const idParsed = memoryIdSchema.safeParse(idParams);

    if (!idParsed.success) {
      return badRequestError("Memory ID is required");
    }

    const body = await request.json();
    const parsed = updateMemorySchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const memory = await updateMemoryService(idParsed.data.id, user.id, parsed.data);

    if (!memory) {
      return notFoundError("Memory");
    }

    return NextResponse.json(memory);
  } catch (error) {
    return handleApiError("MemoryUpdate", error, { requestPath: "/api/memory", method: "PUT" });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimitWithAuth(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const user = await validateAuth(request);
    if (!user) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const idParams = Object.fromEntries(searchParams);
    const idParsed = memoryIdSchema.safeParse(idParams);

    if (!idParsed.success) {
      return badRequestError("Memory ID is required");
    }

    // Delete embeddings first
    await deleteMemoryEmbeddings(idParsed.data.id);

    await deleteMemory(idParsed.data.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError("MemoryDelete", error, { requestPath: "/api/memory", method: "DELETE" });
  }
}
