# Eryx Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Clients                                      │
│   Web Browser (React)                    Mobile (Future PWA)            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Next.js App Router                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │  Pages     │  │ API Routes │  │ Middleware │  │  Route Groups       │ │
│  │ (React)    │  │  (REST)    │  │ (Security) │  │  (main/marketing/   │ │
│  │            │  │            │  │            │  │  plain/admin)      │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐          ┌───────────────┐
│   Services    │         │  AI Provider  │          │   External    │
│ (Business     │         │   (OpenAI)    │          │   Services    │
│  Logic)       │         │               │          │               │
│               │         │               │          │               │
│ - chat        │         │               │          │ - Polar       │
│ - credit      │         │               │          │ - SearxNG     │
│ - limit       │         │               │          │ - MCP Servers │
│ - plan        │         │               │          │ - Stack Auth  │
│ - memory      │         │               │          │ - S3          │
│ - mcp-tools   │         │               │          │               │
│ - summarize   │         │               │          │               │
│ - rate-limit  │         │               │          │               │
│ - circuit-    │         │               │          │               │
│   breaker     │         │               │          │               │
└───────┬───────┘         └───────────────┘          └───────────────┘
        │
        ▼
┌───────────────┐         ┌───────────────┐
│    Redis     │         │  PostgreSQL   │
│ (Cache/      │         │  (Prisma ORM) │
│  PubSub/     │         │               │
│  Streams)    │         │               │
│              │         │               │
└───────────────┘         └───────────────┘
```

---

## Directory Structure

```
eryx/
├── app/                          # Next.js 16 App Router
│   ├── (main)/                   # Authenticated app routes
│   │   ├── chat/                 # Chat interface
│   │   ├── projects/             # Project management
│   │   ├── memory/               # Memory/notes
│   │   ├── apps/                 # MCP apps catalog
│   │   └── settings/             # User settings
│   ├── (marketing)/              # Public marketing pages
│   ├── (plain)/                  # Unauthenticated pages
│   ├── admin/                    # Admin panel
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── chats/
│   │   ├── plans/
│   │   └── settings/
│   ├── api/                      # API routes
│   │   ├── chat/                 # Streaming chat endpoint
│   │   ├── chats/                # Chat CRUD
│   │   ├── search/               # Web search
│   │   ├── memory/               # Memory operations
│   │   ├── polar/                # Payment webhooks
│   │   ├── mcp/                  # MCP apps & OAuth
│   │   └── admin/                # Admin-only endpoints
│   ├── layout.tsx                # Root layout
│   └── providers.tsx             # Context providers
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui base components
│   ├── main/                     # Authenticated app components
│   │   ├── chat/                 # Chat UI components
│   │   ├── sidebar/             # Sidebar navigation
│   │   └── ...
│   ├── admin/                    # Admin panel components
│   ├── marketing/               # Marketing components
│   └── shared/                   # Cross-cutting components
│
├── lib/                          # Core library code
│   ├── redis.ts                  # Redis client, KEYS, TTL, CHANNELS
│   ├── redis-resilience.ts       # Redis circuit breaker with fallbacks
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth.ts                   # validateAuth, getOrCreateUser
│   ├── config.ts                 # AI model configuration
│   ├── prompts.ts                # AI system prompts
│   ├── context-manager.ts        # AI context building
│   ├── web-search.ts             # SearxNG integration
│   ├── scraper.ts                # Content extraction
│   ├── security.ts               # Security headers
│   ├── cors.ts                   # CORS configuration
│   ├── polar-config.ts           # Polar SDK config
│   ├── validations/              # Zod schemas by domain
│   ├── chat-access.ts            # Role-based access control
│   ├── mcp/                      # MCP OAuth, encryption, auth
│   └── ai/                       # AI providers, embeddings
│
├── services/                     # Business logic layer
│   ├── chat.service.ts           # Chat CRUD, branching
│   ├── credit.service.ts         # Credit balance, deductions
│   ├── limit.service.ts          # Plan limits enforcement (atomic)
│   ├── plan.service.ts           # Plan data access
│   ├── memory.service.ts          # User memory operations
│   ├── summarize.service.ts       # Hierarchical context summarization
│   ├── rate-limit.service.ts     # Redis-based rate limiting
│   ├── resumable-stream.service.ts  # SSE streaming with resume
│   ├── resumable-pubsub.service.ts  # Cross-container stream tracking (TTL heartbeats)
│   ├── resume-queue.service.ts       # Resume retry queue (DLQ support)
│   ├── chat-pubsub.service.ts        # Chat real-time notifications
│   ├── circuit-breaker.service.ts     # Distributed circuit breaker
│   ├── mcp-tools.service.ts         # MCP tool discovery
│   ├── mcp-tool-executor.service.ts  # MCP tool execution (with elicitation)
│   ├── rag.service.ts                # RAG context retrieval
│   ├── queue.service.ts              # BullMQ job queue (idempotent)
│   └── workers.ts                    # Background job processors
│
├── hooks/                        # Custom React hooks
│   ├── use-chat.ts              # Chat operations
│   ├── use-chat-messages.ts      # Message handling
│   └── ...
│
├── prisma/                       # Database schema
│   └── schema.prisma
│
└── types/                        # Shared TypeScript types
```

---

## Production-Grade Architecture Patterns

### 1. Distributed Circuit Breaker

**File:** `services/circuit-breaker.service.ts`

Prevents cascade failures when external services go down.

```
CLOSED (normal) → OPEN (failure threshold reached) → HALF_OPEN (timeout elapsed)
                        ↑                                        │
                        └──────────── failure ────────────────────┘
```

**Production Features:**
- **HALF_OPEN Lock**: Redis SETNX ensures only ONE container tests recovery (prevents thundering herd)
- **Clock Drift Prevention**: Uses Redis `TIME` for consistent timestamps across containers
- **Error Classification**: RETRYABLE (500s, timeouts) vs FATAL (400s, auth) vs IGNORED (user errors)
- **Warmup Phase**: New services allowed spike without opening circuit
- **Progressive Recovery**: HALF_OPEN → allow 1 → 2 → 5 → 10 → full traffic

```typescript
// Only ONE container tests recovery
const lockAcquired = await redis.set(lockKey, pid, { NX: true, EX: 5 });
if (!lockAcquired) return { allowed: false }; // Another container testing

// Redis TIME for consistent clocks
const now = await redis.time(); // [seconds, microseconds]

// Error classification
if (errorType === ErrorType.IGNORED) return; // Don't affect circuit
```

### 2. Redis Resilience Layer

**File:** `lib/redis-resilience.ts`

Graceful degradation when Redis is unavailable.

**Production Features:**
- **Global Degraded Mode**: Single flag prevents split-brain (all containers same behavior)
- **Fallback Metadata**: Every fallback includes `_meta: { fallback: true, degraded: true }` for observability
- **Recovery Jitter**: Random 0-5s delay before exiting degraded mode (prevents retry storm)
- **Minimal Fallbacks**: Fail-open OR fail-closed, NOT a parallel system

```typescript
// Global degraded mode - all containers use fallbacks together
let globalDegradedMode = false;

// Fallback with metadata
return {
  value: fallback,
  degraded: true,
  fallback: true,
  _meta: { source: "redis-circuit-breaker", timestamp: Date.now() }
};

// Recovery jitter
const jitterMs = Math.random() * 5000;
await new Promise(resolve => setTimeout(resolve, jitterMs));
```

### 3. BullMQ Multi-Queue Processing

**File:** `services/queue.service.ts`

Production job queue with idempotency and backpressure.

**Production Features:**
- **Idempotency Keys**: Same jobId = duplicate detection (prevents double processing)
- **Backpressure Limits**: Queue maxLength prevents memory exhaustion
- **Stalled Job Detection**: visibilityTimeout + maxStalledCount prevents stuck jobs
- **Job Versioning**: `_jobVersion` field for schema migration compatibility
- **Separate Concurrency**: Per-queue tuning based on workload

```typescript
// Idempotent job add
const { job, isDuplicate } = await addJob(queueName, data, { idempotencyKey });
if (isDuplicate) return job; // Skip duplicate

// Backpressure config
const QUEUE_CONFIG = {
  export: { maxLength: 50, stalledInterval: 120000 },  // Memory intensive
  summarization: { maxLength: 1000, stalledInterval: 60000 },
};

// Versioned jobs for schema compatibility
const versionedData = { ...data, _jobVersion: JOB_VERSION };
```

### 4. Role-Based Access Control

**File:** `lib/chat-access.ts`

Single-query authorization with timing attack prevention.

**Production Features:**
- **Timing Attack Prevention**: Always same response shape, random delays
- **Transaction Isolation**: Serializable transactions for sensitive ops
- **Batch Lookups**: Efficient multi-user role queries
- **SCAN for Cache Invalidation**: Non-blocking KEYS replacement

```typescript
// Timing attack prevention - always same shape
return { hasAccess: true/false, role: null/ChatRole, normalizedResponse: true };

// Transaction with highest isolation
await prisma.$transaction(async (tx) => {
  const chat = await tx.chat.findFirst({ where: { id: chatId, OR: [...] } });
}, { isolationLevel: "Serializable" });

// Batch role lookup for permissions
const roles = await batchGetChatRoles(chatId, [userId1, userId2, ...]);
```

### 5. Resumable Stream Architecture

**File:** `services/resumable-stream.service.ts`, `services/resumable-pubsub.service.ts`

Production streaming with cross-container coordination.

**Production Features:**
- **TTL Heartbeats**: 30s TTL auto-expires on crash (no ghost streams)
- **Chunk Sequencing**: Sequence numbers + idempotency keys for ordering
- **ACK Mechanism**: Client → server ACKs for accurate resume point
- **Auto-Queued Resume**: Failed resumes get BullMQ retry with DLQ

```typescript
// TTL heartbeat - auto-expires if container crashes
await redis.set(`stream:${streamId}:heartbeat`, JSON.stringify(data), { EX: 30 });

// Heartbeat refresh interval
setInterval(() => redis.set(heartbeatKey, data, { EX: 30 }), 10_000);

// Chunk with sequence + idempotency
await storeChunk(streamId, sequenceNum, chunkId, compressedData);

// Client ACK for accurate resume
await redis.sadd(`stream:${streamId}:acks`, sequenceNum.toString());
```

### 6. MCP Tool Executor with Elicitation

**File:** `services/mcp-tool-executor.service.ts`

Model Context Protocol with user confirmation workflows.

**Production Features:**
- **Persisted State**: Redis-backed elicitation survives UI disconnect
- **Idempotent IDs**: Duplicate approval prevention
- **Server-side Validation**: Never trust LLM-generated params (prompt injection prevention)
- **SSE Replay**: Resume elicitation on reconnect

```typescript
// Persist elicitation state
persistElicitationState({ elicitationId, serverName, message, userId });
await redis.setex(`elicitation:${elicitationId}`, 600, JSON.stringify(state));

// Server-side input validation
function validateToolInput(toolName, args) {
  // Block internal URLs
  if (isInternalUrl(args.url)) return { valid: false };
  // Validate email format
  if (!isValidEmail(args.to)) return { valid: false };
  // Range check amounts
  if (args.amount > 1000000) return { valid: false };
  return { valid: true };
}

// Resume on reconnect
const priorState = await resumeElicitationState(elicitationId);
if (priorState && priorState.status !== "pending") {
  return { action: priorState.status }; // Resume from prior state
}
```

### 7. Atomic Limit Checking

**File:** `services/limits/service.ts`

Race-condition-free limit enforcement.

**Production Features:**
- **Atomic Increment**: Redis INCRBY prevents overselling limits
- **UTC Rolling Windows**: No DST bugs, consistent reset times
- **Plan Change Handling**: Counters reset on upgrade
- **Abuse Detection**: Track failed checks per user

```typescript
// Atomic check-and-increment
const newCount = await redis.incrby(`limit:${feature}:${userId}`, 1);
await redis.expire(key, ttl); // Rolling window auto-cleanup

if (newCount > limit) {
  return { allowed: false, current: newCount, limit };
}

// UTC-based reset (no DST issues)
const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
```

---

## Data Flow

```
Browser Request
      │
      ▼
┌──────────────────────────────────────┐
│          API Route Handler           │
│   app/api/{domain}/route.ts           │
│   1. Rate limit check                │
│   2. Authenticate (validateAuth)    │
│   3. Parse input (Zod schema)       │
│   4. Call service function           │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│           Service Layer             │
│   services/{feature}.service.ts     │
│   1. Business logic                 │
│   2. Redis cache-aside reads        │
│   3. Prisma database operations     │
│   4. Circuit breaker protection     │
│   5. Atomic limit enforcement       │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│        Data Storage                 │
│   PostgreSQL ← Prisma ORM          │
│   Redis ← Cache + PubSub + Streams  │
└──────────────────────────────────────┘
```

---

## Core Patterns

### API Route Pattern

```typescript
export async function POST(request: NextRequest) {
  // 1. Rate limit
  const rateLimitResult = await rateLimit(request, "default");
  if (!rateLimitResult.success) return rateLimitResponse(rateLimitResult.resetAt);

  // 2. Authenticate
  let user;
  try {
    user = await getOrCreateUser(request);
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Validate input
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);

  // 4. Execute with circuit breaker + atomic limits
  const result = await executeWithCircuitBreaker("openai", () =>
    checkLimitAndExecute(user.id, parsed.data)
  );

  // 5. Return
  return NextResponse.json(result);
}
```

### Redis Cache-Aside Pattern

```typescript
async function getUserData(userId: string) {
  const cacheKey = KEYS.userData(userId);

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* Redis down, continue to DB */ }

  const data = await prisma.user.findUnique({ where: { id: userId } });

  try {
    await redis.setex(cacheKey, TTL.userData, JSON.stringify(data));
  } catch { /* Cache failed, non-critical */ }

  return data;
}
```

### Redis Pub/Sub Pattern

```typescript
// Publishing an event
await redis.publish(
  CHANNELS.sidebar(userId),
  JSON.stringify({ type: "chat:archived", chatId: chat.id })
);

// In SSE route handler (subscriber)
redisSub.subscribe(CHANNELS.sidebar(userId));
redisSub.on("message", (channel, message) => {
  // Relay to SSE client
});
```

---

## Key Technologies

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.2.4, React 19.2.5 |
| Runtime | Bun |
| Database | PostgreSQL + Prisma |
| Cache/PubSub | Redis (ioredis) + Streams |
| Auth | Stack Auth |
| AI | OpenAI (GPT models via @ai-sdk/openai) |
| Payments | Polar (Merchant of Record) |
| Search | SearxNG |
| Job Queue | BullMQ (Redis-backed) |
| UI | shadcn/ui, Radix, Tailwind CSS |

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/mydb

# Redis
REDIS_URL=redis://localhost:6380

# Stack Auth
STACK_SECRET_KEY=sk_...
STACK_PUBLISHABLE_KEY=pk_...

# OpenAI AI
OPENAI_API_KEY=gsk_...

# Web Search
SEARXNG_BASE_URL=http://localhost:8888

# Polar Payments
POLAR_ACCESS_TOKEN=pk_live_...
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_MODE=sandbox

# AI Settings
AI_MODEL=eryx-fast
AI_MODEL_WITH_TOOLS=eryx-fast
AI_MAX_TOKENS=1024

# MCP Apps
MCP_CREDENTIALS_ENCRYPTION_KEY=your-32-byte-secret
MCP_OAUTH_CALLBACK_ORIGIN=http://localhost:3000
```

---

## Redis Key Patterns

```typescript
export const KEYS = {
  // Chat
  chatMessages: (chatId) => `chat:${chatId}:messages`,
  chatMeta: (chatId) => `chat:${chatId}:meta`,
  chatRoleCache: (chatId, userId) => `chat:${chatId}:role:${userId}`,

  // User data
  userChats: (userId) => `chats:user:${userId}`,
  userCache: (stackId) => `user:cache:${stackId}`,
  userLimits: (userId) => `user:limits:${userId}`,

  // Rate limiting
  userRateLimit: (userId) => `user:${userId}:rate_limit`,

  // Streaming (TTL heartbeats)
  streamHeartbeat: (streamId) => `stream:${streamId}:heartbeat`,
  streamChunk: (streamId, seq) => `stream:${streamId}:chunks:${seq}`,
  streamAck: (streamId) => `stream:${streamId}:acks`,

  // Circuit breaker
  circuitBreaker: (service) => `circuit_breaker:${service}`,
  halfOpenLock: (service) => `circuit_breaker:${service}:half_open_lock`,

  // Limits (atomic counters)
  limitCounter: (feature, userId) => `limit:${feature}:${userId}`,

  // Search
  searchResults: (query) => `search:${hash(query)}`,

  // Streaming legacy
  streamChunks: (chatId) => `stream:${chatId}:chunks`,
  streamStop: (chatId) => `stream:${chatId}:stop`,
} as const;

export const CHANNELS = {
  sidebar: (userId) => `sidebar:${userId}`,
  chat: (chatId) => `chat:${chatId}`,
  notifications: (userId) => `notifications:${userId}`,
} as const;
```

---

## SSE Real-Time Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Redis Pub/Sub + Streams                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ sidebar:*    │  │ chat:*       │  │ notifications:*│        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ SSE      │      │ SSE      │      │ SSE      │
    │ /chats/  │      │ /chats/: │      │ /notifs/ │
    │ stream   │      │ id/stream│      │ stream   │
    └──────────┘      └──────────┘      └──────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
                     All connected clients
                     receive real-time updates
```

---

## Production Considerations

### Scaling

| Component | Scaling Strategy |
|-----------|------------------|
| Next.js | Horizontal (multiple instances behind load balancer) |
| Redis | Redis Cluster or Redis Sentinel for HA |
| PostgreSQL | Read replicas for scaling reads |
| BullMQ Workers | Auto-scale based on queue depth |

### Resilience

| Failure Mode | Protection |
|--------------|-----------|
| External API down | Circuit breaker with progressive recovery |
| Redis down | In-memory fallback with degraded mode |
| PostgreSQL down | Read replicas, connection pooling |
| Worker crash | BullMQ stalled job detection + retry |

### Security

| Threat | Mitigation |
|--------|-----------|
| Timing attacks | Normalized responses, random delays |
| Prompt injection | Server-side validation of MCP tool inputs |
| Rate limit bypass | Atomic counters in Redis |
| Session fixation | Secure cookie, rotation on login |