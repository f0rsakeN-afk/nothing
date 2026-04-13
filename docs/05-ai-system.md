# AI System

## Overview

The AI system uses **Groq** for language model inference with **hierarchical context management** to handle long conversations efficiently.

## Configuration

**File:** `lib/config.ts`

```typescript
export const aiConfig = {
  model: process.env.AI_MODEL || "llama-3.1-8b-instant",
  maxTokens: parseIntOrDefault(process.env.AI_MAX_TOKENS, 1024),
  temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  maxContextTokens: 2000,
  maxSystemPromptTokens: 1500,
  maxRecentMessages: 20,
};
```

## Context Management Architecture

For production-grade handling of long conversations, we use a **hierarchical context system**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Context Retrieval Pipeline                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 1: Recent Messages (Redis + DB)                          │
│  └── Last 20 messages, full fidelity                            │
│                                                                  │
│  LAYER 2: Conversation Summary (PostgreSQL + Redis Cache)        │
│  └── LLM-generated structured summary                           │
│      - What was discussed                                       │
│      - Key decisions made                                       │
│      - Important facts to preserve                              │
│                                                                  │
│  LAYER 3: Key Facts Extraction (in summary)                      │
│  └── Code snippets, API endpoints, decisions                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### When Summary is Generated

- After every 50 messages in a chat
- When token budget would be exceeded
- Async (fire and forget) - user never waits

### Summary Storage

```typescript
// ChatSummary model in database
model ChatSummary {
  id        String   @id @default(cuid())
  chatId    String   @unique

  // LLM-generated summary
  summary   String   @db.Text

  // Structured data for precise retrieval
  topics    String[] // ["authentication", "payments"]
  keyFacts  String[] // ["import prisma from '@/lib/prisma'"]

  // Message range this summary covers
  startMessageId String
  endMessageId   String
  messageCount   Int

  // Metadata
  tokenCount    Int
  createdAt      DateTime
}
```

### Redis Caching

```
chat:{chatId}:summary     → Cached summary JSON (7 day TTL)
chat:{chatId}:summarizing → Lock to prevent duplicate summarization
```

## Smart Context Retrieval

**File:** `services/summarize.service.ts`

The `getChatContext()` function handles retrieval:

```typescript
export async function getChatContext(
  chatId: string,
  options: { maxTokens?: number; systemPrompt?: string }
): Promise<{
  messages: Message[];      // Recent messages
  summary?: string;          // LLM summary
  topics?: string[];         // Topics discussed
  keyFacts?: string[];       // Key facts to preserve
  truncated: boolean;        // Was context truncated
}> {
  // 1. Try Redis cache for summary
  // 2. Fallback to PostgreSQL
  // 3. Get recent 20 messages from DB
  // 4. Estimate tokens
  // 5. If over budget, truncate to recent messages only
  // 6. Return summary + recent context
}
```

## Summarization Process

**File:** `services/summarize.service.ts`

```typescript
// Triggered asynchronously after message is saved
async function summarizeChat(chatId: string) {
  // 1. Check if already summarizing (Redis lock)
  // 2. Fetch all messages
  // 3. Call LLM with summarization prompt
  // 4. Parse JSON response with structure:
  //    { summary: string, topics: string[], keyFacts: string[] }
  // 5. Store in PostgreSQL + Redis cache
  // 6. Release lock
}
```

### Summarization Prompt

```
You are a conversation summarizer. Analyze this chat and produce a structured summary.

MESSAGES:
1. [User]: implement authentication
2. [Assistant]: I'll help you set up NextAuth...
...

OUTPUT FORMAT (JSON):
{
  "summary": "2-3 sentence overview",
  "topics": ["main topic 1", "topic 2"],
  "keyFacts": ["specific fact 1", "decision made"]
}
```

## Chat API Flow

**File:** `app/api/chat/route.ts`

### Request Flow

1. **Authenticate** - Validate user token
2. **Rate Limit** - Check chat rate limit
3. **Credit Check** - Verify enough credits (1 per chat)
4. **Build Context** - `getChatContext()` → smart retrieval with summary
5. **Stream Response** - Call Groq with context
6. **Save Response** - Store AI message
7. **Queue Summarization** - Async trigger if threshold reached

### Context Building

```typescript
async function buildMessages(chatId, incomingMessages) {
  // Get smart context (summary + recent messages)
  const { messages, summary, topics, keyFacts, truncated } = await getChatContext(chatId);

  // Build system prompt with all context layers
  let systemPrompt = buildSystemPrompt(promptConfig);

  if (summary) {
    systemPrompt += `\n\nCONVERSATION SUMMARY:\n${summary}`;
  }

  if (topics) {
    systemPrompt += `\n\nTopics: ${topics.join(", ")}`;
  }

  if (keyFacts) {
    systemPrompt += `\n\nKEY FACTS TO PRESERVE:\n${keyFacts.map((f, i) => `${i+1}. ${f}`).join("\n")}`;
  }

  return [
    { role: "system", content: systemPrompt },
    ...messages,
    ...incomingMessages,
  ];
}
```

## Token Budget Allocation

For a 2000 token budget:

```
System prompt (capabilities, rules):     ~500 tokens
Conversation summary:                    ~300 tokens
Topics + Key Facts:                       ~200 tokens
Recent messages (10-15):                  ~800 tokens
Response generation headroom:            ~200 tokens
                                        -----------
Total:                                   ~2000 tokens
```

## Key Fact Patterns

Critical patterns preserved in summaries:

```typescript
const KEY_FACT_PATTERNS = [
  /import\s+[\s\S]*?from/,      // ES6 imports
  /export\s+(default\s+)?[\s\S]*/,  // Exports
  /const\s+\w+\s*=/,            // Variable declarations
  /function\s+\w+/,             // Function declarations
  /class\s+\w+/,                // Class declarations
  /API\s*[=:]/i,                // API configurations
  /endpoint\s*[=:]/i,           // Endpoint definitions
  /TODO\s*:/i,                  // TODOs
  /FIXME\s*:/i,                 // FIXMEs
];
```

## Environment Variables

```env
GROQ_API_KEY=gsk_...
AI_MODEL=llama-3.1-8b-instant
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.7
MAX_CONTEXT_TOKENS=2000
```

## Why Not Vector Search?

Vector embeddings sound powerful but are **overkill** for chat context because:

1. **Chat is sequential** - semantic similarity is less useful than recency
2. **Storage overhead** - 1536 dimensions per message is huge
3. **Latency** - embedding generation adds delay
4. **Complexity** - consistency between sessions is hard

What we do instead:
- **Summary-based retrieval** (what ChatGPT/Claude use)
- **Key fact extraction** (structured, not semantic)
- **Topic tracking** (easy categorization)

This gives 95% of the benefit at 10% of the complexity.

## Redis Key Patterns

```typescript
chat:{chatId}:messages  → List of recent messages (1hr TTL)
chat:{chatId}:summary   → Cached summary JSON (7 day TTL)
chat:{chatId}:summarizing → Lock key (5 min TTL)
```

## TTL Values

```typescript
TTL.chatMessages  = 3600        // 1 hour
TTL.chatSummary   = 604800      // 7 days
TTL.summarizing   = 300         // 5 minutes
```

## Migration from Simple Context

Old approach:
- All messages → buildChatContext() → raw truncation
- Summary was rule-based ("Topics: X | Y | Z")
- No persistent storage

New approach:
- Summary stored in DB (reused, not regenerated)
- LLM generates quality summaries
- Incremental summaries (appends, not replaces)
- Structured extraction (topics, keyFacts arrays)