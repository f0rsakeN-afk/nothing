# Middleware & Security

## Overview

This project handles middleware concerns through **library modules** rather than Next.js middleware.ts. Security, CORS, and rate limiting are applied per-route or via shared utility functions.

## Security Headers

**File:** `lib/security.ts`

Applies security headers to all responses via `proxy.ts`.

### Headers Applied

```typescript
// Prevents MIME type sniffing
X-Content-Type-Options: nosniff

// Prevents clickjacking
X-Frame-Options: DENY

// XSS Protection
X-XSS-Protection: 1; mode=block

// Force HTTPS
Strict-Transport-Security: max-age=31536000; includeSubDomains

// Referrer Policy
Referrer-Policy: strict-origin-when-cross-origin

// Disable unnecessary browser features
Permissions-Policy: camera=(), microphone=(), geolocation=()

// Content Security Policy
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.groq.com https://*.stack.auth wss://*.stack.auth
```

### Implementation

```typescript
// proxy.ts
export default function proxy(request: NextRequest) {
  return securityHeaders(request);
}

// Match all routes
export const config = {
  matcher: "/:path*",
};
```

## CORS Configuration

**File:** `lib/cors.ts`

Handles Cross-Origin Resource Sharing for API routes.

### Allowed Origins

```typescript
const CORS_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_SITE_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean));
```

### Preflight Requests (OPTIONS)

```typescript
if (request.method === "OPTIONS") {
  const origin = request.headers.get("origin");

  if (origin && isOriginAllowed(origin, host)) {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(response, origin);
    return response;
  }
}
```

### CORS Headers

```typescript
const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, x-user-stack-id, x-user-email",
  "Access-Control-Max-Age": "86400", // 24 hours
};
```

### Origin Validation

```typescript
function isOriginAllowed(origin: string, host: string): boolean {
  // Check allowed origins list
  if (CORS_ORIGINS.has(origin)) return true;

  // Allow localhost in non-production
  if (process.env.NODE_ENV !== "production" &&
      (originHost === "localhost:3000" || originHost === "127.0.0.1:3000")) {
    return true;
  }

  // Allow same-origin requests
  if (originHost === host) return true;

  return false;
}
```

## Rate Limiting

**File:** `services/rate-limit.service.ts`

Uses Redis to track request counts per user/IP.

### Rate Limit Tiers

```typescript
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60000, maxRequests: 100 },   // 100/min
  auth:    { windowMs: 300000, maxRequests: 10 },  // 10/5min for auth
  chat:    { windowMs: 60000, maxRequests: 60 },   // 60/min for chat
  search:  { windowMs: 60000, maxRequests: 30 },   // 30/min for search
};
```

### How It Works

1. **Identifier**: Uses `x-user-id` header (authenticated) or IP address (unauthenticated)
2. **Redis Counter**: Increments a key `${userRateLimit}:{identifier}:{limitType}`
3. **TTL**: Sets expiry on first request to match window size
4. **Check**: Returns remaining requests and reset time

### Implementation

```typescript
export async function rateLimit(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = "default"
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[limitType];

  const userId = request.headers.get("x-user-id");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") ||
             "unknown";

  const identifier = userId || ip;
  const key = `${KEYS.userRateLimit(identifier)}:${limitType}`;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, config.windowMs / 1000);
  }

  const ttl = await redis.ttl(key);
  const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs);
  const remaining = Math.max(0, config.maxRequests - current);

  if (current > config.maxRequests) {
    return { success: false, remaining: 0, resetAt };
  }

  return { success: true, remaining, resetAt };
}
```

### Rate Limit Response

```typescript
export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return NextResponse.json(
    { error: "Too many requests", retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
```

### Skip in Development

Rate limiting can be disabled in development:

```typescript
if (process.env.NODE_ENV === "development" && process.env.DISABLE_RATE_LIMIT === "true") {
  return { success: true, remaining: 999, resetAt: Date.now() + 60000 };
}
```

## Redis Key Patterns for Rate Limiting

```typescript
// Key: user:{userId or IP}:rate_limit:{limitType}
// Example: user:123:rate_limit:chat

KEYS.userRateLimit = (userId) => `user:${userId}:rate_limit`
```

## TTL Values

```typescript
export const TTL = {
  rateLimit: 60, // 1 minute for rate limit counters
  // ...
};
```

## API Route Pattern with Rate Limiting

```typescript
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, "chat");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.resetAt);
  }

  // Continue with route logic
}
```

## Security Considerations

1. **HTTPS Enforcement**: Strict-Transport-Security header forces HTTPS
2. **Origin Validation**: CORS rejects requests from untrusted origins
3. **Rate Limiting**: Prevents brute-force and DoS attacks
4. **CSP**: Content Security Policy restricts resource loading
5. **Clickjacking Protection**: X-Frame-Options prevents iframe embedding