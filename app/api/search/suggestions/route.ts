/**
 * Search Suggestions API
 * GET /api/search/suggestions?q=partial_query&limit=5
 *
 * Returns search suggestions based on partial query
 * Uses trigram similarity for typo-tolerant suggestions
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { getSearchSuggestions } from "@/services/search.service";
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
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 10);

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    if (query.length > 100) {
      return NextResponse.json(
        { error: "Query too long (max 100 characters)" },
        { status: 400 }
      );
    }

    const suggestions = await getSearchSuggestions(user.id, query, limit);

    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error("Search suggestions API error", error as Error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
