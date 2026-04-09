/**
 * Search API Route
 * POST /api/search - Perform web search with filters and analytics
 * GET /api/search - Get search history
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { enhancedSearch, getSearchHistory, getSearchAnalytics } from "@/services/search.service";
import { MAX_BODY_SIZES, validateBodySize } from "@/services/request-limit.service";

interface SuggestedQuestion {
  id: string;
  question: string;
  topic: string;
}

interface SearchSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  content: string;
  image?: string;
  source: "stackoverflow" | "reddit" | "github" | "news" | "blog" | "other";
  score: number;
  savedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Validate content size
    const contentLength = parseInt(request.headers.get("content-length") || "0");
    const { valid, maxSize } = validateBodySize(contentLength, "search");
    if (!valid) {
      return NextResponse.json(
        { error: `Request body too large. Max size: ${maxSize} bytes` },
        { status: 413 }
      );
    }

    // Authenticate user
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query, filters } = body as {
      query: string;
      filters?: {
        sourceTypes?: string[];
        dateRange?: "day" | "week" | "month" | "year" | "any";
        minScore?: number;
      };
    };

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (query.length > 1000) {
      return NextResponse.json({ error: "Query too long (max 1000 chars)" }, { status: 400 });
    }

    // Perform enhanced search
    const result = await enhancedSearch(query, user.id, {
      sourceTypes: filters?.sourceTypes as ("stackoverflow" | "reddit" | "github" | "news" | "blog" | "other")[] | undefined,
      dateRange: filters?.dateRange,
      minScore: filters?.minScore,
    });

    // Generate suggested questions
    const suggestedQuestions = generateSuggestedQuestions(query, result.sources);

    return NextResponse.json({
      id: result.id,
      sources: result.sources,
      images: result.images,
      suggestedQuestions,
      query: result.query,
      totalResults: result.totalResults,
      searchEngine: result.searchEngine,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "history";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (type === "analytics") {
      const days = parseInt(searchParams.get("days") || "30");
      const analytics = await getSearchAnalytics(user.id, days);
      return NextResponse.json(analytics);
    }

    // Default: return search history
    const cursor = searchParams.get("cursor") || undefined;
    const history = await getSearchHistory(user.id, limit, cursor);

    return NextResponse.json(history);
  } catch (error) {
    console.error("Search history error:", error);
    return NextResponse.json({ error: "Failed to fetch search history" }, { status: 500 });
  }
}

function generateSuggestedQuestions(query: string, sources: SearchSource[]): SuggestedQuestion[] {
  const questions: SuggestedQuestion[] = [];
  const topics = new Set<string>();

  sources.forEach((source) => {
    const words = source.title.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 4 && !["this", "that", "what", "how", "why", "when", "which"].includes(word)) {
        topics.add(word);
      }
    });
  });

  const topicList = Array.from(topics).slice(0, 5);
  const queryLower = query.toLowerCase();

  if (!queryLower.startsWith("what")) {
    questions.push({
      id: crypto.randomUUID(),
      question: `What is ${topicList[0] || "this"}?`,
      topic: topicList[0] || "definition",
    });
  }

  if (!queryLower.startsWith("how")) {
    questions.push({
      id: crypto.randomUUID(),
      question: `How does ${topicList[1] || topicList[0] || "it"} work?`,
      topic: topicList[1] || topicList[0] || "explanation",
    });
  }

  if (!queryLower.startsWith("why") && Math.random() > 0.3) {
    questions.push({
      id: crypto.randomUUID(),
      question: `Why is ${topicList[2] || topicList[0] || "it"} important?`,
      topic: topicList[2] || topicList[0] || "importance",
    });
  }

  if (!queryLower.includes("best") && topicList[3]) {
    questions.push({
      id: crypto.randomUUID(),
      question: `What are best practices for ${topicList[3] || topicList[0]}?`,
      topic: topicList[3] || topicList[0] || "best practices",
    });
  }

  if (!queryLower.includes("example") && topicList[4]) {
    questions.push({
      id: crypto.randomUUID(),
      question: `Can you show me an example of ${topicList[4] || topicList[0] || "it"}?`,
      topic: topicList[4] || topicList[0] || "examples",
    });
  }

  return questions.slice(0, 5);
}
