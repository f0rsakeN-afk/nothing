import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { searchChats } from "@/services/search.service";
import { checkSearchRateLimit } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkSearchRateLimit(request);
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    // Auth check
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const projectId = searchParams.get("projectId") || undefined;
    const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined;
    const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const cursor = searchParams.get("cursor") || undefined;

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: "Query too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // Validate date range
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json(
        { error: "dateFrom must be before dateTo" },
        { status: 400 }
      );
    }

    logger.info("Chat search", {
      query,
      userId: user.id,
      projectId,
    });

    const result = await searchChats(user.id, {
      query,
      projectId,
      dateFrom,
      dateTo,
      limit,
      cursor,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Chat search API error", error as Error);
    return NextResponse.json(
      { error: "Failed to search chats" },
      { status: 500 }
    );
  }
}
