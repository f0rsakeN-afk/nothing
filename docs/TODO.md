# Eryx Improvements & TODO

## Overview

This document tracks planned improvements, optimizations, and technical debt for the Eryx codebase.

---

## Production Fixes Implemented

### Circuit Breaker - Production Grade ✅

**Issues Fixed:**
1. Thundering herd on HALF_OPEN → Distributed lock via Redis SETNX
2. Clock drift → Uses Redis TIME for consistent timestamps
3. All errors treated equally → Error classification (RETRYABLE/FATAL/IGNORED)
4. Cold start problems → Warmup phase with configurable calls
5. Binary recovery → Progressive recovery (1→2→5→10→full)

**Files:** `services/circuit-breaker.service.ts`

```typescript
// HALF_OPEN lock - only ONE container tests recovery
const lockAcquired = await redis.set(lockKey, pid, { NX: true, EX: 5 });

// Redis TIME for consistent clocks
const now = await redis.time(); // [seconds, microseconds]

// Error classification
enum ErrorType { RETRYABLE, FATAL, IGNORED }

// Progressive recovery
const steps = [1, 2, 5, 10, 25, 50, 100]; // Traffic allowed at each step
```

---

### Redis Resilience Layer - Production Grade ✅

**Issues Fixed:**
1. Silent data corruption → Fallback metadata `{ fallback: true, degraded: true }`
2. Split-brain → Global degraded mode flag
3. Fallback drift → Minimal fallbacks only (fail-open OR fail-closed)
4. Retry storm → Jitter on recovery (0-5s random delay)

**Files:** `lib/redis-resilience.ts`

```typescript
// Fallback with metadata
return {
  value: fallback,
  degraded: true,
  fallback: true,
  _meta: { source: "redis-circuit-breaker", timestamp: Date.now() }
};

// Recovery jitter prevents retry storm
const jitterMs = Math.random() * 5000;
await new Promise(resolve => setTimeout(resolve, jitterMs));
```

---

### BullMQ Queue - Production Grade ✅

**Issues Fixed:**
1. Queue starvation → Separate concurrency per queue (webhook:5, summarization:2, export:1)
2. No backpressure → maxLength limits per queue
3. Duplicate execution → Idempotency keys per job
4. Visibility timeout → stalledInterval + maxStalledCount configuration
5. Schema mismatch → Job versioning with `_jobVersion` field

**Files:** `services/queue.service.ts`

```typescript
// Idempotent job
const { job, isDuplicate } = await addJob(queue, data, { idempotencyKey });

// Backpressure
const QUEUE_CONFIG = {
  export: { maxLength: 50, stalledInterval: 120000 },
  summarization: { maxLength: 1000 },
};

// Versioned jobs
const versionedData = { ...data, _jobVersion: JOB_VERSION };
```

---

### Chat Access - Production Grade ✅

**Issues Fixed:**
1. Timing attacks → Normalized responses + random delays
2. Role escalation race → Serializable transaction isolation
3. Missing indexes → Composite indexes in schema
4. Over-fetching → Selective `select` with explicit fields

**Files:** `lib/chat-access.ts`

```typescript
// Timing attack prevention
return { hasAccess: boolean, role: ChatRole | null, normalizedResponse: true };

// Transaction isolation
await prisma.$transaction(async (tx) => {
  // ...
}, { isolationLevel: "Serializable" });

// SCAN instead of KEYS
do {
  const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
} while (cursor !== "0");
```

---

### MCP Elicitation - Production Grade ✅

**Issues Fixed:**
1. User disconnect → Persisted elicitation state in Redis
2. Duplicate approvals → Idempotent elicitation IDs
3. Prompt injection → Server-side input validation
4. SSE reliability → Replay mechanism on reconnect

**Files:** `services/mcp-tool-executor.service.ts`

```typescript
// Persist for resume
await redis.setex(`elicitation:${elicitationId}`, 600, JSON.stringify(state));

// Server-side validation
function validateToolInput(toolName, args) {
  if (isInternalUrl(args.url)) return { valid: false };
  if (!isValidEmail(args.to)) return { valid: false };
  if (args.amount > 1000000) return { valid: false };
}

// Replay on reconnect
const priorState = await resumeElicitationState(id);
if (priorState?.status !== "pending") return { action: priorState.status };
```

---

### Limits Service - Production Grade ✅

**Issues Fixed:**
1. Race conditions → Atomic increment via Redis INCRBY
2. Time boundary bugs → UTC rolling windows (no DST)
3. Plan change edge case → Cache invalidation + counter reset
4. Abuse vectors → Rate limit on limit checks themselves

**Files:** `services/limits/service.ts`

```typescript
// Atomic check-and-increment
const newCount = await redis.incrby(`limit:${feature}:${userId}`, 1);
await redis.expire(key, ttl);

// UTC reset (no DST)
const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

// Abuse detection
const abuseCount = await redis.incr(`limit:abuse:${userId}`);
await redis.expire(cacheKey, 3600);
```

---

### Resumable Stream - Production Grade ✅

**Issues Fixed:**
1. Pub/Sub unreliable → TTL heartbeats prevent ghost streams
2. No replay → Redis-based elicitation persistence
3. Chunk consistency → Sequence numbers + idempotency keys
4. Resume correctness → ACK mechanism from client

**Files:** `services/resumable-pubsub.service.ts`, `services/resumable-stream-v2.ts`

```typescript
// TTL heartbeat (auto-expires on crash)
await redis.set(heartbeatKey, data, { EX: 30 });

// Heartbeat refresh
setInterval(() => redis.set(heartbeatKey, data, { EX: 30 }), 10_000);

// Chunk with sequence + idempotency
await storeChunk(streamId, seq, chunkId, data, { compressed: true });

// Client ACK
await redis.sadd(`stream:${streamId}:acks`, seq.toString());
const resumeFrom = Math.max(...acks) + 1;
```

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

**Implemented:**
- [x] `ChatMember` model with ChatRole (OWNER, EDITOR, VIEWER)
- [x] Role-based permissions in `lib/chat-access.ts`
- [x] Chat invitations via `ChatInvitation` model

**Planned:**
- [ ] Real-time collaborative editing
- [ ] Invitation email notifications

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

**Implemented:**
- [x] PostgreSQL full-text search via `tsvector`
- [x] Message search vector field

**Planned:**
- [ ] Search within chat messages
- [ ] Filter by date range, project, sender
- [ ] Full-text search with ranking

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
- [x] `Settings.colorScheme` field (civic, ocean, forest, etc.)
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

**Current:** Basic logging exists.

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

### Circuit Breaker (Production Grade)
- [x] Distributed state via Redis
- [x] HALF_OPEN lock (thundering herd prevention)
- [x] Redis TIME for clock drift prevention
- [x] Error classification (RETRYABLE/FATAL/IGNORED)
- [x] Warmup phase for new services
- [x] Progressive recovery (1→2→5→10→full)
- [x] Per-service configurations

### Redis Resilience Layer (Production Grade)
- [x] Global degraded mode (prevents split-brain)
- [x] Fallback metadata (`degraded: true`)
- [x] Recovery jitter (prevents retry storm)
- [x] Minimal fallback logic

### BullMQ Job Queue (Production Grade)
- [x] Idempotency keys per job
- [x] Backpressure limits (maxLength)
- [x] Stalled job detection
- [x] Job versioning for schema compatibility
- [x] Per-queue concurrency tuning

### Chat Access Control (Production Grade)
- [x] Single-query authorization
- [x] Timing attack prevention
- [x] Serializable transaction isolation
- [x] SCAN for cache invalidation

### MCP Elicitation (Production Grade)
- [x] Persisted elicitation state
- [x] Idempotent elicitation IDs
- [x] Server-side input validation
- [x] SSE replay on reconnect

### Limit Service (Production Grade)
- [x] Atomic increment (Redis INCRBY)
- [x] UTC rolling windows
- [x] Plan change handling
- [x] Abuse detection

### Resumable Stream (Production Grade)
- [x] TTL heartbeats (ghost stream prevention)
- [x] Chunk sequencing + idempotency
- [x] ACK mechanism for correct resume
- [x] Auto-queued resume with DLQ

### Request Coalescing
- [x] Service available in `services/request-coalescing.service.ts`
- [x] Monitoring via `getCoalescingStats()`

### Image Compression
- [x] Service in `services/image-compression.service.ts`
- [x] Client-side compression before S3 upload

### Cookie Consent
- [x] Banner on first visit
- [x] 3 categories: Analytics, Personalization, Marketing
- [x] Consent API audit logging

---

## Monitoring & Observability

### Current State
- Basic logging via `lib/logger.ts`
- Health check endpoint: `GET /api/health`
- Circuit breaker stats via `getCircuitBreakerStats()`

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
- [x] Audit all `findMany()` calls for missing pagination
- [x] Add cursor pagination where applicable
- [x] Use `select` to limit returned fields (avoid `include: { * }`)
- [x] Add indexes for frequently queried fields
- [x] Replace N+1 queries with batch queries

**Files Audited:**
```
services/chat.service.ts        - getChatMessages, getUserChats
services/memory.service.ts      - getUserMemories
services/project.service.ts     - getUserProjects
services/admin/*.service.ts     - stats queries
```

---

### 2. Type Safety

**Issue:** Some `any` types in callback signatures and untyped objects.

**Fix:**
- [x] Replace `any` in callback signatures with proper types
- [x] Add `strict: true` to tsconfig.json if not present
- [x] Audit `lib/validations/` for missing export types
- [x] Add types for Redis cached data structures

---

### 3. Error Handling Consistency

**Issue:** Different error response formats across routes.

**Fix:**
- [x] Create `APIError` interface
- [x] Create `lib/api-response.ts` helper
- [x] Audit all API routes for inconsistent error responses
- [x] Replace all custom error formats with helper

---

## File Reference

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database models |
| `lib/redis.ts` | Redis KEYS, TTL, CHANNELS |
| `lib/redis-resilience.ts` | Redis circuit breaker with fallbacks |
| `lib/chat-access.ts` | Role-based access control |
| `lib/auth.ts` | Authentication helpers |
| `services/circuit-breaker.service.ts` | Distributed circuit breaker |
| `services/resumable-pubsub.service.ts` | TTL heartbeats for streams |
| `services/mcp-tool-executor.service.ts` | MCP with elicitation |
| `services/limits/service.ts` | Atomic limit checking |
| `services/queue.service.ts` | BullMQ with idempotency |
| `app/api/*/route.ts` | API routes |