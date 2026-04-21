# Resumable Streaming

## Overview

This document describes the resumable streaming implementation for AI chat responses. It enables:
- **Resume**: Replay missed chunks if the client disconnects mid-stream
- **Stop**: Signal any running stream to abort across all processes
- **Partial Refunds**: Proportional credit refunds when streams are stopped early
- **Cross-Container Detection**: Redis-backed active stream tracking across multiple containers
- **Resume Queue**: Auto-queue failed resume attempts for async retry

## Architecture

```
┌─────────┐      ┌──────────────┐      ┌─────────────────┐
│ Client  │──────│  Next.js API  │──────│  OpenAI Models   │
└─────────┘      └───────┬──────┘      └─────────────────┘
                         │
                    ┌────▼────┐
                    │  Redis  │
                    │ (chunks │
                    │ stored) │
                    └─────────┘
```

### Key Components

1. **Redis Persistence**: Chunks are stored in Redis as they arrive, enabling resume on reconnect
2. **Pub/Sub Stop Signal**: Redis pub/sub broadcasts stop signals across all Next.js processes
3. **Client AbortController**: Local abort signal for cancellation
4. **Cross-Container Tracking**: Redis Set tracks active streams across all containers
5. **Resume Queue**: BullMQ queue handles async resume retry attempts

## Features

### 1. Partial Refunds

When a stream is stopped early, the system tracks content length and can calculate proportional refunds.

**Implementation**:
- `contentLengthRef` tracks bytes streamed in real-time
- On `stopResumableStream`: stores partial data in Redis with key `chat:{chatId}:partial`
- On successful completion: clears partial data
- `refundProportional()` calculates `(1 - streamedBytes/totalBytes) * cost`

**Redis Key**: `chat:{chatId}:partial`
```json
{
  "contentLength": 1234,
  "cost": 1,
  "timestamp": 1713657600000
}
```

**TTL**: 24 hours

### 2. Longer TTL

Configurable TTL for very long streams (up to 24 hours).

**Configuration** (`lib/config.ts`):
```typescript
export const resumableConfig = {
  streamTTL: parseIntOrDefault(process.env.RESUMABLE_STREAM_TTL_SECONDS, 3600),
  maxStreamTTL: 86400, // 24 hours absolute max
  get effectiveStreamTTL() {
    return Math.min(this.streamTTL, this.maxStreamTTL);
  },
};
```

**Environment Variable**: `RESUMABLE_STREAM_TTL_SECONDS` (default: 3600, max: 86400)

### 3. Chunk Compression

Long responses are compressed using GZIP to reduce Redis memory usage.

**Implementation**:
- Uses built-in Web Streams API `CompressionStream`/`DecompressionStream`
- Helper functions: `compressChunk()` and `decompressChunk()`
- Chunks stored with `{ compressed: true, data: base64 }` structure

**Compression Format**: GZIP via CompressionStream API

### 4. Cross-Container Active Detection

Active streams are tracked in Redis Set for multi-container deployments.

**Implementation** (`services/resumable-pubsub.service.ts`):
- `trackActiveStream(streamId)`: `SADD active:streams {streamId}`
- `untrackActiveStream(streamId)`: `SREM active:streams {streamId}`
- `getCrossContainerActiveStreams()`: `SMEMBERS active:streams`

**Redis Key**: `active:streams` (Set of active stream IDs)

**Check on Start**: Before starting a stream, checks if it's active on any container

### 5. Resume Queue

Failed resume attempts are queued for async retry instead of failing immediately.

**Implementation** (`services/resume-queue.service.ts`):
- Queue name: `resume`
- `queueResumeAttempt(chatId, userId, reason)`: Adds job to queue
- `createResumeWorker()`: Processes resume attempts
- On stream expiration during resume: auto-queues for retry

**Resume Flow**:
1. Resume fails with "not found" or "expired"
2. `queueResumeAttempt()` called with reason
3. Worker processes job, stores `resume:{chatId}:ready` signal
4. Publishes `chat:resume:ready` event via pub/sub
5. Client receives event and retries resume

**Redis Key**: `resume:{chatId}:ready` (TTL: 5 minutes)

**Queue Configuration**:
- Max retries: 3
- Backoff: Exponential (5s initial)
- Concurrency: 3

## How It Works

### 1. Starting a Stream

When a user sends a message:

```typescript
// Frontend calls API
POST /api/chat
{ chatId, messages, mode }

// Backend:
// 1. Checks if existing stream for this chat (cross-container) - stops it if so
// 2. Marks old stream as "superseded" (won't save on complete)
// 3. Tracks active stream in Redis Set
// 4. Deducts credits
// 5. Starts new resumable stream
// 6. Returns SSE stream with X-Stream-ID header
```

### 2. Resuming a Stream

If the client disconnects:

```typescript
// Frontend retries with resume flag
POST /api/chat
{ chatId, messages, mode, resume: true }

// Backend checks Redis for existing stream:
// - If found: replays chunks + continues new stream
// - If not found: checks resume queue, queues if needed
// - If queue has ready signal: returns resume-ready event
```

### 3. Stopping a Stream

When user clicks stop:

```typescript
// Frontend
DELETE /api/chat
{ chatId }

// Backend:
// 1. Stores partial content length for refund calculation
// 2. Broadcasts stop via Redis pub/sub
// 3. All processes running this stream abort
// 4. Removes from active streams Set
```

## Edge Cases Handled

### 1. User Sends New Message During Active Stream

**Problem**: User is mid-stream, sends another message.

**Solution**:
1. New message arrives at API
2. Old stream is marked as "superseded" via `supersededStreams` Set
3. Old stream's `onComplete` checks superseded status - does NOT save
4. Old stream is stopped via `stopResumableStream()`
5. New stream starts fresh
6. Credits are deducted for new stream

**Code**:
```typescript
if (isStreamActive(chatId)) {
  supersededStreams.add(supersededKey);
  await stopResumableStream(chatId);
}
```

### 2. Resume After Network Interruption

**Problem**: Client disconnects, reconnects, wants to resume.

**Solution**:
1. Client retries with `resume: true`
2. Backend calls `resumeResumableStream()`
3. Redis returns stored chunks (decompresses if needed)
4. Chunks are replayed to client
5. New chunks continue to be generated
6. `onResume` callback fires to notify UI

### 3. Stop Button (User Cancellation)

**Problem**: User clicks stop mid-stream.

**Solution**:
1. Frontend calls `stopStream(chatId)`
2. Backend calls `stopResumableStream(chatId)`
3. Stores partial content length for potential refund
4. Redis pub/sub broadcasts abort signal
5. All processes abort their local streams
6. Stream's `onComplete` is NOT called (stream ended via abort)
7. Partial content is NOT saved (no save on error/abort path)

### 4. Concurrent Tabs/Requests

**Problem**: User has multiple tabs sending messages to same chat.

**Solution**:
- `isStreamActive(chatId)` check prevents duplicate streams
- Cross-container detection via Redis Set
- New message supersedes old stream
- Each stream has unique version key for superseded tracking

### 5. Serverless Cold Start

**Problem**: New serverless instance starts, old state is lost.

**Solution**:
- Redis clients are singletons (per warm container)
- `resumableStreamInstances` Map is per-container
- Resume works because chunks are in Redis (not memory)
- Active stream detection works across containers via Redis Set

### 6. Redis Connection Failure

**Problem**: Redis goes down during streaming.

**Solution**:
- Library handles reconnection with retries
- If resume fails, starts fresh stream
- No orphaned chunks (cleanup via TTL)

### 7. Cross-Container Stream Conflict

**Problem**: Stream started on container A, user request hits container B.

**Solution**:
- Before starting, checks `active:streams` Set in Redis
- If stream ID exists in Set, refuses to start (prevents duplicate)
- Cleanup removes from Set on stop/complete

### 8. Resume Queue Retry

**Problem**: Resume fails because stream expired.

**Solution**:
1. Resume attempt detects "not found" or "expired" error
2. Auto-queues resume attempt via BullMQ
3. Worker processes job asynchronously
4. Stores `resume:ready` signal in Redis
5. Publishes `chat:resume:ready` event to client
6. Client retries resume when it receives event

## Implementation Details

### Backend Services

**`/services/resumable-stream.service.ts`**:
```typescript
// Start new stream (stops existing if active)
startResumableStream(chatId, messages, options, onChunk, onComplete, onError)

// Resume from Redis if exists
resumeResumableStream(chatId, onChunk, onComplete, onError)

// Broadcast stop to all processes
stopResumableStream(chatId)

// Check if stream is active
isStreamActive(chatId): boolean

// Get all active streams across containers
getAllActiveStreamsCrossContainer(): Promise<string[]>
```

**`/services/resumable-pubsub.service.ts`** (NEW):
```typescript
trackActiveStream(streamId): Promise<void>
untrackActiveStream(streamId): Promise<void>
getCrossContainerActiveStreams(): Promise<string[]>
isStreamActiveCrossContainer(streamId): Promise<boolean>
```

**`/services/resume-queue.service.ts`** (NEW):
```typescript
queueResumeAttempt(chatId, userId, reason): Promise<void>
createResumeWorker(): void
isResumeReady(chatId): Promise<boolean>
clearResumeReady(chatId): Promise<void>
```

**`/services/credit.service.ts`** - Added:
```typescript
refundProportional(userId, streamedBytes, totalBytes, operation): Promise<CreditResult>
```

### API Routes

`/app/api/chat/route.ts`:

- **POST**: Creates new stream or resumes existing (with `resume: true`)
  - Checks `isStreamActive` and cross-container detection
  - Tracks superseded streams via Set
  - Returns `X-Stream-ID` header
- **DELETE**: Stops a running stream

### Frontend Service

`/services/chat.service.ts`:

```typescript
// Stream with automatic retry on failure
streamChat(chatId, messages, callbacks, signal, mode, {
  resume: true,
  maxRetries: 2
})

// Callbacks with isResume flag
onChunk: (content, isResume) => void
onComplete: (content, isResume) => void
onResume: () => void  // Called when resume succeeded
```

### Hook Integration

`/hooks/use-chat-messages.ts`:

- `sendUserMessage`: Calls `streamChat` with retry enabled
- `abortCurrentMessage`: Calls local abort + `stopStream(chatId)`

## Redis Keys

```
ai-resumable-stream:stream:chat:{chatId}:stream  - Chunk data (TTL: stream TTL)
ai-resumable-stream:stop:chat:{chatId}:stream   - Stop signal channel
superseded:{chatId}:{timestamp}                 - Superseded stream tracking
chat:{chatId}:partial                           - Partial refund data (TTL: 24h)
active:streams                                  - Set of active stream IDs
resume:{chatId}:ready                           - Resume ready signal (TTL: 5m)
chat:{chatId}:stream:version                    - Stream version for queue deduplication
```

## Redis TTL

| Key | Default TTL | Configurable |
|-----|-------------|--------------|
| Stream chunks | 3600s (1h) | Via `RESUMABLE_STREAM_TTL_SECONDS` (max 24h) |
| Partial data | 86400s (24h) | Not configurable |
| Active streams | 60s | Refreshed on each operation |
| Resume ready | 300s (5m) | Not configurable |
| Stream version | 86400s (24h) | Not configurable |

## Performance Considerations

1. **Connection Pooling**: Redis clients are singletons, reused across requests
2. **Memory**: `resumableStreamInstances` Map holds one instance per chat
3. **Chunk Size**: Each chunk stored separately in Redis (network overhead)
4. **Resume Latency**: Replaying chunks adds latency on resume
5. **Compression Overhead**: GZIP compression adds CPU overhead for large responses

## Credit Refund Summary

| Scenario | Credits Refunded? | How |
|----------|-----------------|-----|
| User stops stream | Proportional | Based on `chat:{chatId}:partial` data |
| Stream error | No | AI still processed |
| Resume successful | No | Content was generated |
| Resume queue retry | No | Original stream still counts |
| Superseded stream | No | New stream deducted instead |

## Error Handling Summary

| Scenario | Content Saved? | Refund? |
|----------|---------------|---------|
| Insufficient credits | No | N/A |
| User stops stream | No | Proportional |
| Network error (retry succeeds) | Yes | No |
| Network error (retry fails) | No | No |
| AI error | No | No |
| User sends new message | No (superseded) | No (new deducted) |
| Resume successful | Yes | No |
| Resume queue retry | Depends | No |
| Cross-container conflict | No | No |
