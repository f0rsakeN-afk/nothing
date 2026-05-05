# Services Architecture

## Overview

Business logic is centralized in `services/`. API routes are thin HTTP wrappers that delegate to services. This separation enables:
- Reusable business logic across API routes
- Easier testing (mock services, not HTTP)
- Cleaner code organization

## Service Files

```
services/
├── chat.service.ts              # Chat CRUD, branching, message ops
├── credit.service.ts            # Credit balance, deduction, refunds
├── limit.service.ts              # Plan limits checking (atomic)
├── plan.service.ts              # Plan data access
├── memory.service.ts             # User memory operations
├── summarize.service.ts          # Hierarchical context summarization
├── rate-limit.service.ts        # Rate limiting logic
├── resumable-stream.service.ts   # SSE streaming with resume support
├── resumable-pubsub.service.ts   # Cross-container stream tracking (TTL heartbeats)
├── resume-queue.service.ts       # Resume retry queue (DLQ support)
├── chat-pubsub.service.ts        # Chat real-time notifications
├── circuit-breaker.service.ts    # Distributed circuit breaker
├── chat-access.service.ts       # Role-based access control
├── mcp-tools.service.ts         # MCP tool discovery
├── mcp-tool-executor.service.ts  # MCP tool execution (elicitation + validation)
├── rag.service.ts                # RAG context retrieval
├── embedding.service.ts         # Text embeddings
├── push-notification.service.ts  # Web push notifications
├── queue.service.ts              # BullMQ job queue (idempotent)
├── workers.ts                    # Background job processors
│
├── admin/
│   ├── audit-log.service.ts     # Audit event logging
│   ├── inbox.service.ts         # Admin inbox
│   └── stats.service.ts         # Aggregated stats
│
└── [feature].service.ts
```

---

## Circuit Breaker Service

**File:** `services/circuit-breaker.service.ts`

Distributed circuit breaker with production-grade features.

### Features

| Feature | Implementation |
|---------|----------------|
| HALF_OPEN Lock | Redis SETNX ensures only ONE container tests recovery |
| Clock Drift | Uses `redis.time()` for consistent timestamps |
| Error Classification | RETRYABLE vs FATAL vs IGNORED |
| Warmup Phase | New services allowed spike before threshold applies |
| Progressive Recovery | 1 → 2 → 5 → 10 → full traffic |
| Per-Service Config | Different thresholds for OpenAI vs Polar (payments) |

### Error Classification

```typescript
enum ErrorType {
  RETRYABLE = "retryable",   // 500s, timeouts, rate limits → open circuit
  FATAL = "fatal",           // 400s, 401/403 → don't open circuit
  IGNORED = "ignored",        // User errors → don't affect circuit
}

function classifyError(error: Error): ErrorType {
  if (statusCode === 400) return ErrorType.FATAL;
  if (statusCode >= 500) return ErrorType.RETRYABLE;
  if (statusCode === 429) return ErrorType.RETRYABLE;
  if (message.includes("timeout")) return ErrorType.RETRYABLE;
}
```

### Per-Service Configuration

```typescript
const SERVICE_CONFIGS = {
  openai: {
    failureThreshold: 3,       // Aggressive - users notice latency
    successThreshold: 2,
    openTimeoutMs: 15000,
    warmupCalls: 5,
    progressiveRecovery: true,
  },
  polar: {
    failureThreshold: 5,        // Conservative - money at stake
    successThreshold: 2,
    openTimeoutMs: 30000,
    halfOpenMaxCalls: 1,
    progressiveRecovery: false, // Payments go straight to full
  },
};
```

### Usage

```typescript
const result = await executeWithCircuitBreaker("openai", () =>
  eryxProvider.generate(prompt)
);
```

---

## Redis Resilience Layer

**File:** `lib/redis-resilience.ts`

Graceful degradation when Redis is unavailable.

### Global Degraded Mode

Prevents split-brain where some containers use Redis and others use fallbacks:

```typescript
let globalDegradedMode = false;  // Single flag, all containers

// On any critical circuit opening:
function enterDegradedMode() {
  globalDegradedMode = true;
  console.warn("[Redis] Entered DEGRADED mode");
}

// On recovery:
async function exitDegradedMode() {
  // Add jitter to prevent retry storm
  await new Promise(resolve => setTimeout(resolve, Math.random() * 5000));
  globalDegradedMode = false;
}
```

### Fallback with Metadata

Every fallback includes observability metadata:

```typescript
return {
  value: fallback,
  degraded: true,
  fallback: true,
  _meta: { source: "redis-circuit-breaker", timestamp: Date.now() }
};

// Caller MUST check degraded flag and log/alert
if (result.degraded) {
  console.warn(`[Redis] Operating in fallback mode for ${result.operation}`);
}
```

---

## Queue Service (BullMQ)

**File:** `services/queue.service.ts`

Production job queue with idempotency and backpressure.

### Queue Configuration

| Queue | Purpose | Concurrency | Max Length | Stalled Interval |
|-------|---------|-------------|------------|-------------------|
| `webhook` | Polar webhooks | 5 | 10,000 | 30s |
| `summarization` | AI summarization | 2 | 1,000 | 60s |
| `file-processing` | Post-upload | 3 | 500 | 45s |
| `email` | Transactional | 5 | 5,000 | 30s |
| `resume` | Stream recovery | 3 | 2,000 | 30s |
| `export` | Memory intensive | 1 | 50 | 120s |

### Idempotency

```typescript
// Same idempotency key = duplicate detection
const { job, isDuplicate } = await addJob(queueName, data, {
  idempotencyKey: `summarize:${chatId}`
});

if (isDuplicate) {
  console.log("Job already exists, skipping");
  return job;
}
```

### Backpressure

```typescript
const QUEUE_CONFIG = {
  export: {
    maxLength: 50,              // Memory intensive - keep low
    stalledInterval: 120000,     // Long running job detection
  },
  summarization: {
    maxLength: 1000,             // AI queue - prevent overload
    stalledInterval: 60000,
  },
};
```

### Job Versioning

For schema migration compatibility:

```typescript
const JOB_VERSION = 1;

const versionedData = {
  ...data,
  _jobVersion: JOB_VERSION,
  _createdAt: Date.now(),
};
```

---

## Chat Access Control

**File:** `lib/chat-access.ts`

Role-based access with timing attack prevention.

### Timing Attack Prevention

```typescript
// Always return same shape - prevents inference
interface AccessCheckResult {
  hasAccess: boolean;
  role: ChatRole | null;
  normalizedResponse: true;  // Always true
}

// Random delays further obscure timing
if (Math.random() < 0.1) {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
}
```

### Transaction-Level Isolation

For sensitive operations:

```typescript
const role = await prisma.$transaction(async (tx) => {
  return tx.chat.findFirst({
    where: { id: chatId, OR: [{ userId }, { members: { some: { userId } } }] },
    select: { userId: true, members: { select: { role: true }, take: 1 } },
  });
}, { isolationLevel: "Serializable" });
```

### Cache Invalidation (SCAN)

```typescript
// Use SCAN instead of KEYS - non-blocking
do {
  const [nextCursor, keys] = await redis.scan(
    cursor,
    "MATCH", `chat:${chatId}:role:*`,
    "COUNT", 100
  );
  cursor = nextCursor;
  cacheKeys.push(...keys);
} while (cursor !== "0");

// Delete in batches
for (let i = 0; i < cacheKeys.length; i += BATCH_SIZE) {
  await redis.del(...batch);
}
```

---

## Resumable Stream Service

**File:** `services/resumable-stream.service.ts`, `services/resumable-pubsub.service.ts`

SSE streaming with cross-container coordination.

### TTL Heartbeats (Ghost Stream Prevention)

```typescript
// Heartbeat auto-expires in 30s if container crashes
const heartbeatKey = `stream:${streamId}:heartbeat`;
await redis.set(heartbeatKey, JSON.stringify({
  containerId: getContainerId(),
  lastSeen: Date.now(),
}), { EX: 30 });

// Periodic refresh (every 10s)
setInterval(() => {
  redis.set(heartbeatKey, data, { EX: 30 });
}, 10_000);

// On read, filter out expired
const isAlive = await redis.exists(heartbeatKey);
```

### Chunk Consistency

```typescript
// Store with sequence number + idempotency key
async function storeChunk(streamId, sequenceNum, chunkId, data) {
  // Check duplicate
  const existing = await redis.get(`meta:${streamId}:${sequenceNum}`);
  if (existing?.chunkId === chunkId) return; // Duplicate

  // Store chunk
  await redis.set(`chunk:${streamId}:${sequenceNum}`, data);

  // Update high-water mark
  await redis.set(`hwm:${streamId}`, sequenceNum);
}
```

### ACK Mechanism (Correct Resume)

```typescript
// Client ACKs each chunk
await redis.sadd(`stream:${streamId}:acks`, sequenceNum);

// Resume from last acked + 1
const acks = await redis.smembers(`stream:${streamId}:acks`);
const resumeFrom = Math.max(...acks.map(Number)) + 1;
```

---

## MCP Tool Executor

**File:** `services/mcp-tool-executor.service.ts`

MCP with elicitation and server-side validation.

### Elicitation State Persistence

```typescript
// Persist to Redis for cross-container recovery
const state = {
  id: elicitationId,
  serverName,
  message,
  userId,
  status: "pending",
  createdAt: Date.now(),
};
await redis.setex(`elicitation:${elicitationId}`, 600, JSON.stringify(state));

// Resume on reconnect
const prior = await redis.get(`elicitation:${elicitationId}`);
if (prior && prior.status !== "pending") {
  return { action: prior.status }; // Resume from prior state
}
```

### Server-Side Input Validation

```typescript
function validateToolInput(toolName: string, args: Record<string, unknown>) {
  // Block internal URLs (SSRF prevention)
  if (isInternalUrl(args.url as string)) {
    return { valid: false, error: "Cannot access internal resources" };
  }

  // Validate email format
  if (!isValidEmail(args.to as string)) {
    return { valid: false, error: "Invalid email address" };
  }

  // Range check amounts
  if ((args.amount as number) > 1000000) {
    return { valid: false, error: "Amount exceeds maximum" };
  }

  return { valid: true };
}
```

---

## Limit Service (Atomic)

**File:** `services/limits/service.ts`

Race-condition-free limit enforcement.

### Atomic Increment

```typescript
// Redis INCRBY is atomic - prevents race conditions
const newCount = await redis.incrby(`limit:${feature}:${userId}`, 1);

// Set expiry for rolling window
await redis.expire(key, ttl); // Auto-cleanup

if (newCount > limit) {
  return { allowed: false, current: newCount, limit };
}
```

### UTC Rolling Windows

```typescript
function getNextResetTime(): Date {
  const now = new Date();
  // End of current UTC month (no DST issues)
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1, 0, 0, 0, 0
  ));
}
```

### Plan Change Handling

```typescript
async function onPlanChange(userId, oldPlan, newPlan) {
  // Invalidate caches
  await invalidateCache(userId);

  // Reset atomic counters
  for (const feature of ["MESSAGE", "CHAT", "PROJECT"] as LimitFeature[]) {
    await redis.del(`limit:${feature}:${userId}`);
  }
}
```

---

## Service Layer Conventions

### 1. Always Include userId in Where Clauses

```typescript
// WRONG - security hole
await prisma.mcpUserServer.update({ where: { id: serverId }, data: {} });

// CORRECT - userId verified
await prisma.mcpUserServer.update({ where: { id: serverId, userId }, data: {} });
```

### 2. Cache-Aside Pattern

```typescript
async function getCachedData(userId: string) {
  const cacheKey = KEYS.userCache(userId);

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* Redis down */ }

  const data = await prisma.user.findUnique({ where: { id: userId } });

  try {
    await redis.setex(cacheKey, TTL.userCache, JSON.stringify(data));
  } catch { /* Cache failed */ }

  return data;
}
```

### 3. Transaction for Atomic Operations

```typescript
const chat = await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const newChat = await tx.chat.create({ data: { title, userId, projectId } });

  if (firstMessage) {
    await tx.message.create({ data: { chatId: newChat.id, ... } });
  }

  return newChat;
});
```

### 4. Invalidate Cache on Mutation

```typescript
async function updateUser(userId: string, data: UpdateUserData) {
  const updated = await prisma.user.update({ where: { id: userId }, data });

  // Invalidate caches
  await redis.del(KEYS.userCache(stackId));
  await redis.del(KEYS.userLimits(userId));

  return updated;
}
```

### 5. Fire-and-Forget for Non-Critical Operations

```typescript
// Trigger async summarization without blocking response
queueSummarization(chatId).catch(console.error);

// Audit logging
logAuditEvent({ type: "chat.created", userId, chatId }).catch(console.error);
```

### 6. Always Check Fallback Metadata

```typescript
const result = await withCircuitBreaker("rateLimit", () =>
  redis.get(cacheKey)
, { success: true, remaining: 1000 });

// Must check degraded flag
if (result.degraded) {
  console.warn("[Redis] Operating with fallback");
  // Log to metrics/alerting
}
```

### 7. Use SCAN Not KEYS in Production

```typescript
// WRONG - blocks Redis
const keys = await redis.keys(`chat:${chatId}:*`);

// CORRECT - non-blocking
let cursor = "0";
do {
  const [nextCursor, batch] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
  cursor = nextCursor;
  // Process batch
} while (cursor !== "0");
```

---

## Queue Worker Pattern

```typescript
export function createWorker<T>(queueName: string, processor: (job: Job<T>) => Promise<void>) {
  return new Worker(queueName, async (job: Job<T>) => {
    // Version check
    const jobVersion = (job.data as any)._jobVersion;
    if (jobVersion && jobVersion !== JOB_VERSION) {
      console.warn(`Job version mismatch: ${jobVersion} vs ${JOB_VERSION}`);
    }

    await processor(job);
  }, {
    stalledInterval: 30000,
    maxStalledCount: 3,
  });
}
```

---

## Chat Service

**File:** `services/chat.service.ts`

### Core Functions

```typescript
// Chat list with cursor pagination
async function getUserChats(
  userId: string,
  limit = 20,
  cursor?: string,
  options: { archived?: boolean; projectId?: string } = {}
): Promise<{ chats: Chat[]; nextCursor: string | null }>

// Search chats
async function searchUserChats(
  userId: string,
  query: string,
  limit = 20
): Promise<{ chats: Chat[]; nextCursor: null }>

// Create chat
async function createChat(
  userId: string,
  options: { projectId?: string; firstMessage?: string } = {}
): Promise<Chat>

// Get chat by ID
async function getChatById(chatId: string, userId: string): Promise<Chat | null>

// Update chat (title, archive, pin, project)
async function updateChat(
  chatId: string,
  userId: string,
  data: { title?: string; archivedAt?: Date | null; projectId?: string | null; pinnedAt?: Date | null }
): Promise<Chat>

// Delete chat
async function deleteChat(chatId: string, userId: string): Promise<void>

// Get messages with bidirectional pagination
async function getChatMessages(
  chatId: string,
  userId: string,
  limit = 50,
  cursor?: string,
  direction: "before" | "after" = "before"
): Promise<{ messages: Message[]; nextCursor: string | null; prevCursor: string | null }>

// Add message
async function addChatMessage(
  chatId: string,
  userId: string,
  data: { role: "user" | "assistant"; content: string }
): Promise<Message>

// Get recent messages for AI context
async function getRecentMessages(chatId: string, limit = 20): Promise<Message[]>
```

### Caching

```typescript
// Chat list: 5 min TTL
await redis.setex(KEYS.userChats(userId), TTL.userChats, JSON.stringify(chats));

// Chat metadata: hash stored in Redis
await redis.hset(KEYS.chatMeta(chatId), {
  title: chat.title,
  createdAt: chat.createdAt.toISOString(),
  projectId: chat.projectId || "",
});

// Chat messages: list with 1 hour TTL
await redis.lpush(KEYS.chatMessages(chatId), JSON.stringify(message));
await redis.ltrim(KEYS.chatMessages(chatId), 0, 99); // Keep last 100
```

### Pub/Sub Events

```typescript
// Published when chat state changes
await redis.publish(
  CHANNELS.sidebar(userId),
  JSON.stringify({
    type: "chat:created" | "chat:archived" | "chat:pinned" | "chat:renamed" | "chat:deleted",
    chatId: chat.id,
    title: chat.title,
  })
);
```

---

## Credit Service

**File:** `services/credit.service.ts`

### Core Functions

```typescript
// Get current balance
async function getUserCredits(userId: string): Promise<number>

// Deduct credits for operation
async function deductCredits(
  userId: string,
  operation: CreditOperation,
  customAmount?: number
): Promise<{ success: boolean; deducted?: number; remainingCredits?: number; error?: string }>

// Add credits
async function addCredits(userId: string, amount: number): Promise<{ success: boolean; newBalance: number }>

// Check if user can afford operation
async function checkCreditsForOperation(userId: string, operation: CreditOperation): Promise<boolean>

// Proportional refund for partial stream
async function refundProportional(
  userId: string,
  streamedBytes: number,
  totalBytes: number,
  operation: CreditOperation
): Promise<{ success: boolean; refunded: number }>
```

### Credit Operations & Costs

```typescript
type CreditOperation = "eryx-fast" | "eryx-pro" | "web-search" | "file-analysis" | "image-generation";

const CREDIT_COSTS = {
  "eryx-fast": 1,
  "eryx-pro": 5,
  "web-search": 3,
  "file-analysis": 5,
  "image-generation": 20,
};
```

---

## Limit Service

**File:** `services/limit.service.ts`

### UserLimits Interface

```typescript
interface UserLimits {
  maxMemoryItems: number;
  maxBranchesPerChat: number;
  maxFolders: number;
  maxAttachmentsPerChat: number;
  maxFileSizeMb: number;
  canExport: boolean;
  canApiAccess: boolean;
  hasFeature: (feature: string) => boolean;
  planName: string;
  planTier: PlanTier;
  maxProjects: number;
  maxChats: number;
  maxMessages: number;
}
```

### Limit Check Functions

```typescript
// Atomic check (prevents race conditions)
async function atomicCheckLimit(
  userId: string,
  feature: LimitFeature,
  increment?: number
): Promise<{ allowed: boolean; current: number; limit: number }>

// Get full limits (cached 5 min)
async function getUserLimits(userId: string): Promise<UserLimits>

// Invalidate cache on plan change
async function invalidateUserLimitsCache(userId: string): Promise<void>

// Individual limit checks
async function checkChatLimit(userId: string): Promise<LimitCheckResult>
async function checkProjectLimit(userId: string): Promise<LimitCheckResult>
async function checkMemoryLimit(userId: string): Promise<LimitCheckResult>
async function checkBranchLimit(userId: string, chatId: string): Promise<LimitCheckResult>
async function checkFolderLimit(userId: string): Promise<LimitCheckResult>
async function checkAttachmentLimit(userId: string, chatId: string): Promise<LimitCheckResult>
async function checkExportLimit(userId: string): Promise<LimitCheckResult>
async function checkApiAccessLimit(userId: string): Promise<LimitCheckResult>
async function checkFileSizeLimit(userId: string, fileSizeMb: number): Promise<LimitCheckResult>
```

---

## Memory Service

**File:** `services/memory.service.ts`

```typescript
async function getUserMemories(userId: string): Promise<Memory[]>
async function getMemoriesByCategory(userId: string, category: string): Promise<Memory[]>
async function createMemory(userId: string, data: CreateMemoryInput): Promise<Memory>
async function updateMemory(memoryId: string, userId: string, data: UpdateMemoryInput): Promise<Memory>
async function deleteMemory(memoryId: string, userId: string): Promise<void>
async function searchMemories(userId: string, query: string): Promise<Memory[]>
```

**Redis caching:** 5 minute TTL on list operations.

---

## Summarize Service

**File:** `services/summarize.service.ts`

Handles hierarchical context management for long conversations.

### Why Summarize?

When a chat has 50+ messages, sending all to the LLM exceeds token budgets. Instead of raw truncation:
1. Generate structured summary via LLM after every 50 messages
2. Store summary in PostgreSQL + Redis cache
3. Use summary + recent messages for context

### Core Functions

```typescript
// Get smart context - summary + recent messages
async function getChatContext(
  chatId: string,
  options: { maxTokens?: number }
): Promise<{
  messages: Message[];
  summary?: string;
  topics?: string[];
  keyFacts?: string[];
  truncated: boolean;
}>

// Check if chat needs summarization
async function shouldSummarize(chatId: string): Promise<boolean>

// Async trigger for summarization (fire-and-forget)
async function queueSummarization(chatId: string): Promise<void>

// Perform LLM summarization
async function summarizeChat(chatId: string): Promise<boolean>

// Delete summary when chat deleted
async function deleteSummary(chatId: string): Promise<void>
```

---

## Rate Limit Service

**File:** `services/rate-limit.service.ts`

### Rate Limit Tiers

```typescript
const RATE_LIMITS = {
  default: { windowMs: 60000, maxRequests: 100 },   // 100/min
  auth:    { windowMs: 300000, maxRequests: 10 },  // 10/5min
  chat:    { windowMs: 60000, maxRequests: 60 },   // 60/min
  search:  { windowMs: 60000, maxRequests: 30 },   // 30/min
};
```

---

## MCP Tools Service

**File:** `services/mcp-tools.service.ts`

### Core Functions

```typescript
// Load tools from all user's enabled MCP servers
async function getMCPToolsForChat(userId: string): Promise<McpToolDefinition[]>

// Test MCP server connection
async function testMcpServer(
  url: string,
  transportType: "http" | "sse",
  authHeaders?: Record<string, string>
): Promise<{ ok: boolean; toolCount: number; toolNames: string[] }>

// Format tools for OpenAI schema
function formatMCPToolsForOpenAI(tools: McpToolDefinition[]): OpenAITool[]
```

### Tool Naming

Tools are prefixed with server slug to avoid collisions:

```
Server: "GitHub Copilot" → slug: "github_copilot"
Tool: "pullRequests"   → full name: "mcp_github_copilot_pullRequests"
```

---

## RAG Service

**File:** `services/rag.service.ts`

Retrieval-Augmented Generation for context injection.

### Core Functions

```typescript
// Retrieve relevant context for a query
async function retrieveContext(
  query: string,
  options: { userId?: string; fileIds?: string[]; maxTokens?: number }
): Promise<RagContext[]>

// Embed text for similarity search
async function embedText(text: string): Promise<number[]>
```

### Context Types

```typescript
interface RagContext {
  type: "memory" | "file" | "project";
  id: string;
  title: string;
  content: string;
  relevance: number;
  metadata?: Record<string, unknown>;
}
```