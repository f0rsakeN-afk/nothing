import { NextRequest, NextResponse } from "next/server";
import promptsData from "@/data/prompts.json";
import { trackPromptUsage } from "@/services/trending.service";
import { logger } from "@/lib/logger";
import { internalError, validationError } from "@/lib/api-response";
import { suggestQuerySchema } from "@/lib/validations/api.validation";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

type TrieNode = {
  isEnd?: true;
  children: Map<string, TrieNode>;
};

const trieRoot: TrieNode = { children: new Map() };
const wordIndex: Map<string, Set<string>> = new Map();
const promptLowercase: string[] = [];
const promptOriginal: string[] = [];

function buildIndexes() {
  for (const prompts of Object.values(promptsData as Record<string, string[]>)) {
    for (const prompt of prompts) {
      if (promptLowercase.length >= 100000) break;
      const lower = prompt.toLowerCase();
      promptLowercase.push(lower);
      promptOriginal.push(prompt);

      let node = trieRoot;
      for (const char of lower) {
        if (!node.children.has(char)) {
          node.children.set(char, { children: new Map() });
        }
        node = node.children.get(char)!;
      }
      node.isEnd = true;

      const words = lower.split(/\s+/).filter(w => w.length > 1);
      for (const word of words) {
        if (!wordIndex.has(word)) {
          wordIndex.set(word, new Set());
        }
        wordIndex.get(word)!.add(lower);
      }
    }
  }

  logger.info(`[suggest] Built index with ${promptLowercase.length} prompts`);
}

function searchTrie(query: string, limit: number): string[] {
  const results: string[] = [];
  let node: TrieNode = trieRoot;

  for (const char of query) {
    const next = node.children.get(char);
    if (!next) break;
    node = next;
  }

  type StackItem = { node: TrieNode; prefix: string };
  const stack: StackItem[] = [{ node, prefix: "" }];

  while (stack.length > 0 && results.length < limit) {
    const current = stack.pop()!;

    if (current.node.isEnd) {
      const original = promptOriginal[promptLowercase.indexOf(current.prefix)];
      if (original && !results.includes(original)) {
        results.push(original);
      }
    }

    for (const [char, child] of current.node.children) {
      stack.push({ node: child, prefix: current.prefix + char });
    }
  }

  return results;
}

function searchFuzzy(query: string, existing: Set<string>, limit: number): string[] {
  const results: string[] = [];
  const queryWords = query.split(/\s+/).filter(w => w.length > 1);

  if (queryWords.length === 0) return results;

  const scores = new Map<string, number>();

  for (const word of queryWords) {
    const partialMatches = wordIndex.get(word);
    if (!partialMatches) continue;

    for (const lowerPrompt of partialMatches) {
      if (existing.has(lowerPrompt)) continue;
      const current = scores.get(lowerPrompt) || 0;
      scores.set(lowerPrompt, current + 1);
    }
  }

  const sorted = [...scores.entries()]
    .filter(([_, score]) => score === queryWords.length)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  for (const [lowerPrompt] of sorted) {
    const idx = promptLowercase.indexOf(lowerPrompt);
    if (idx !== -1) results.push(promptOriginal[idx]);
  }

  return results;
}

function performSearch(q: string): string[] {
  const suggestions: string[] = [];
  const used = new Set<string>();

  const prefixResults = searchTrie(q, 50);
  for (const prompt of prefixResults) {
    if (!used.has(prompt)) {
      suggestions.push(prompt);
      used.add(prompt);
    }
  }

  if (suggestions.length < 5) {
    const fuzzyResults = searchFuzzy(q, used, 50);
    for (const prompt of fuzzyResults) {
      if (!used.has(prompt)) {
        suggestions.push(prompt);
        used.add(prompt);
      }
    }
  }

  if (suggestions.length === 0) {
    suggestions.push(
      `${q} - explain in detail`,
      `How to solve ${q}?`,
      `Best practices for ${q}`,
      `Examples of ${q}`,
      `${q} tutorial`
    );
  }

  return suggestions.slice(0, 5);
}

// Pre-warm common query prefixes at startup
const commonPrefixes = [
  "how", "what", "why", "best", "tips", "how to", "what is", "how do",
  "why do", "best way", "how can", "should i", "is it", "can i", "will",
  "when", "where", "who", "which", "does", "has", "have", "tell",
  "give", "make", "show", "find", "get", "learn", "write", "buy",
  "sell", "use", "try", "start", "stop", "need", "want", "love",
];

// Cache pre-warmed results
const preWarmedCache = new Map<string, string[]>();
for (const prefix of commonPrefixes) {
  preWarmedCache.set(prefix, performSearch(prefix));
}

buildIndexes();

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    const parsed = suggestQuerySchema.safeParse(queryParams);

    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const q = parsed.data.q.toLowerCase().trim();

    // Check pre-warmed cache first (instant)
    const preWarmed = preWarmedCache.get(q);
    if (preWarmed) {
      return NextResponse.json({ suggestions: preWarmed, cached: true });
    }

    const suggestions = performSearch(q);
    return NextResponse.json({ suggestions, cached: false });
  } catch (error) {
    logger.error("[suggest] Failed to get suggestions", error as Error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
