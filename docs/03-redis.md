# Redis Configuration & Usage

## Overview

Redis is used for **caching**, **rate limiting**, and **Pub/Sub messaging**. The project uses the `ioredis` library with two separate client instances to handle different operation types.

## Architecture

### Dual Client Pattern

This project uses **two separate Redis clients** to avoid connection mode conflicts:

```typescript
// Client for regular operations (get, set, incr, publish, etc.)
const redis = globalForRedis.redis;

// Separate client for Pub/Sub subscriber ONLY (subscribe, unsubscribe)
const redisSub = globalForRedis.redisSub;
```

**Why two clients?** Redis connections can only be in "subscriber" mode OR "regular" mode - not both. Using the same connection for both causes errors like "Connection in subscriber mode".

### Client Creation

```typescript
function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("REDIS_URL not set, using localhost");
    return new Redis({
      host: "localhost",
      port: 6379,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}
```

### Environment Variable

```env
REDIS_URL=redis://localhost:6380
```

## Key Patterns

All Redis keys are centralized in `lib/redis.ts`:

```typescript
export const KEYS = {
  // Chat messages cache (list)
  chatMessages: (chatId) => `chat:${chatId}:messages`,

  // Chat metadata cache (hash)
  chatMeta: (chatId) => `chat:${chatId}:meta`,

  // User chat list cache
  userChats: (userId) => `chats:user:${userId}`,
  userChatsArchived: (userId) => `chats:user:${userId}:archived`,

  // Rate limiting
  userRateLimit: (userId) => `user:${userId}:rate_limit`,

  // User cache
  userCache: (stackId) => `user:cache:${stackId}`,

  // Brute force protection
  bruteForce: (identifier) => `bruteforce:${identifier}`,

  // Project context
  projectContext: (projectId) => `project:${projectId}:context`,

  // Search results
  searchResults: (query) => `search:${Buffer.from(query).toString("base64").slice(0, 32)}`,

  // Image cache
  imageCache: (url) => `img:${Buffer.from(url).toString("base64").slice(0, 64)}`,
} as const;
```

## TTL Values

All TTLs are defined centrally with comments explaining their purpose:

```typescript
export const TTL = {
  chatMessages: 60 * 60,           // 1 hour - transient chat messages
  chatMeta: 7 * 24 * 60 * 60,       // 7 days - chat metadata
  userChats: 5 * 60,               // 5 minutes - user chat list cache
  rateLimit: 60,                   // 1 minute - rate limit counters
  chatCreationLimit: 60 * 60,       // 1 hour - chat creation rate limit
  imageCache: 7 * 24 * 60 * 60,     // 7 days - image cache
  userCache: 5 * 60,               // 5 minutes - user cache
  statusHistory: 31 * 24 * 60 * 60, // 31 days - status check history
  bruteForce: 5 * 60,              // 5 minutes - brute force tracking
  userPreferences: 30 * 60,       // 30 minutes - user preferences
  userLimits: 5 * 60,              // 5 minutes - user limits cache
  userSettings: 30 * 60,           // 30 minutes - user settings
  searchResults: 60 * 60,         // 1 hour - web search cache
} as const;
```

## Pub/Sub Channels

Real-time updates use Redis Pub/Sub:

```typescript
export const CHANNELS = {
  sidebar: (userId) => `sidebar:${userId}`,
  chat: (chatId) => `chat:${chatId}`,
  status: () => "status:updates",
} as const;
```

### Publishing Messages

```typescript
import redis, { CHANNELS } from "@/lib/redis";

// Publish to a channel
await redis.publish(
  CHANNELS.sidebar(userId),
  JSON.stringify({
    type: "chat:archived",
    chatId: chat.id,
    title: chat.title,
  })
);
```

### Subscribing (in API routes or background jobs)

```typescript
import { redisPubSub } from "@/lib/redis";

// Subscribe to a channel
redisPubSub.subscribe(CHANNELS.sidebar(userId), (err) => {
  if (err) console.error("Subscribe error:", err);
});

// Handle messages
redisPubSub.on("message", (channel, message) => {
  console.log("Received:", channel, message);
});
```

## Common Operations

### Get and Set with TTL

```typescript
// Set with expiration
await redis.setex(key, TTL.userCache, JSON.stringify(data));

// Get and parse
const cached = await redis.get(key);
if (cached) {
  const data = JSON.parse(cached);
}
```

### List Operations (Chat Messages)

```typescript
// Push to list (newest first)
await redis.lpush(KEYS.chatMessages(chatId), JSON.stringify(message));

// Keep only last 100 messages
await redis.ltrim(KEYS.chatMessages(chatId), 0, 99);

// Set TTL
await redis.expire(KEYS.chatMessages(chatId), TTL.chatMessages);

// Get all messages
const messages = await redis.lrange(KEYS.chatMessages(chatId), 0, -1);
```

### Hash Operations (Chat Meta)

```typescript
// Set multiple fields
await redis.hset(KEYS.chatMeta(chatId), {
  title: chat.title,
  createdAt: chat.createdAt.toISOString(),
  projectId: chat.projectId || "",
});

// Get all fields
const meta = await redis.hgetall(KEYS.chatMeta(chatId));

// Update single field
await redis.hset(KEYS.chatMeta(chatId), "title", newTitle);

// Delete
await redis.del(KEYS.chatMeta(chatId));
```

### Increment for Rate Limiting

```typescript
const current = await redis.incr(key);

if (current === 1) {
  // First request - set expiry
  await redis.expire(key, 60); // 1 minute window
}

// Check current count
const ttl = await redis.ttl(key);
```

### Pipeline for Batch Operations

```typescript
const pipeline = redis.pipeline();

messages.forEach((msg) => {
  pipeline.rpush(KEYS.chatMessages(chatId), JSON.stringify(msg));
});

pipeline.expire(KEYS.chatMessages(chatId), TTL.chatMessages);
await pipeline.exec();
```

## Error Handling

Redis operations are wrapped in try-catch with graceful fallbacks:

```typescript
// Try cache first
try {
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
} catch {
  // Redis not available, continue to database
}

// Cache failures are non-critical
try {
  await redis.setex(cacheKey, TTL.userCache, JSON.stringify(data));
} catch {
  // Cache failed - not critical, continue
}
```

## Connection Management

- **Global singleton**: In development, clients are stored on `global` to survive hot reloads
- **Lazy connect**: Clients connect on first use, not at import time
- **Retry strategy**: Exponential backoff up to 2 seconds

```typescript
retryStrategy(times) {
  const delay = Math.min(times * 50, 2000);
  return delay;
}
```

## Common Patterns

### Cache-Aside (Read-Through)

```typescript
async function getUserChats(userId: string) {
  const cacheKey = KEYS.userChats(userId);

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* Redis down */ }

  // Fallback to database
  const chats = await prisma.chat.findMany({ ... });

  // Cache result
  try {
    await redis.setex(cacheKey, TTL.userChats, JSON.stringify(chats));
  } catch { /* Cache failed */ }

  return chats;
}
```

### Write-Through (On Update)

```typescript
async function updateChat(chatId: string, data: { title: string }) {
  // Update database
  const chat = await prisma.chat.update({ ... });

  // Update cache
  await redis.hset(KEYS.chatMeta(chatId), "title", data.title);

  // Invalidate list cache
  await redis.del(KEYS.userChats(userId));

  return chat;
}
```

### Cache Invalidation

When data changes, delete the cache key so next read fetches fresh data:

```typescript
await redis.del(KEYS.userChats(userId));
await redis.del(KEYS.userChatsArchived(userId));
```

## When NOT to Cache

- **Real-time sensitive data**: Don't cache data that changes on every request
- **Large data**: Avoid caching large objects that consume too much memory
- **Highly dynamic data**: Data that changes frequently should have short TTLs

## Monitoring

Redis connection issues will show warnings in logs:

```typescript
if (!redisUrl) {
  console.warn("REDIS_URL not set, using localhost");
}
```

Errors are logged but don't crash the application - caching is designed to be non-critical.