/**
 * Web Search Service
 * Wraps SearxNG with Redis caching and circuit breaker
 */

import redis, { KEYS, TTL } from "@/lib/redis";
import { getCircuitBreaker, CircuitBreakerOpenError } from "@/services/circuit-breaker.service";

const SEARXNG_BASE_URL = process.env.SEARXNG_BASE_URL || "http://localhost:8888";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  engine: string;
  publishedDate?: string;
  thumbnail?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
  cached: boolean;
  source: "searxng" | "cache";
}

interface SearxNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  publishedDate?: string;
  thumbnail?: string;
}

interface SearxNGResponse {
  results: SearxNGResult[];
  number_of_results: number;
  query: string;
}

/**
 * Normalize SearxNG results to our SearchResult format
 */
function normalizeResult(result: SearxNGResult): SearchResult {
  return {
    title: result.title || "Untitled",
    url: result.url || "",
    description: result.content || "",
    engine: result.engine || "unknown",
    publishedDate: result.publishedDate,
    thumbnail: result.thumbnail,
  };
}

/**
 * Generate cache key for a search query
 */
function getCacheKey(query: string): string {
  return `search:${query.toLowerCase().trim()}`;
}

// Get circuit breaker for SearxNG
const searxBreaker = getCircuitBreaker("searxng");

/**
 * Search using SearxNG with Redis caching and circuit breaker
 */
export async function webSearch(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<SearchResponse> {
  if (!query.trim()) {
    return { results: [], query, total: 0, cached: false, source: "searxng" };
  }

  const { limit = 10, offset = 0 } = options || {};
  const cacheKey = getCacheKey(query);

  // Try cache first (cache bypasses circuit breaker)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as SearchResponse;
      return { ...parsed, cached: true };
    }
  } catch {
    // Redis not available, continue without cache
  }

  // Query SearxNG with circuit breaker protection
  try {
    const data = await searxBreaker.execute(async () => {
      const searxUrl = new URL(`${SEARXNG_BASE_URL}/search`);
      searxUrl.searchParams.set("q", query);
      searxUrl.searchParams.set("format", "json");
      searxUrl.searchParams.set("engines", "google,bing,duckduckgo");
      searxUrl.searchParams.set("count", String(limit));

      const response = await fetch(searxUrl.toString(), {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Eryx/1.0 (search interface)",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`SearxNG returned ${response.status}`);
      }

      return response.json() as Promise<SearxNGResponse>;
    });

    const results: SearchResult[] = (data.results || []).map(normalizeResult);
    const total = data.number_of_results || results.length;

    const searchResponse: SearchResponse = {
      results,
      query,
      total,
      cached: false,
      source: "searxng",
    };

    // Cache the results
    try {
      await redis.setex(cacheKey, TTL.searchResults || 3600, JSON.stringify(searchResponse));
    } catch {
      // Redis not available, skip caching
    }

    return searchResponse;
  } catch (error) {
    // If circuit breaker is open, throw specific error
    if (error instanceof CircuitBreakerOpenError) {
      throw new Error("Search service unavailable");
    }
    console.error("Web search error:", error);
    throw new Error("Search service unavailable");
  }
}

/**
 * Invalidate search cache for a query
 */
export async function invalidateSearchCache(query: string): Promise<void> {
  const cacheKey = getCacheKey(query);
  try {
    await redis.del(cacheKey);
  } catch {
    // Ignore if Redis not available
  }
}
