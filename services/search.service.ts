/**
 * Enhanced Search Service
 * Better search relevance without external services
 */

import prisma from "@/lib/prisma";
import { performWebSearch } from "@/lib/scraper";

export interface SearchFilters {
  sourceTypes?: ("stackoverflow" | "reddit" | "github" | "news" | "blog" | "other")[];
  dateRange?: "day" | "week" | "month" | "year" | "any";
  minScore?: number;
}

export interface EnhancedSearchResult {
  id: string;
  query: string;
  sources: SearchSource[];
  images?: { url: string; description: string }[];
  totalResults: number;
  searchEngine: string;
  filters: SearchFilters;
  createdAt: Date;
}

export interface SearchSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  content: string;
  image?: string;
  source: "stackoverflow" | "reddit" | "github" | "news" | "blog" | "other";
  score: number;
  savedAt: string;
  date?: string;
}

/**
 * Perform enhanced search with filtering
 */
export async function enhancedSearch(
  query: string,
  userId: string,
  filters: SearchFilters = {}
): Promise<EnhancedSearchResult> {
  // Perform the actual web search
  const result = await performWebSearch(query);

  // Apply filters to results
  let filteredSources = result.sources;

  // Filter by source type
  if (filters.sourceTypes && filters.sourceTypes.length > 0) {
    filteredSources = filteredSources.filter((source) =>
      filters.sourceTypes!.includes(source.source)
    );
  }

  // Filter by date range
  if (filters.dateRange && filters.dateRange !== "any") {
    const now = new Date();
    let cutoff: Date;

    switch (filters.dateRange) {
      case "day":
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    if (cutoff) {
      filteredSources = filteredSources.filter((source) => {
        if (!source.date) return true; // Include sources without dates
        const sourceDate = new Date(source.date);
        return sourceDate >= cutoff;
      });
    }
  }

  // Filter by minimum score
  if (filters.minScore !== undefined && filters.minScore > 0) {
    filteredSources = filteredSources.filter(
      (source) => source.score >= filters.minScore!
    );
  }

  // Save search to history
  const searchRecord = await prisma.searchResult.create({
    data: {
      userId,
      query,
      sources: filteredSources as unknown as object,
    },
  });

  return {
    id: searchRecord.id,
    query,
    sources: filteredSources,
    images: result.images,
    totalResults: filteredSources.length,
    searchEngine: result.searchEngine,
    filters,
    createdAt: searchRecord.createdAt,
  };
}

/**
 * Get user's search history with sources
 */
export async function getSearchHistory(
  userId: string,
  limit = 20,
  cursor?: string
) {
  const searches = await prisma.searchResult.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  const hasMore = searches.length > limit;
  if (hasMore) searches.pop();

  return {
    searches: searches.map((s) => ({
      id: s.id,
      query: s.query,
      sourcesCount: Array.isArray(s.sources) ? s.sources.length : 0,
      createdAt: s.createdAt,
    })),
    nextCursor: hasMore ? searches[searches.length - 1]?.id : null,
  };
}

/**
 * Get a specific search result with full sources
 */
export async function getSearchById(searchId: string, userId: string) {
  return prisma.searchResult.findFirst({
    where: { id: searchId, userId },
  });
}

/**
 * Delete a search from history
 */
export async function deleteSearch(searchId: string, userId: string) {
  const search = await prisma.searchResult.findFirst({
    where: { id: searchId, userId },
  });

  if (!search) {
    throw new Error("Search not found");
  }

  await prisma.searchResult.delete({ where: { id: searchId } });

  return true;
}

/**
 * Get search analytics for a user
 */
export async function getSearchAnalytics(userId: string, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const searches = await prisma.searchResult.findMany({
    where: {
      userId,
      createdAt: { gte: cutoff },
    },
    select: {
      query: true,
      sources: true,
      createdAt: true,
    },
  });

  // Count searches by day
  const searchesByDay: Record<string, number> = {};
  // Count sources by type
  const sourcesByType: Record<string, number> = {};
  // Most common query terms
  const queryTerms: Record<string, number> = {};

  for (const search of searches) {
    const day = search.createdAt.toISOString().split("T")[0];
    searchesByDay[day] = (searchesByDay[day] || 0) + 1;

    // Count source types
    if (Array.isArray(search.sources)) {
      for (const source of search.sources as unknown as SearchSource[]) {
        sourcesByType[source.source] = (sourcesByType[source.source] || 0) + 1;
      }
    }

    // Count query terms (simple word frequency)
    const words = search.query.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        queryTerms[word] = (queryTerms[word] || 0) + 1;
      }
    }
  }

  // Get top terms
  const topTerms = Object.entries(queryTerms)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);

  return {
    totalSearches: searches.length,
    searchesByDay,
    sourcesByType,
    topSearchTerms: topTerms,
    periodDays: days,
  };
}
