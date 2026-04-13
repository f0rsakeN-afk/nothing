# Web Search System

## Overview

Web search uses **SearxNG** as a backend. SearxNG is a privacy-respecting metasearch engine that aggregates results from multiple search engines (Google, Bing, DuckDuckGo).

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Client    │────▶│  API Route  │────▶│     SearxNG      │
│             │     │ /api/search │     │  (localhost:8888)│
└─────────────┘     └──────┬──────┘     └──────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │   (cache)   │
                    └─────────────┘
```

## Configuration

**File:** `lib/web-search.ts`

```typescript
const SEARXNG_BASE_URL = process.env.SEARXNG_BASE_URL || "http://localhost:8888";
```

## Search Flow

### 1. Cache Check

```typescript
// Check Redis cache first
const cacheKey = `search:${query.toLowerCase().trim()}`;

const cached = await redis.get(cacheKey);
if (cached) {
  const parsed = JSON.parse(cached) as SearchResponse;
  return { ...parsed, cached: true };
}
```

### 2. Query SearxNG

```typescript
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
```

### 3. Normalize Results

```typescript
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
```

### 4. Cache and Return

```typescript
const searchResponse: SearchResponse = {
  results,
  query,
  total,
  cached: false,
  source: "searxng",
};

// Cache for 1 hour
await redis.setex(cacheKey, TTL.searchResults || 3600, JSON.stringify(searchResponse));

return searchResponse;
```

## API Endpoint

**File:** `app/api/search/route.ts`

```
GET /api/search?q={query}&limit={1-50}&offset={offset}
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| q | string | required | Search query |
| limit | number | 10 | Max results (1-50) |
| offset | number | 0 | Pagination offset |
| scrape | boolean | false | Also scrape page content |

### Response

```typescript
interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
  cached: boolean;
  source: "searxng" | "cache";
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  engine: string;
  publishedDate?: string;
  thumbnail?: string;
}
```

## Content Scraper

**File:** `lib/scraper.ts`

Extracts clean text content from URLs.

### Supported Content Extraction

1. **`<article>` tag** - Primary content container
2. **`<main>` tag** - Main content area
3. **`.content`, `#content`, `.post`, `.article`** - Common CSS classes
4. **`<body>` fallback** - Last resort

### Remove Unwanted Elements

```typescript
$("script, style, nav, footer, header, aside,
   [role='navigation'], [role='banner'], [role='contentinfo'],
   .sidebar, .ad, .advertisement, .social-share, .comments").remove();
```

### Extraction Process

```typescript
async function scrapeUrl(url: string): Promise<ScrapedContent> {
  // 1. Fetch HTML
  const response = await fetch(url, {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; Eryx/1.0; +https://eryx.ai)",
    },
    signal: AbortSignal.timeout(10000),
  });

  // 2. Parse HTML with cheerio
  const html = await response.text();
  const $ = cheerio.load(html);

  // 3. Remove unwanted elements
  $("script, style, nav, footer, header").remove();

  // 4. Extract title
  const title = $("title").text().trim() ||
                $("meta[property='og:title']").attr("content") ||
                $("h1").first().text().trim();

  // 5. Extract content
  let content = "";
  if ($("article").length) content = $("article").first().text();
  else if ($("main").length) content = $("main").first().text();
  else if ($(".content, #content").length) content = $(".content, #content").first().text();
  else content = $("body").text();

  // 6. Clean content
  content = content
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();

  // 7. Create excerpt (first 300 chars)
  const excerpt = content.slice(0, 300).trim() + (content.length > 300 ? "..." : "");

  return {
    url,
    title: title.slice(0, 200),
    content: content.slice(0, 5000),  // Max 5000 chars
    excerpt,
  };
}
```

### Concurrent Scraping

```typescript
async function scrapeUrls(urls: string[], concurrency = 3): Promise<ScrapedContent[]> {
  const results: ScrapedContent[] = [];

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((url) => scrapeUrl(url)));
    results.push(...batchResults);
  }

  return results;
}
```

## Redis Caching

```typescript
export const TTL = {
  searchResults: 60 * 60, // 1 hour
};

// Cache key based on query
searchResults: (query) => `search:${Buffer.from(query).toString("base64").slice(0, 32)}`
```

## Cache Invalidation

```typescript
export async function invalidateSearchCache(query: string): Promise<void> {
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  try {
    await redis.del(cacheKey);
  } catch {
    // Ignore if Redis not available
  }
}
```

## SearxNG Setup

### Installation

SearxNG can be installed via Docker:

```bash
docker run -d -p 8888:8080 --name searxng searxng/searxng
```

### Configuration

Create `searxng/settings.yml`:

```yaml
search:
  engines:
    - name: google
    - name: bing
    - name: duckduckgo

  formats:
    - json

server:
  secret_key: your-secret-key
  bind:
    - 0.0.0.0:8080
```

### Environment Variable

```env
SEARXNG_BASE_URL=http://localhost:8888
```

## Error Handling

```typescript
try {
  const response = await fetch(searxUrl.toString(), { ... });
  if (!response.ok) {
    throw new Error(`SearxNG returned ${response.status}`);
  }
} catch (error) {
  console.error("Web search error:", error);
  throw new Error("Search service unavailable");
}
```

## Rate Limiting

Web search has its own rate limit tier:

```typescript
const RATE_LIMITS = {
  // ...
  search: { windowMs: 60000, maxRequests: 30 }, // 30/min
};
```

## Credit Cost

Web search costs **3 credits** per search operation:

```typescript
creditCosts: {
  "web-search": 3,
  // ...
}
```