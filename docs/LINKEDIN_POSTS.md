# LinkedIn Posts - Eryx Architecture Features

---

## POST 1: Distributed Resumable Stream Pattern

**🧵 How we built a streaming architecture that never loses data**

At Eryx, we needed AI responses that survive connection drops, container restarts, and cross-container coordination. Here's the pattern that made it work:

🔴 **The Problem:**
- User loses connection mid-stream
- Container gets killed during deployment
- Multiple containers handling requests simultaneously

🎯 **The Solution:**
We built a distributed resumable stream system with 7 key components:

1️⃣ **TTL Heartbeats (Ghost Stream Prevention)**
No more stale entries when containers crash:

```typescript
// Heartbeat auto-expires in 30s if container crashes
await redis.set(`stream:${streamId}:heartbeat`, JSON.stringify(data), { EX: 30 });

// Periodic refresh (every 10s) keeps it alive while healthy
setInterval(() => refreshHeartbeat(streamId), 10_000);
```

If the container crashes, the heartbeat expires automatically → no ghost streams.

2️⃣ **Chunk Compression**
Using Web Streams API's CompressionStream to gzip compress chunks before Redis storage. Reduces bandwidth and storage by ~70%.

3️⃣ **Cross-Container Active Detection**
`active:streams` Redis set + heartbeat verification. Only streams with valid heartbeats are considered alive.

4️⃣ **Auto-Queuing Failed Resumes**
Failed resume attempts get automatically queued with exponential backoff via BullMQ with Dead Letter Queue support.

5️⃣ **Partial Refund Tracking**
`chatPartial` Redis key tracks stream progress for accurate credit refunds on interrupted sessions.

6️⃣ **ACK Mechanism for Correct Resume**
Client sends ACK for each chunk received. Resume from last acked + 1, not last produced:

```typescript
// Client ACKs each chunk
await redis.sadd(`stream:${streamId}:acks`, sequenceNum);

// Server resumes from last acked + 1
const resumeFrom = Math.max(...acks) + 1;
```

7️⃣ **Sequence Numbers + Idempotency**
Each chunk has sequence number + idempotency key. Prevents duplicates and out-of-order delivery.

**What similar resilience challenges have you solved in streaming systems?**

#DistributedSystems #AI #Architecture #Backend

---

## POST 2: Distributed Circuit Breaker

**🔌 The pattern that saved us from cascade failures (Production Grade)**

External services fail. When they do, without protection, your service fails too. Then theirs fails more. Classic cascade failure.

Here's how we implemented a distributed circuit breaker that actually works at scale:

🎯 **The Core Concept:**
A state machine with 3 states:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Failures exceeded threshold, requests fail fast
- **HALF_OPEN**: Testing if service recovered

📊 **Problem 1: Thundering Herd on HALF_OPEN**
Multiple containers try recovery simultaneously → spike of requests

✅ **Fix: Distributed Lock**
```typescript
// Only ONE container tests recovery - prevents thundering herd
const lockAcquired = await redis.set(lockKey, pid, { NX: true, EX: 5 });
if (!lockAcquired) return { allowed: false }; // Another container testing
```

📊 **Problem 2: Clock Drift**
Different containers → slightly different clocks → circuits reopen inconsistently

✅ **Fix: Redis TIME**
```typescript
// Use Redis time for consistent timestamps across ALL containers
const [seconds, microseconds] = await redis.time();
const now = parseInt(seconds, 10) * 1000;
```

📊 **Problem 3: All Errors Treated Equally**
Timeout ≠ 500 ≠ rate limit ≠ network error. But we treated them all the same → circuits open too aggressively or too late.

✅ **Fix: Error Classification**
```typescript
enum ErrorType {
  RETRYABLE = "retryable",  // 500s, timeouts, rate limits → open circuit
  FATAL = "fatal",          // 400s, 401/403 → don't open circuit
  IGNORED = "ignored",      // User errors → don't affect circuit
}
```

📊 **Problem 4: Cold Start**
New service → no history → starts CLOSED. First spike hits external service hard.

✅ **Fix: Warmup Phase**
```typescript
// First N calls don't count toward failure threshold
if (totalCalls < warmupCalls) return { allowed: true };
```

📊 **Problem 5: Binary Recovery**
Too binary: OPEN → HALF_OPEN → CLOSED (all or nothing)

✅ **Fix: Progressive Recovery**
```typescript
// Traffic allowed at each step: 1 → 2 → 5 → 10 → 25 → 50 → 100 (full)
const steps = [1, 2, 5, 10, 25, 50, 100];
const maxCalls = steps[recoveryStep];
```

**What's your approach to external service resilience?**

#CircuitBreaker #Microservices #Backend #SystemDesign

---

## POST 3: Redis Resilience Layer

**🛡️ How we built a "fallback-first" Redis layer that won't silently corrupt your system**

Redis goes down. It happens. The question is: does your app die with it?

We built a resilience layer that keeps us functional during Redis outages WITHOUT silently corrupting system behavior.

🔴 **Problem 1: Silent Data Corruption**
Fallbacks like `rateLimit: { success: true }` silently change system behavior. This can break billing, allow abuse, skew analytics.

✅ **Fix: Fallback Metadata**
```typescript
return {
  value: fallback,
  degraded: true,
  fallback: true,
  _meta: { source: "redis-circuit-breaker", timestamp: Date.now() }
};

// Callers MUST check degraded and log appropriately
if (result.degraded) {
  console.warn(`[Redis] Operating with fallback for ${result.operation}`);
  // Alert/metric
}
```

🔴 **Problem 2: Split-Brain Behavior**
Some containers: Redis working
Other containers: Redis down → fallback
→ Inconsistent behavior across system

✅ **Fix: Global Degraded Mode**
```typescript
let globalDegradedMode = false; // Single flag, all containers

// Any critical circuit opening → enter degraded mode
function enterDegradedMode() {
  globalDegradedMode = true; // ALL containers use fallbacks
}

// When Redis recovers, ALL containers exit together
```

🔴 **Problem 3: Fallback Drift**
Over time, fallback logic diverges from real logic → subtle bugs appear.

✅ **Fix: Minimal Fallbacks**
We DON'T implement parallel fallback systems. We choose one:
- **Fail-open**: Allow requests through (rate limiting)
- **Fail-closed**: Block dangerous operations (auth)

No middle ground that could drift.

🔴 **Problem 4: Retry Storm After Recovery**
Redis comes back → ALL requests retry simultaneously → spike

✅ **Fix: Recovery Jitter**
```typescript
// Random 0-5s delay before exiting degraded mode
const jitterMs = Math.random() * 5000;
await new Promise(resolve => setTimeout(resolve, jitterMs));
```

**How do you handle Redis failures in your architecture?**

#Redis #Resilience #Backend #Architecture

---

## POST 4: Multi-Queue BullMQ Processing (Production Grade)

**⚡ Why we use 6 different queues with different concurrency settings**

Not all background jobs are equal. A webhook needs sub-second response. AI summarization can take 30 seconds. File export might eat all memory.

We learned this the hard way.

🎯 **Our Queue Architecture:**

```typescript
const QUEUE_CONFIG = {
  webhook: { maxLength: 10000, stalledInterval: 30000 },
  summarization: { maxLength: 1000, stalledInterval: 60000 },
  "file-processing": { maxLength: 500, stalledInterval: 45000 },
  email: { maxLength: 5000, stalledInterval: 30000 },
  resume: { maxLength: 2000, stalledInterval: 30000 },
  export: { maxLength: 50, stalledInterval: 120000 },  // Memory intensive!
};
```

🔴 **Problem 1: Queue Starvation**
High priority queues dominate workers → low priority jobs never run

✅ **Fix: Tuned Concurrency Per Queue**
```typescript
function getConcurrency(queueName: string): number {
  case QUEUE_NAMES.WEBHOOK: return 5;      // Needs speed
  case QUEUE_NAMES.SUMMARIZATION: return 2; // Expensive AI
  case QUEUE_NAMES.EXPORT: return 1;      // Memory intensive
}
```

🔴 **Problem 2: No Backpressure**
What if summarization queue explodes? → Memory / Redis / API overload

✅ **Fix: Queue Size Limits**
```typescript
// Queue rejects new jobs when over maxLength
const queue = new Queue(name, { maxLength: 1000 });
// Job rejected with error when queue is full
```

🔴 **Problem 3: Job Idempotency**
Retries = duplicate execution → double emails, double charges

✅ **Fix: Idempotency Keys**
```typescript
const { job, isDuplicate } = await addJob(queue, data, {
  idempotencyKey: `summarize:${chatId}`
});
if (isDuplicate) return job; // Skip duplicate
```

🔴 **Problem 4: Visibility Timeout Issues**
Worker crashes mid-job → job stuck or duplicated

✅ **Fix: Stalled Job Detection**
```typescript
const worker = new Worker(queueName, processor, {
  stalledInterval: 30000,    // Check every 30s
  maxStalledCount: 3,       // Move to failed after 3 stalls
});
```

🔴 **Problem 5: Schema Migration**
New worker version vs old jobs → schema mismatch

✅ **Fix: Job Versioning**
```typescript
const JOB_VERSION = 1;
const versionedData = { ...data, _jobVersion: JOB_VERSION };
```

**How do you tune your job queue concurrency?**

#BullMQ #Queue #Backend #Performance

---

## POST 5: Role-Based Chat Access Control (Production Grade)

**🔐 Single-query authorization that doesn't leak your data**

Access control seems simple until you need to check "is this user either the owner OR a member of this chat?"

Most implementations make 2 queries. We do it in 1. But we also fixed subtle security issues.

🎯 **The Pattern:**

```typescript
const chat = await prisma.chat.findFirst({
  where: {
    id: chatId,
    OR: [
      { userId },                           // Direct owner
      { members: { some: { userId } } },   // Or member
    ],
  },
  select: {
    userId: true,
    members: { where: { userId }, select: { role: true }, take: 1 },
  },
});
```

🔴 **Problem 1: Timing Attacks**
`findFirst` returning null reveals existence patterns.
Attacker can guess valid chat IDs by timing responses.

✅ **Fix: Normalized Responses + Random Delays**
```typescript
// ALWAYS return same shape
return { hasAccess: boolean, role: ChatRole | null, normalizedResponse: true };

// Random delay to further obscure timing
if (Math.random() < 0.1) {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
}
```

🔴 **Problem 2: Role Escalation Race**
Membership changes during request → stale authorization

✅ **Fix: Serializable Transaction Isolation**
```typescript
const role = await prisma.$transaction(async (tx) => {
  return tx.chat.findFirst({ where: { id: chatId, OR: [...] } });
}, { isolationLevel: "Serializable" });
```

🔴 **Problem 3: Missing Index Optimization**
OR query can degrade badly at scale

✅ **Fix: Composite Indexes**
```sql
-- In Prisma schema
@@index([id, userId])
@@index([chatId, userId])
```

🔴 **Problem 4: KEYS Blocking Redis**
Cache invalidation with KEYS blocks Redis for seconds on large datasets

✅ **Fix: SCAN Instead of KEYS**
```typescript
// Use SCAN instead of KEYS to avoid blocking Redis
do {
  const [nextCursor, keys] = await redis.scan(
    cursor, "MATCH", pattern, "COUNT", 100
  );
  cursor = nextCursor;
} while (cursor !== "0");
```

**What's your authorization pattern?**

#Security #Prisma #PostgreSQL #Backend

---

## POST 6: MCP Tool Executor with Elicitation (Production Grade)

**🤖 Building AI agents that ask for permission (safely)**

MCP (Model Context Protocol) lets AI use tools. But what happens when a tool needs user confirmation before execution?

We built real-time elicitation with security baked in.

🎯 **The Flow:**

1️⃣ AI decides it needs to use a tool (e.g., "send email")
2️⃣ Server sends elicitation event via SSE
3️⃣ UI shows confirmation modal to user
4️⃣ User approves/denies
5️⃣ Response sent back to AI
6️⃣ AI continues (or aborts)

🔴 **Problem 1: User Disconnects**
User starts approval, loses connection → elicitation lost

✅ **Fix: Persist State to Redis**
```typescript
// Persist for cross-container recovery
await redis.setex(`elicitation:${elicitationId}`, 600, JSON.stringify({
  id: elicitationId,
  serverName,
  message,
  userId,
  status: "pending",
  createdAt: Date.now(),
}));

// Resume on reconnect
const priorState = await resumeElicitationState(id);
if (priorState?.status !== "pending") {
  return { action: priorState.status };
}
```

🔴 **Problem 2: Duplicate Approvals**
User double-clicks or network retries → tool executed twice

✅ **Fix: Idempotent Elicitation IDs**
```typescript
// Use request ID or generate deterministic ID
const elicitationId = request.id || `${toolName}:${hash(args)}:${timestamp}`;
// Same ID = same approval = skip duplicate
```

🔴 **Problem 3: Malicious Prompt Injection**
AI might try: "Send email to attacker@evil.com" → user might blindly approve

✅ **Fix: Server-Side Input Validation**
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

🔴 **Problem 4: SSE Reliability**
SSE disconnect mid-elicitation → lost request

✅ **Fix: Replay Mechanism**
```typescript
// Client reconnects → check for pending elicitation
const pending = await getPendingElicitations(userId);
if (pending.length > 0) {
  // Resend elicitation events to client
  dataStream({ type: "data-mcp_elicitation", data: pending[0] });
}
```

**How do you handle AI tool permissions?**

#MCP #AIAgents #Architecture #Security

---

## POST 7: Feature-Flagged Plan-Based Limits (Production Grade)

**📊 Building a limits system that's flexible for plans but race-condition-free**

"Hey, can we add a limit for X?" - Every product manager ever.

We built a centralized limit system that handles this gracefully AND prevents race conditions.

🎯 **The Architecture:**

```typescript
export async function checkLimit(
  userId: string,
  feature: LimitFeature,
  options?: CheckOptions
): Promise<LimitCheckResult> {
  // Admin bypass
  if (await isAdmin(userId)) return createUnlimitedResult(feature);

  switch (feature) {
    case "CHAT": return checkChatLimit(userId, plan);
    case "MESSAGE": return checkMessageLimit(userId, plan);
    // New limit? Just add a case here
  }
}
```

🔴 **Problem 1: Race Conditions**
Multiple requests check limit simultaneously → all pass → limit exceeded

✅ **Fix: Atomic Increment**
```typescript
// Redis INCRBY is atomic - check-and-increment in one operation
const newCount = await redis.incrby(`limit:${feature}:${userId}`, 1);
await redis.expire(key, ttl); // Auto-cleanup with rolling window

if (newCount > limit) {
  return { allowed: false, current: newCount, limit };
}
```

🔴 **Problem 2: Time Boundary Bugs**
Reset at midnight → timezone issues, DST bugs

✅ **Fix: UTC Rolling Windows**
```typescript
// UTC-based reset (no DST issues)
const endOfMonth = new Date(Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth() + 1,
  1, 0, 0, 0, 0
));
```

🔴 **Problem 3: Plan Change Edge Case**
User upgrades mid-cycle → what happens to used quota?

✅ **Fix: Cache Invalidation + Counter Reset**
```typescript
async function onPlanChange(userId, oldPlan, newPlan) {
  // Invalidate caches
  await invalidateCache(userId);

  // Reset atomic counters so new plan limits take effect immediately
  for (const feature of ["MESSAGE", "CHAT", "PROJECT"]) {
    await redis.del(`limit:${feature}:${userId}`);
  }
}
```

🔴 **Problem 4: Abuse Vectors**
Users creating multiple accounts → bypass limits

✅ **Fix: Abuse Detection**
```typescript
// Track failed limit checks
const abuseCount = await redis.incr(`limit:abuse:${userId}`);
await redis.expire(cacheKey, 3600); // 1 hour window

if (abuseCount > 10) {
  // Flag for review or add additional verification
}
```

💡 **The Key Pattern:**
Every limit check returns the SAME shape:
```typescript
{
  allowed: boolean,
  current: number,
  limit: number,
  resetAt: Date,
  upgradeUrl?: string,
}
```

UI doesn't need to know WHAT the limit is for. Same component renders everything.

**How do you handle feature limits in your app?**

#SaaS #MultiTenant #Architecture #Backend