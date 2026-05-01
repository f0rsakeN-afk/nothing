/**
 * Web Search API
 * GET /api/search?q=query&limit=10&offset=0
 * GET /api/search?q=query&scrape=true - Also scrape page contents
 *
 * Returns search results from SearxNG with optional caching and content scraping
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { webSearch } from "@/lib/web-search";
import { scrapeUrls, type ScrapedContent } from "@/lib/scraper";
import { logger } from "@/lib/logger";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    // Check rate limit with user tier from proxy headers
    const rateLimit = await checkRateLimitWithAuth(request, "search");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    // Auth check - required for search (use anonymous only for rate limit tracking)
    let userId = "anonymous";
    let isAuthenticated = false;
    try {
      const user = await stackServerApp.getUser({ tokenStore: request });
      if (user) {
        userId = user.id;
        isAuthenticated = true;
      }
    } catch {
      // Continue with anonymous
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const doScrape = searchParams.get("scrape") === "true";

    if (!query) {
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

    // Sanitize limit and offset
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);

    logger.info("Web search", { query, userId, limit: safeLimit, scrape: doScrape });

    const results = await webSearch(query, {
      limit: safeLimit,
      offset: safeOffset,
    });

    // Optionally scrape content for each result
    if (doScrape) {
      const urls = results.results.map((r) => r.url).slice(0, 5); // Scrape top 5 only
      const scraped: Record<string, ScrapedContent> = {};

      try {
        const contents = await scrapeUrls(urls, 2); // Concurrency of 2
        for (const content of contents) {
          scraped[content.url] = content;
        }
      } catch (error) {
        logger.error("Scraping error", error as Error);
        // Don't fail the whole request if scraping fails
      }

      // Merge scraped content into results
      const resultsWithContent = results.results.map((result) => ({
        ...result,
        scrapedContent: scraped[result.url] || null,
      }));

      return NextResponse.json({
        ...results,
        results: resultsWithContent,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    logger.error("Search API error", error as Error);

    if (error instanceof Error && error.message === "Search service unavailable") {
      return NextResponse.json(
        { error: "Search service temporarily unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
