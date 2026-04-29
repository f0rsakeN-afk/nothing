# Eryx Improvements & TODO

## Overview

This document tracks planned improvements, optimizations, and technical debt for the Eryx codebase.

---

## High Priority

### 1. Async Data Export with S3

**Problem:**
- Export runs synchronously, generating ZIP in-memory
- Users with 1000+ chats cause HTTP timeouts and memory exhaustion
- No progress indication for users

**Implemented:**
- [x] `POST /api/settings/export` returns immediately with `{ status: "processing", jobId }`
- [x] Background BullMQ job generates ZIP
- [x] ZIP uploaded to S3 with presigned URL
- [x] `GET /api/settings/export?jobId=xxx` returns status and download URL
- [x] Download via S3 presigned URL (24hr expiry)
- [x] Email notification when export completes (with download link)
- [x] Email notification when export fails
- [x] Spam prevention: 1-hour cooldown between exports

**Files Created/Modified:**
- `prisma/schema.prisma` - Added `ExportJob` model and `ExportStatus` enum
- `app/api/settings/export/route.ts` - Split into async POST and status GET
- `services/export.service.ts` - New service for export job processing
- `services/queue.service.ts` - Added EXPORT queue
- `services/workers.ts` - Added export worker
- `services/email.service.ts` - Added `export-complete` and `export-failed` templates

**S3 Cost Estimate (1000 users/month):**
- Storage (10GB): ~$0.23/mo
- GET requests: ~$0.01/mo
- Data transfer: ~$0.90/mo

---

### 2. Rate Limiting

**Current:** Redis-based rate limiting exists per-user/per-IP.

**Implemented:**
- [x] Basic rate limiting by tier (default, auth, chat, search, upload, export)
- [x] Per-endpoint custom limits via config
- [x] Rate limit analytics via `getRateLimitAnalytics()`
- [x] Automatic rate limit increase for premium users (tier multipliers)

**Rate Limit Tiers:**
| Tier | Window | Default Limit | Premium Multiplier |
|------|--------|---------------|-------------------|
| default | 1 min | 100 | 1x - 5x |
| auth | 5 min | 10 | 1x - 5x |
| chat | 1 min | 60 | 1x - 5x |
| search | 1 min | 30 | 1x - 5x |
| upload | 1 min | 20 | 1x - 5x |
| export | 1 hour | 3 | 1x - 5x |

**Files Modified:**
- `services/rate-limit.service.ts` - Enhanced with tier multipliers and analytics
- `lib/rate-limit.ts` - Updated exports and type definitions

---

### 3. CSRF Protection

**Current:** Basic CSRF module exists in `lib/csrf.ts`.

**Implemented:**
- [x] Origin header validation on all state-changing endpoints
- [x] `validateRequestOrigin()` middleware for API routes
- [x] Applied to key routes (notifications, report, etc.)

**Usage:**
```typescript
const csrfError = validateRequestOrigin(request);
if (csrfError) return csrfError;
```

**Files Modified:**
- `lib/csrf.ts` - Enhanced with `validateRequestOrigin()` helper
- `app/api/notifications/route.ts` - CSRF validation on PATCH/POST
- `app/api/report/route.ts` - CSRF validation on POST

---

### 4. Two-Factor Authentication (2FA)

**Current:** No 2FA support.

**Planned:**
- TOTP-based 2FA via authenticator apps
- Backup codes for account recovery
- Admin toggle for 2FA enforcement by plan

**Implementation:**
- [ ] Add `User.twoFactorEnabled`, `User.twoFactorSecret` to schema
- [ ] Create `services/two-factor.service.ts`
- [ ] Add `/api/auth/2fa/setup`, `/api/auth/2fa/verify` endpoints
- [ ] UI for 2FA enrollment in settings

---

## Medium Priority

### 5. Collaborative Chat

**Current:** Chats are private to individual users.

**Planned:**
- Share chat with team members
- Real-time collaborative editing
- Role-based access (viewer, editor, owner)

**Implementation:**
- [ ] Add `ChatShare` model (chatId, userId, role)
- [ ] Create `services/collaboration.service.ts`
- [ ] Add `/api/chats/:id/share` endpoint
- [ ] Real-time sync via existing Redis Pub/Sub

---

### 6. Chat Folders/Categories

**Current:** Projects exist for organization, but no folders within chats.

**Planned:**
- User-created folders for grouping chats
- Drag-and-drop chat organization
- Folder-based filtering

**Implementation:**
- [ ] Add `Folder` model (userId, name, parentFolderId)
- [ ] Add `Chat.folderId` to schema
- [ ] Create `services/folder.service.ts`
- [ ] Add `/api/folders` CRUD endpoints

---

### 7. Advanced Search with Filters

**Current:** Basic chat search by title.

**Planned:**
- Search within chat messages
- Filter by date range, project, sender
- Full-text search with ranking

**Implementation:**
- [ ] PostgreSQL full-text search via `tsvector`
- [ ] Create `services/search.service.ts`
- [ ] Add search filters UI component

---

### 8. Database Connection Pooling

**Current:** Basic Prisma setup without explicit pooling configuration.

**Recommended Settings by Deployment:**

| Deployment | connection_limit | pool_timeout | connection_timeout |
|-----------|-----------------|--------------|-------------------|
| Development | 5 | 10 | 30 |
| Small (2GB RAM) | 10 | 10 | 30 |
| Medium (4GB RAM) | 20 | 15 | 30 |
| Large (8GB+ RAM) | 50 | 20 | 30 |
| Kubernetes | 5 | 10 | 15 |

**Implementation:**
- Configure via `DATABASE_URL` query params
- [ ] Add monitoring endpoint for connection pool stats
- [ ] Document Kubernetes sizing

---

## Low Priority / Nice to Have

### 9. Keyboard Shortcuts

**Planned:**
- Global shortcuts (new chat, search, settings)
- Chat-specific shortcuts (copy, regenerate, stop)
- Customizable keybindings

**Implementation:**
- [ ] Create `hooks/useKeyboardShortcuts.ts`
- [ ] Add shortcut registry in settings
- [ ] UI for customizing shortcuts

---

### 10. Dark/Light Mode Themes

**Current:** System default theme only.

**Planned:**
- Manual theme selection (light, dark, system)
- Theme persistence in settings
- Custom theme colors (future)

**Implementation:**
- [ ] Add `Settings.theme` field (system | light | dark)
- [ ] Theme provider component
- [ ] Theme switcher in settings

---

### 11. Mobile App (PWA)

**Planned:**
- Progressive Web App support
- Offline chat viewing
- Push notifications on mobile

**Implementation:**
- [ ] Service worker registration
- [ ] Offline-first with IndexedDB cache
- [ ] PWA manifest
- [ ] Mobile-responsive UI improvements

---

### 12. Sentry Error Tracking

**Current:** Basic logging exists.

**Planned:**
- Sentry integration for error tracking
- Performance monitoring
- User session replay (optional)

**Implementation:**
- [ ] Install and configure `@sentry/nextjs`
- [ ] Add environment variables
- [ ] Create Sentry dashboard

---

### 13. Prometheus Metrics

**Planned:**
- Expose `/metrics` endpoint for Prometheus scraping
- Key metrics: request latency, error rate, active users

**Implementation:**
- [ ] Add `prom-client` package
- [ ] Expose metrics endpoint
- [ ] Create Grafana dashboard

---

## Already Implemented (Verify & Document)

### Redis Caching
- [x] Credits caching (5 min TTL)
- [x] User limits caching (5 min TTL)
- [x] Preferences caching (30 min TTL)
- [x] Settings caching (30 min TTL)
- [x] Memory caching (5 min TTL)
- [x] Notification caching (30 sec TTL)
- [x] Projects caching (5 min TTL)
- [x] Chat list caching (5 min TTL)
- [x] Search results caching (1 hour TTL)
- [x] Chat summaries caching (7 days TTL)

### Circuit Breaker
- [x] OpenAI circuit breaker (threshold: 3, timeout: 15s)
- [x] Polar circuit breaker (threshold: 5, timeout: 30s)
- [x] SearxNG circuit breaker (threshold: 5, timeout: 30s)

### Request Coalescing
- [x] Service available in `services/request-coalescing.service.ts`
- [x] Monitoring via `getCoalescingStats()`

### Image Compression
- [x] Service in `services/image-compression.service.ts`
- [x] Client-side compression before S3 upload
- [ ] Document client-side integration

### BullMQ Job Queue
- [x] webhook queue
- [x] summarization queue
- [x] file-processing queue
- [x] email queue

### Cookie Consent
- [x] Banner on first visit
- [x] 3 categories: Analytics, Personalization, Marketing
- [x] Consent API audit logging
- [ ] Full GDPR compliance (data export/deletion)

---

## Monitoring & Observability

### Current State
- Basic logging via `lib/logger.ts`
- Health check endpoint: `GET /api/health`

### Missing
- [ ] Error tracking (Sentry)
- [ ] Performance metrics (Prometheus)
- [ ] Alerting for errors/latency
- [ ] Grafana dashboards
- [ ] Uptime monitoring

---

## Technical Debt

### 1. Prisma Query Optimization

**Issue:** Some queries use `findMany()` without pagination or `select` optimization.

**Fix:**
- [ ] Audit all `findMany()` calls for missing pagination
- [ ] Add cursor pagination where applicable
- [ ] Use `select` to limit returned fields (avoid `include: { * }`)
- [ ] Add indexes for frequently queried fields
- [ ] Replace N+1 queries with batch queries

**Files to Audit:**
```
services/chat.service.ts        - getChatMessages, getUserChats
services/memory.service.ts      - getUserMemories
services/project.service.ts     - getUserProjects
services/admin/*.service.ts     - stats queries
```

**Example Fix:**
```typescript
// BEFORE - returns all fields, no pagination
const chats = await prisma.chat.findMany({ where: { userId } });

// AFTER - limited fields, cursor pagination
const chats = await prisma.chat.findMany({
  where: { userId },
  select: { id: true, title: true, createdAt: true, updatedAt: true },
  orderBy: { updatedAt: "desc" },
  take: limit + 1,
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,
});
```

---

### 2. Type Safety

**Issue:** Some `any` types in callback signatures and untyped objects.

**Fix:**
- [ ] Replace `any` in callback signatures with proper types
- [ ] Add `strict: true` to tsconfig.json if not present
- [ ] Audit `lib/validations/` for missing export types
- [ ] Add types for Redis cached data structures

**Files to Audit:**
```
services/resumable-stream.service.ts  - onChunk, onComplete callbacks
services/chat-pubsub.service.ts     - message event handlers
hooks/*.ts                           - useCallback dependencies
lib/redis.ts                         - cached data parsers
```

**Example Fix:**
```typescript
// BEFORE
async function startResumableStream(
  chatId: string,
  onChunk: (content: any) => void,
  onComplete: (content: any) => void
)

// AFTER
type ChunkHandler = (content: string, isResume: boolean) => void;
type CompleteHandler = (content: string, isResume: boolean, tokens: number) => void;

async function startResumableStream(
  chatId: string,
  onChunk: ChunkHandler,
  onComplete: CompleteHandler
): Promise<void>
```

---

### 3. Error Handling Consistency

**Issue:** Different error response formats across routes (some use `message`, some use `error`, some use custom formats).

**Fix:**
- [ ] Create standardized `APIError` interface
- [ ] Create `api-response.ts` helper in `lib/`
- [ ] Audit all API routes for inconsistent error responses
- [ ] Replace all custom error formats with helper

**Standard Error Interface:**
```typescript
// lib/api-response.ts
export interface APIError {
  error: string;           // Human-readable message
  code?: string;           // Machine-readable code (e.g., "INSUFFICIENT_CREDITS")
  upgradeTo?: PlanTier;    // Suggested plan upgrade for limit errors
  details?: unknown;       // Additional debug info (dev only)
}

export function apiError(
  error: string,
  options?: Partial<APIError>,
  status = 400
): NextResponse {
  return NextResponse.json({ error, ...options }, { status });
}

export const errors = {
  unauthorized: () => apiError("Unauthorized", { code: "UNAUTHORIZED" }, 401),
  forbidden: () => apiError("Access denied", { code: "FORBIDDEN" }, 403),
  notFound: (resource: string) => apiError(`${resource} not found`, { code: "NOT_FOUND" }, 404),
  insufficientCredits: (required: number, current: number) =>
    apiError(`Insufficient credits. Required: ${required}, Current: ${current}`,
      { code: "INSUFFICIENT_CREDITS", upgradeTo: "PRO" }, 402),
  rateLimited: (retryAfter: number) =>
    apiError("Too many requests", { code: "RATE_LIMITED" }, 429),
} as const;
```

**Before/After:**
```typescript
// BEFORE - inconsistent
return NextResponse.json({ message: "Chat not found" }, { status: 404 });
return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// AFTER - consistent via helper
return notFoundError("Chat");
return insufficientCredits(1, 0);
return unauthorizedError();
```

---

### 4. Test Coverage

**Current:** No unit tests visible.

**Planned:**
- [ ] Service layer tests
- [ ] API route integration tests
- [ ] Redis mock for tests

---

## File Reference

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database models |
| `lib/redis.ts` | Redis KEYS, TTL, CHANNELS |
| `lib/auth.ts` | Authentication helpers |
| `services/*.service.ts` | Business logic |
| `app/api/*/route.ts` | API routes |
