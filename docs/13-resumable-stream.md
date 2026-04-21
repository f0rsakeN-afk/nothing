# Resumable Streaming

## Overview

This document describes the resumable streaming implementation for AI chat responses. It enables:
- **Resume**: Replay missed chunks if the client disconnects mid-stream
- **Stop**: Signal any running stream to abort across all processes

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

## How It Works

### 1. Starting a Stream

When a user sends a message:

```typescript
// Frontend calls API
POST /api/chat
{ chatId, messages, mode }

// Backend:
// 1. Checks if existing stream for this chat - stops it if so
// 2. Marks old stream as "superseded" (won't save on complete)
// 3. Deducts credits
// 4. Starts new resumable stream
// 5. Returns SSE stream with X-Stream-ID header
```

### 2. Resuming a Stream

If the client disconnects:

```typescript
// Frontend retries with resume flag
POST /api/chat
{ chatId, messages, mode, resume: true }

// Backend checks Redis for existing stream:
// - If found: replays chunks + continues new stream
// - If not found: starts fresh
```

### 3. Stopping a Stream

When user clicks stop:

```typescript
// Frontend
DELETE /api/chat
{ chatId }

// Backend broadcasts stop via Redis pub/sub
// All processes running this stream abort
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
3. Redis returns stored chunks
4. Chunks are replayed to client
5. New chunks continue to be generated
6. `onResume` callback fires to notify UI

### 3. Stop Button (User Cancellation)

**Problem**: User clicks stop mid-stream.

**Solution**:
1. Frontend calls `stopStream(chatId)`
2. Backend calls `stopResumableStream(chatId)`
3. Redis pub/sub broadcasts abort signal
4. All processes abort their local streams
5. Stream's `onComplete` is NOT called (stream ended via abort)
6. Partial content is NOT saved (no save on error/abort path)

### 4. Concurrent Tabs/Requests

**Problem**: User has multiple tabs sending messages to same chat.

**Solution**:
- `isStreamActive(chatId)` check prevents duplicate streams
- New message supersedes old stream
- Each stream has unique version key for superseded tracking

### 5. Serverless Cold Start

**Problem**: New serverless instance starts, old state is lost.

**Solution**:
- Redis clients are singletons (per warm container)
- `resumableStreamInstances` Map is per-container
- Resume works because chunks are in Redis (not memory)
- Active stream detection may miss streams from other containers
- But superseded tracking ensures no duplicate saves

### 6. Redis Connection Failure

**Problem**: Redis goes down during streaming.

**Solution**:
- Library handles reconnection with retries
- If resume fails, starts fresh stream
- No orphaned chunks (cleanup via TTL)

### 7. Credit Refund Edge Cases

**Problem**: Stream errors or user stops - should we refund?

**Current Behavior**:
- Stream creation failure: Refund credits
- User stop: Do NOT refund (AI still processed, content may exist)
- Stream error: Do NOT refund (complex to track partial usage)
- Superseded stream: Do NOT refund old credits, deduct new

### 8. Stream ID Conflicts

**Problem**: Stream IDs could collide across users.

**Solution**:
- Stream ID format: `chat:{chatId}:stream`
- Chat ID is unique per user
- Users can only access their own chats (verified via auth)

## Implementation Details

### Backend Service

`/services/resumable-stream.service.ts`:

```typescript
// Start new stream (stops existing if active)
startResumableStream(chatId, messages, onChunk, onComplete, onError)

// Resume from Redis if exists
resumeResumableStream(chatId, onChunk, onComplete, onError)

// Broadcast stop to all processes
stopResumableStream(chatId)

// Check if stream is active
isStreamActive(chatId): boolean
```

### API Routes

`/app/api/chat/route.ts`:

- **POST**: Creates new stream or resumes existing (with `resume: true`)
  - Checks `isStreamActive` and stops existing
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
ai-resumable-stream:stream:chat:{chatId}:stream  - Chunk data (TTL: 5 min)
ai-resumable-stream:stop:chat:{chatId}:stream    - Stop signal channel
superseded:{chatId}:{timestamp}                  - Superseded stream tracking
```

## Redis TTL

- **Stream chunks**: 5 minutes (streamLifetime)
- **All keys**: Managed by ai-resumable-stream library

## Performance Considerations

1. **Connection Pooling**: Redis clients are singletons, reused across requests
2. **Memory**: `resumableStreamInstances` Map holds one instance per chat
3. **Chunk Size**: Each chunk stored separately in Redis (network overhead)
4. **Resume Latency**: Replaying chunks adds latency on resume

## Limitations

1. **Redis Required**: Cannot function without Redis
2. **5-minute Resume Window**: Chunks expire after 5 minutes
3. **Chunk Accumulation**: Long responses accumulate many Redis keys
4. **Serverless State**: Active stream detection may miss cross-container streams
5. **Credit Policy**: Partial refunds not implemented (all-or-nothing)

## Error Handling Summary

| Scenario | Credits Refunded? | Content Saved? |
|----------|-----------------|---------------|
| Insufficient credits | N/A | No |
| User stops stream | No | No |
| Network error (retry succeeds) | N/A | Yes |
| Network error (retry fails) | No | No |
| AI error | No | No |
| User sends new message | No (new deducted) | No (superseded) |
| Resume successful | N/A | Yes |

## Future Improvements

1. **Partial Refunds**: Track partial content, refund proportionally
2. **Longer TTL**: Configurable TTL for very long streams
3. **Chunk Compression**: Reduce Redis memory for long responses
4. **Cross-Container Active Detection**: Use Redis to track active streams
5. **Resume Queue**: If resume fails, queue for retry
