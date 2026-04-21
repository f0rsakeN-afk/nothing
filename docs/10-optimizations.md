# Performance Optimizations

## 1. Request Coalescing

Batches simultaneous identical requests to prevent thundering herd problem.

### Problem
If 100 users request the same data simultaneously, without coalescing: 100 database calls. With coalescing: 1 database call, 99 wait for result.

### Usage

```typescript
import { coalesceRequests } from "@/services/request-coalescing.service";

// Instead of direct fetch
const data = await expensiveOperation();

// Use coalescing
const data = await coalesceRequests(
  "user:123:preferences",  // unique key
  () => expensiveOperation(), // the actual request
  { ttlMs: 5000 }  // auto-cleanup after 5s
);
```

### Best for
- Expensive database queries (aggregation, joins)
- External API calls with rate limits
- Data that rarely changes but is requested often

### Monitoring
```typescript
import { getCoalescingStats } from "@/services/request-coalescing.service";

const stats = getCoalescingStats();
// { pendingCount: 3, pendingKeys: ["user:123:prefs", "search:query", ...] }
```

---

## 2. Image Compression

Compresses images before S3 upload to reduce storage and bandwidth.

### Usage

```typescript
import { compressImage, isImageBuffer } from "@/services/image-compression.service";

// Compress buffer
const result = await compressImage(imageBuffer, {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 80,
  format: "webp",  // Best compression/quality ratio
});

// Result includes:
console.log(result.compressionRatio);  // 0.7 = 70% reduction
console.log(result.size);              // Compressed bytes
console.log(result.buffer);            // Compressed data
```

### Client-Side Integration

Since uploads go directly to S3 via presigned URLs, compress in browser:

```typescript
import { compressImage } from "@/services/image-compression.service";

// In your upload handler
async function handleUpload(file: File) {
  // Only compress images
  if (file.type.startsWith("image/")) {
    const buffer = await file.arrayBuffer();
    const compressed = await compressImage(Buffer.from(buffer));

    // Upload compressed version
    await uploadToS3(compressed.buffer, compressed.format);
  } else {
    // Non-image, upload as-is
    await uploadToS3(file);
  }
}
```

### Responsive Images

```typescript
import { generateResponsiveSizes } from "@/services/image-compression.service";

const sizes = await generateResponsiveSizes(imageBuffer, [
  { name: "thumbnail", maxWidth: 200 },
  { name: "medium", maxWidth: 800 },
  { name: "large", maxWidth: 1920 },
]);
```

---

## 3. Database Connection Pool

Configure connection pooling for your deployment size.

### Configuration via DATABASE_URL

```
postgresql://user:pass@host:5432/db?connection_limit=N&pool_timeout=M&connection_timeout=C
```

### Recommended Settings

| Deployment | connection_limit | pool_timeout | connection_timeout |
|------------|-----------------|--------------|-------------------|
| Development | 5 | 10 | 30 |
| Small (2GB RAM) | 10 | 10 | 30 |
| Medium (4GB RAM) | 20 | 15 | 30 |
| Large (8GB+ RAM) | 50 | 20 | 30 |
| Kubernetes | 5 | 10 | 15 |

### Why These Settings?

- **connection_limit**: Max connections per Prisma instance. Too high = OOM. Too low = throttling.
- **pool_timeout**: Seconds to wait for available connection. Prevents indefinite waits.
- **connection_timeout**: Max time to establish connection. Fail fast if DB is down.

### Kubernetes Sizing

With auto-scaling, each pod needs conservative limits:

```
# Small cluster (2-5 pods)
connection_limit=10

# Medium cluster (5-20 pods)
connection_limit=5

# Large cluster (20+ pods)
connection_limit=2
```

### Monitoring

```typescript
import { parsePoolConfig } from "@/services/database-pool.service";

const config = parsePoolConfig();
// { connectionLimit: 10, poolTimeout: 15, ... }
```

---

## Circuit Breaker (Already Implemented)

Protects against cascading failures when external services go down.

### Services Protected
- `openai` - AI API (3 failures → open, 15s recovery)
- `polar` - Payments (5 failures → open, 30s recovery)
- `searxng` - Web Search (5 failures → open, 30s recovery)

### Monitoring

```bash
GET /api/status/circuit-breakers
```

```json
{
  "circuitBreakers": {
    "openai": { "state": "CLOSED", "failures": 0 },
    "searxng": { "state": "OPEN", "nextAttempt": "2024-01-01T00:00:30Z" }
  }
}
```

---

## Caching Summary

| Data | TTL | Key Pattern |
|------|-----|-------------|
| Credits | 5 min | `user:{id}:credits` |
| User limits | 5 min | `user:{id}:limits` |
| Preferences | 30 min | `user:{id}:preferences` |
| Settings | 30 min | `user:{id}:settings` |
| Memories | 5 min | `user:{id}:memories` |
| Notifications | 30 sec | `user:{id}:notifications` |
| Projects | 5 min | `user:{id}:projects` |
| Chat list | 5 min | `chats:user:{id}` |
| Search results | 1 hour | `search:{query_hash}` |
| Chat summaries | 7 days | `chat:{id}:summary` |

---

## Quick Wins Checklist

- [x] Redis caching (credits, preferences, settings, memories, notifications, projects, chats, search)
- [x] Circuit breaker (Groq, Polar, SearxNG)
- [x] Request coalescing (implemented, ready to use)
- [x] Image compression (service ready, client-side integration needed)
- [x] Connection pool tuning (documented, configure via DATABASE_URL)

---

## BullMQ Queue (Already Implemented)

Reliable async job processing with retry logic.

### Queues

| Queue | Purpose | Concurrency | Retry |
|-------|---------|-------------|-------|
| `webhook` | Polar webhooks | 5 | 5x exponential backoff |
| `summarization` | Chat context summarization | 2 | 3x exponential backoff |
| `file-processing` | Post-upload file processing | 3 | 3x exponential backoff |
| `email` | Transactional emails | 5 | 3x exponential backoff |

### Starting Workers

```bash
# Run workers in separate process
bun run services/workers.ts
```

Or in same process (development only):
```typescript
import { startAllWorkers } from "@/services/workers";
startAllWorkers();
```

### Monitoring

```bash
GET /api/status
```

```json
{
  "queues": {
    "webhook": { "waiting": 0, "active": 1, "completed": 45, "failed": 2 },
    "summarization": { "waiting": 3, "active": 1, "completed": 12, "failed": 0 }
  }
}
```

### Job Idempotency

Webhooks use idempotency keys to prevent duplicate processing:
```typescript
const idempotencyKey = `polar:${eventType}:${eventId}`;
await queueWebhook(eventType, payload, idempotencyKey);
```

### Email Templates

Available templates: `welcome`, `credits-added`, `subscription-activated`, `subscription-canceled`, `credits-low`, `password-reset`

```typescript
import { queueEmail } from "@/services/queue.service";

await queueEmail("user@example.com", "welcome", {
  name: "John",
});
```
