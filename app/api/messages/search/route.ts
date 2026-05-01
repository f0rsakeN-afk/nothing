/**
 * Message Search API
 * GET /api/messages/search?q=query&chatId=xxx&projectId=xxx&sender=user&dateFrom=xxx&dateTo=xxx&limit=20&cursor=xxx
 *
 * Advanced search within chat messages with filters
 * Uses PostgreSQL full-text search with ranking
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { searchMessages, type SearchFilters } from "@/services/search.service";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = await checkRateLimitWithAuth(request, "search");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    // Auth check
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse search filters from query params
    const filters: SearchFilters = {
      query: searchParams.get("q") || searchParams.get("query") || "",
      chatId: searchParams.get("chatId") || undefined,
      projectId: searchParams.get("projectId") || undefined,
      sender: (searchParams.get("sender") as "user" | "assistant") || undefined,
      dateFrom: searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined,
      dateTo: searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined,
      limit: Math.min(parseInt(searchParams.get("limit") || "20", 10), 100),
      cursor: searchParams.get("cursor") || undefined,
    };

    if (!filters.query.trim()) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    if (filters.query.length > 500) {
      return NextResponse.json(
        { error: "Query too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // Validate date range
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      return NextResponse.json(
        { error: "dateFrom must be before dateTo" },
        { status: 400 }
      );
    }

    logger.info("Message search", {
      query: filters.query,
      userId: user.id,
      chatId: filters.chatId,
      projectId: filters.projectId,
    });

    const results = await searchMessages(user.id, filters);

    return NextResponse.json(results);
  } catch (error) {
    logger.error("Message search API error", error as Error);
    return NextResponse.json(
      { error: "Failed to search messages" },
      { status: 500 }
    );
  }
}
