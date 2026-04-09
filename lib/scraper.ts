/**
 * Web Scraper Service
 * Free, self-hosted scraping with bot detection bypass strategies
 * Supports: DuckDuckGo HTML, Brave Search API
 * Includes Redis caching for search results and images
 */

import redis, { KEYS, TTL } from "./redis";

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
  keyPoints?: string[];    // Extracted key points for LLM context
  codeSnippet?: string;    // Best code snippet from content
}

// Site-specific content extractor types
type SiteExtractor = {
  extractTitle(html: string): string;
  extractSnippet(html: string): string;
  extractContent(html: string): string;
  extractKeyPoints(html: string, content: string): string[];
  extractCode(html: string): string | undefined;
};

export interface SearchImage {
  url: string;
  description: string;
}

export interface SearchResult {
  sources: SearchSource[];
  images: SearchImage[];
  query: string;
  totalResults: number;
  searchEngine: string;
}

// User-agent rotation list
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
];

// Source priority weights (for community/technical content first)
const SOURCE_PRIORITY: Record<string, number> = {
  "stackoverflow.com": 10,
  "superuser.com": 9,
  "reddit.com": 9,
  "old.reddit.com": 9,
  "github.com": 8,
  "dev.to": 7,
  "blog.dev": 7,
  "news.ycombinator.com": 6,
  "medium.com": 5,
  "default": 3,
};

// Freshness weights (prefer recent content)
const FRESHNESS_BOOST = {
  "24h": 2.0,
  "week": 1.5,
  "month": 1.2,
  "older": 1.0,
};

// Delay between requests (ms)
const REQUEST_DELAY_MS = 800;
let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getSourceType(url: string): SearchSource["source"] {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("stackoverflow.com") || hostname.includes("superuser.com")) {
    return "stackoverflow";
  }
  if (hostname.includes("reddit.com") || hostname.includes("old.reddit.com")) {
    return "reddit";
  }
  if (hostname.includes("github.com")) {
    return "github";
  }
  if (hostname.includes("news.ycombinator.com")) {
    return "news";
  }
  if (
    hostname.includes("dev.to") ||
    hostname.includes("blog.dev") ||
    hostname.includes("medium.com")
  ) {
    return "blog";
  }
  return "other";
}

function getSourceScore(url: string): number {
  const hostname = new URL(url).hostname.toLowerCase();
  for (const [domain, score] of Object.entries(SOURCE_PRIORITY)) {
    if (hostname.includes(domain)) {
      return score;
    }
  }
  return SOURCE_PRIORITY["default"];
}

// Extract date from URL or snippet for freshness ranking
function getContentDate(html: string, url: string): string | undefined {
  // Try to find date in meta tags
  const dateMatch = html.match(
    /<meta[^>]+(?:property|name)=["']article:published_time["'][^>]+content=["']([^"']+)["']/i
  );
  if (dateMatch) return dateMatch[1];

  // Try OpenGraph date
  const ogDateMatch = html.match(
    /<meta[^>]+property=["']og:article:published_time["'][^>]+content=["']([^"']+)["']/i
  );
  if (ogDateMatch) return ogDateMatch[1];

  // Try time tag
  const timeMatch = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (timeMatch) return timeMatch[1];

  return undefined;
}

// Calculate freshness score
function getFreshnessScore(dateStr: string | undefined): number {
  if (!dateStr) return FRESHNESS_BOOST["older"];

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (hoursDiff <= 24) return FRESHNESS_BOOST["24h"];
    if (hoursDiff <= 168) return FRESHNESS_BOOST["week"]; // 7 days
    if (hoursDiff <= 720) return FRESHNESS_BOOST["month"]; // 30 days
    return FRESHNESS_BOOST["older"];
  } catch {
    return FRESHNESS_BOOST["older"];
  }
}

// Site-specific content extractors for semantic chunking
const siteExtractors: Record<string, SiteExtractor> = {
  stackoverflow: {
    extractTitle(html: string) {
      const match = html.match(/<h1[^>]+class=["']question-hyperlink["'][^>]*>([^<]+)<\/h1>/i);
      return match ? match[1].trim() : "";
    },
    extractSnippet(html: string) {
      // Get the question body excerpt
      const match = html.match(/<div[^>]+class=["']excerpt["'][^>]*>([^<]+)<\/div>/i);
      return match ? match[1].replace(/<[^>]+>/g, "").trim().slice(0, 300) : "";
    },
    extractContent(html: string) {
      // Extract question + accepted answer
      let content = "";
      const questionMatch = html.match(/<div[^>]+class=["']question["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class=["']answer["'][^>]*>([\s\S]*?)<\/div>/i);
      if (questionMatch) {
        content = questionMatch[1] + "\n\nAccepted Answer:\n" + questionMatch[2];
      }
      return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    },
    extractKeyPoints(html: string, content: string) {
      const points: string[] = [];
      // Extract vote count + answer count
      const votesMatch = html.match(/<span[^>]+class=["']vote-count-post["'][^>]*>([^<]+)<\/span>/gi);
      if (votesMatch) points.push(`${votesMatch.length} votes`);
      // Extract tags
      const tagMatches = html.match(/<a[^>]+class=["']post-tag["'][^>]*>([^<]+)<\/a>/gi);
      if (tagMatches) points.push(`Tags: ${tagMatches.map(t => t.replace(/<[^>]+>/g, "")).join(", ")}`);
      return points;
    },
    extractCode(html: string) {
      // Get first code block from accepted answer
      const codeMatch = html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
      if (codeMatch) return codeMatch[1].replace(/<[^>]+>/g, "").trim();
      // Fallback to any code block
      const anyCode = html.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
      return anyCode ? anyCode[1].replace(/<[^>]+>/g, "").trim() : undefined;
    },
  },
  reddit: {
    extractTitle(html: string) {
      const match = html.match(/<h2[^>]*>[^<]*<a[^>]*>([^<]+)<\/a>/i);
      return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
    },
    extractSnippet(html: string) {
      const match = html.match(/<div[^>]+class=["']usertext["'][^>]*>([^<]+)<\/div>/i);
      return match ? match[1].replace(/<[^>]+>/g, "").trim().slice(0, 300) : "";
    },
    extractContent(html: string) {
      // Extract post + top comments
      let content = "";
      const postMatch = html.match(/<div[^>]+class=["']usertext["'][^>]*>([\s\S]*?)<\/div>/i);
      if (postMatch) content = postMatch[1];
      const comments = html.match(/<div[^>]+class=["']comment["'][^>]*>([\s\S]*?)<\/div>/gi);
      if (comments && comments.length > 0) {
        content += "\n\nTop Comments:\n" + comments.slice(0, 3).join("\n");
      }
      return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    },
    extractKeyPoints(html: string) {
      const points: string[] = [];
      const scoreMatch = html.match(/<div[^>]+class=["']score["'][^>]*>([^<]+)<\/div>/i);
      if (scoreMatch) points.push(`Score: ${scoreMatch[1]}`);
      return points;
    },
    extractCode() {
      return undefined;
    },
  },
  github: {
    extractTitle(html: string) {
      const match = html.match(/<h1[^>]+class=["']entry-title["'][^>]*>([^<]+)<\/h1>/i);
      return match ? match[1].trim() : "";
    },
    extractSnippet(html: string) {
      const match = html.match(/<p[^>]+class=["']lead["'][^>]*>([^<]+)<\/p>/i);
      return match ? match[1].replace(/<[^>]+>/g, "").trim().slice(0, 300) : "";
    },
    extractContent(html: string) {
      // Extract README content
      const readmeMatch = html.match(/<article[^>]+class=["']markdown-body["'][^>]*>([\s\S]*?)<\/article>/i);
      return readmeMatch ? readmeMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
    },
    extractCode(html: string) {
      const codeMatch = html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
      return codeMatch ? codeMatch[1].replace(/<[^>]+>/g, "").trim() : undefined;
    },
    extractKeyPoints() {
      return [];
    },
  },
  default: {
    extractTitle(html: string) {
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? match[1].trim() : "";
    },
    extractSnippet(html: string) {
      const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
      return match ? match[1].trim().slice(0, 300) : "";
    },
    extractContent(html: string) {
      // Extract first meaningful paragraphs
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      const content = (articleMatch || mainMatch || ["", html])[0];
      return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
    },
    extractKeyPoints() {
      return [];
    },
    extractCode() {
      return undefined;
    },
  },
};

/**
 * Get appropriate extractor for a URL
 */
function getExtractor(url: string): SiteExtractor {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("stackoverflow.com") || hostname.includes("superuser.com")) {
    return siteExtractors.stackoverflow;
  }
  if (hostname.includes("reddit.com")) {
    return siteExtractors.reddit;
  }
  if (hostname.includes("github.com")) {
    return siteExtractors.github;
  }
  return siteExtractors.default;
}

/**
 * Extract meaningful content from HTML using site-specific extractors
 */
function extractContent(html: string, url: string): {
  title: string;
  snippet: string;
  content: string;
  image?: string;
  date?: string;
  keyPoints?: string[];
  codeSnippet?: string;
  pageImages: SearchImage[];
} {
  const extractor = getExtractor(url);
  const title = extractor.extractTitle(html);
  const snippet = extractor.extractSnippet(html);

  // Get date and image (通用的)
  const dateMatch = html.match(
    /<meta[^>]+(?:property|name)=["']article:published_time["'][^>]+content=["']([^"']+)["']/i
  );
  const date = dateMatch ? dateMatch[1] : undefined;

  const ogImageMatch = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  const image = ogImageMatch ? ogImageMatch[1] : undefined;

  // Extract main content
  let content = extractor.extractContent(html);

  // Get key points and code snippet from extractor
  const keyPoints = extractor.extractKeyPoints(html, content);
  const codeSnippet = extractor.extractCode(html);

  // Clean content
  content = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // Truncate content
  content = content.slice(0, 4000);

  return { title, snippet, content, image, date, keyPoints, codeSnippet, pageImages: [] };
}

/**
 * Fetch a URL with bot detection bypass
 */
async function fetchWithBypass(
  url: string,
  retries = 3
): Promise<{ html: string; status: number } | null> {
  await rateLimit();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Cache-Control": "max-age=0",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (response.status === 200) {
        const html = await response.text();
        if (
          html.includes("access denied") ||
          html.includes("captcha") ||
          html.includes("blocked") ||
          html.includes("robot check")
        ) {
          if (attempt < retries - 1) {
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          return null;
        }
        return { html, status: response.status };
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          continue;
        }
      }

      return null;
    } catch (error) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return null;
}

/**
 * Search using DuckDuckGo HTML (no API key)
 */
async function searchDuckDuckGo(query: string): Promise<
  Array<{ title: string; url: string; snippet: string; date?: string }>
> {
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}&kl=wt-wt`;

  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed: ${response.status}`);
  }

  const html = await response.text();
  const results: Array<{ title: string; url: string; snippet: string; date?: string }> = [];

  // Parse results
  const resultPattern =
    /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]+)<\/a>/gi;

  let match;
  while ((match = resultPattern.exec(html)) !== null && results.length < 12) {
    const url = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match[3].replace(/<[^>]+>/g, "").trim();

    if (
      !url.includes("duckduckgo") &&
      !url.includes("bing") &&
      !url.includes("google") &&
      url.startsWith("http")
    ) {
      results.push({ title, url, snippet });
    }
  }

  // Fallback: simple link extraction
  if (results.length === 0) {
    const linkPattern = /<a href="(https:\/\/[^"']+)"[^>]*>([^<]+)<\/a>/gi;
    while ((match = linkPattern.exec(html)) !== null && results.length < 8) {
      const url = match[1];
      const title = match[2].replace(/<[^>]+>/g, "").trim();

      if (url.startsWith("http") && !url.includes("duckduckgo") && title.length > 5) {
        results.push({ title, url, snippet: "" });
      }
    }
  }

  return results;
}

/**
 * Search using Brave Search API (free tier available)
 * Get your API key at https://api.search.brave.com/
 */
async function searchBraveApi(query: string, apiKey?: string): Promise<
  Array<{ title: string; url: string; snippet: string; date?: string }>
> {
  if (!apiKey) {
    // Fall back to DuckDuckGo if no API key
    return searchDuckDuckGo(query);
  }

  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=12`;

  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    console.warn(`Brave API failed: ${response.status}, falling back to DuckDuckGo`);
    return searchDuckDuckGo(query);
  }

  const data = await response.json();

  if (!data.results || !Array.isArray(data.results)) {
    return searchDuckDuckGo(query);
  }

  return data.results.map((result: {
    url: string;
    title?: string;
    description?: string;
    age?: string;
  }) => ({
    title: result.title || "Untitled",
    url: result.url,
    snippet: result.description || "",
    date: result.age,
  }));
}

/**
 * Main search function - performs web search with priority ranking and freshness
 */
export async function performWebSearch(query: string): Promise<SearchResult> {
  const cacheKey = KEYS.searchResult(query);

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SearchResult;
    }
  } catch {
    // Cache miss or error - proceed with search
  }

  // Perform actual search
  const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
  const result = await performSearchInternal(query, BRAVE_API_KEY);

  // Cache result
  try {
    await redis.setex(cacheKey, TTL.searchResult, JSON.stringify(result));
  } catch {
    // Caching failed - continue without caching
  }

  return result;
}

/**
 * Internal search (no caching) - called by performWebSearch with caching
 */
async function performSearchInternal(query: string, BRAVE_API_KEY?: string): Promise<SearchResult> {
  // Try Brave API first if available, otherwise DuckDuckGo
  const searchResults = await (BRAVE_API_KEY
    ? searchBraveApi(query, BRAVE_API_KEY)
    : searchDuckDuckGo(query));

  // Fetch content from each result in parallel (limit concurrency)
  const sources: SearchSource[] = [];
  const images: SearchImage[] = [];
  const seenImageUrls = new Set<string>();
  const batchSize = 3; // Process 3 URLs concurrently

  for (let i = 0; i < searchResults.length; i += batchSize) {
    const batch = searchResults.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (result) => {
        const fetched = await fetchWithBypass(result.url);
        if (!fetched) return null;

        const { title, snippet, content, image, date, keyPoints, codeSnippet } = extractContent(
          fetched.html,
          result.url
        );

        // Collect images from the page
        const pageImages = extractImagesFromHtml(fetched.html, result.url, seenImageUrls);

        const finalSnippet = snippet || result.snippet;
        const finalTitle = title || result.title;
        const freshnessScore = getFreshnessScore(date || result.date);

        return {
          id: crypto.randomUUID(),
          title: finalTitle,
          url: result.url,
          snippet: finalSnippet.slice(0, 200),
          content: content.slice(0, 4000),
          image,
          source: getSourceType(result.url),
          score: getSourceScore(result.url) * freshnessScore,
          savedAt: new Date().toISOString(),
          date: date || result.date,
          keyPoints,
          codeSnippet,
          pageImages,
        };
      })
    );

    // Add non-null results, sorted by score
    for (const r of batchResults) {
      if (r !== null) {
        sources.push(r);

        // Collect unique images
        for (const img of r.pageImages) {
          if (!seenImageUrls.has(img.url)) {
            seenImageUrls.add(img.url);
            images.push(img);
          }
        }
      }
    }

    // Stop if we have enough sources
    if (sources.length >= 8) break;
  }

  // Final sort by priority score
  sources.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.image && !b.image) return 1;
    if (b.image && !a.image) return -1;
    return 0;
  });

  return {
    sources: sources.slice(0, 8),
    images: images.slice(0, 20), // Limit to 20 images
    query,
    totalResults: sources.length,
    searchEngine: BRAVE_API_KEY ? "brave" : "duckduckgo",
  };
}

/**
 * Extract images from HTML page
 */
function extractImagesFromHtml(html: string, pageUrl: string, seenUrls: Set<string>): SearchImage[] {
  const images: SearchImage[] = [];
  const pageHostname = new URL(pageUrl).hostname;

  // 1. OpenGraph image
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (ogImageMatch) {
    const url = ogImageMatch[1];
    if (!seenUrls.has(url)) {
      images.push({ url, description: `Image from ${pageHostname}` });
    }
  }

  // 2. Twitter image
  const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (twitterImageMatch) {
    const url = twitterImageMatch[1];
    if (!seenUrls.has(url)) {
      images.push({ url, description: `Image from ${pageHostname}` });
    }
  }

  // 3. JSON-LD structured data with images
  const jsonLdImageMatches = html.matchAll(/["']image["']\s*:\s*["']([^"']+)["']/gi);
  for (const match of jsonLdImageMatches) {
    const url = match[1];
    if (url.startsWith('http') && !seenUrls.has(url)) {
      images.push({ url, description: `Image from ${pageHostname}` });
    }
  }

  // 4. Inline images (img tags)
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgMatches) {
    const src = match[1];
    // Skip data URLs, small icons, and tracking pixels
    if (src.startsWith('data:') || src.includes('pixel') || src.includes('track') || src.includes('beacon')) {
      continue;
    }
    // Skip small images (likely icons)
    const widthMatch = match[0].match(/width=["'](\d+)["']/);
    const heightMatch = match[0].match(/height=["'](\d+)["']/);
    const w = widthMatch ? parseInt(widthMatch[1]) : 0;
    const h = heightMatch ? parseInt(heightMatch[1]) : 0;
    if ((w > 0 && w < 100) || (h > 0 && h < 100)) {
      continue;
    }
    if (src.startsWith('http') && !seenUrls.has(src)) {
      const altMatch = match[0].match(/alt=["']([^"']+)["']/);
      const description = altMatch ? altMatch[1] : `Image from ${pageHostname}`;
      images.push({ url: src, description });
    }
  }

  return images;
}

/**
 * Extract full content from a specific URL
 */
export async function extractFullContent(
  url: string
): Promise<SearchSource | null> {
  const fetched = await fetchWithBypass(url);
  if (!fetched) return null;

  const { title, snippet, content, image, date, keyPoints, codeSnippet } = extractContent(
    fetched.html,
    url
  );

  return {
    id: crypto.randomUUID(),
    title: title || url,
    url,
    snippet: snippet || "",
    content,
    image,
    source: getSourceType(url),
    score: getSourceScore(url),
    savedAt: new Date().toISOString(),
    date,
    keyPoints,
    codeSnippet,
  };
}

