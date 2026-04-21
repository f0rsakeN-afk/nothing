# AI System

## Overview

The AI system uses **OpenAI** models via `@ai-sdk/openai` with a custom provider (`eryxProvider`) that maps logical model names to actual OpenAI deployments. The system includes **hierarchical context management** for handling long conversations efficiently.

## Configuration

**File:** `lib/config.ts`

```typescript
export const aiConfig = {
  // Model settings - logical names mapped via eryxProvider
  model: process.env.AI_MODEL || "eryx-fast",
  modelWithTools: process.env.AI_MODEL_WITH_TOOLS || "eryx-fast",
  maxTokens: parseIntOrDefault(process.env.AI_MAX_TOKENS, 1024),
  temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),

  // Context/token limits
  maxContextTokens: parseIntOrDefault(process.env.MAX_CONTEXT_TOKENS, 2000),
  maxSystemPromptTokens: parseIntOrDefault(process.env.MAX_SYSTEM_PROMPT_TOKENS, 1500),
  maxRecentMessages: parseIntOrDefault(process.env.MAX_RECENT_MESSAGES, 20),
  maxContextTokensFallback: parseIntOrDefault(process.env.MAX_CONTEXT_TOKENS_FALLBACK, 4000),
  minRecentTokens: parseIntOrDefault(process.env.MIN_RECENT_TOKENS, 1500),
};
```

## Model Provider

**File:** `lib/ai/providers.ts`

The `eryxProvider` custom provider wraps OpenAI and provides multiple model options:

```typescript
export const eryxProvider = customProvider({
  languageModels: {
    'eryx-fast': openai('gpt-4.1-mini'),
    'eryx-nano': openai('gpt-4.1-nano'),
    'eryx-standard': openai('gpt-4.1'),
    'eryx-plus': openai('gpt-4o-mini'),
    'eryx-pro': openai('gpt-4o'),
    'eryx-ultra': openai('gpt-5.1-mini'),
    'eryx-max': openai('gpt-5.1'),
    'eryx-next': openai('gpt-5.2-mini'),
    'eryx-prime': openai('gpt-5.2'),
    'eryx-flash': openai('gpt-5.4-mini'),
    'eryx-reason': openai('gpt-5.4'),
    'eryx-mini-o3': openai('o3-mini'),
    'eryx-mini-o4': openai('o4-mini'),
  },
});
```

### Available Models

| Logical Name | OpenAI Model | Use Case |
|--------------|--------------|----------|
| `eryx-fast` | gpt-4.1-mini | Fast, low-cost general use |
| `eryx-nano` | gpt-4.1-nano | Minimal footprint |
| `eryx-standard` | gpt-4.1 | Standard benchmark |
| `eryx-plus` | gpt-4o-mini | Balanced speed/intelligence |
| `eryx-pro` | gpt-4o | High intelligence |
| `eryx-ultra` | gpt-5.1-mini | Next-gen mini |
| `eryx-max` | gpt-5.1 | Maximum capability |
| `eryx-next` | gpt-5.2-mini | Future-proof mini |
| `eryx-prime` | gpt-5.2 | Future flagship |
| `eryx-flash` | gpt-5.4-mini | Speed optimized |
| `eryx-reason` | gpt-5.4 | Reasoning optimized |
| `eryx-mini-o3` | o3-mini | O-series mini |
| `eryx-mini-o4` | o4-mini | O-series latest mini |

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

- After every 50 messages in a chat (configurable)
- When token budget would be exceeded
- Async (fire and forget) - user never waits

### RAG (Retrieval-Augmented Generation)

The system also uses vector similarity search for context retrieval:

**File:** `services/rag.service.ts`

- Embeds user queries and file content using OpenAI embeddings
- Performs similarity search against file chunks and memories
- Combines with keyword matching for hybrid retrieval
- Budget-aware: limits context to configurable token count

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

1. **Authenticate** - Validate user token via `validateAuth()`
2. **Rate Limit** - Check chat rate limit
3. **Verify Ownership** - Ensure user owns the chat
4. **Credit Check** - Verify enough credits based on model
5. **Build Context** - `buildMessages()` → smart retrieval with summary, memory, project files, RAG
6. **Load MCP Tools** - Load tools from user's enabled MCP servers
7. **Stream Response** - Call OpenAI with context via `startResumableStream()`
8. **Save Response** - Store AI message on completion
9. **Queue Summarization** - Async trigger if threshold reached

### Context Building

```typescript
async function buildMessages(chatId, incomingMessages, searchResults?, responseStyle?) {
  // 1. Get smart context (summary + recent messages)
  const { messages, summary, topics, keyFacts, truncated } = await getChatContext(chatId, {
    maxTokens: aiConfig.maxContextTokens,
  });

  // 2. Build system prompt with preferences
  let systemPrompt = buildSystemPrompt(promptConfig);

  // 3. Add memory context via RAG
  const memoryContexts = await retrieveContext(incomingMessages, { maxTokens: 1000, userId });

  // 4. Add project context via RAG
  const ragContexts = await retrieveContext(incomingMessages, { fileIds, maxTokens: 3000 });

  // 5. Add chat-attached file contents
  const chatFileContents = await getChatFileContents(chatId, incomingMessages);

  // 6. Add conversation summary, topics, key facts
  if (summary) systemPrompt += `\n\nCONVERSATION SUMMARY:\n${summary}`;
  if (topics) systemPrompt += `\n\nTopics: ${topics.join(", ")}`;
  if (keyFacts) systemPrompt += `\n\nKEY FACTS TO PRESERVE:\n...`;

  // 7. Add search results if in web mode
  if (searchResults) systemPrompt += formatSearchResultsForPrompt(searchResults);

  return [
    { role: "system", content: systemPrompt },
    ...contextMessages,
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
OPENAI_API_KEY=gsk_...
OPENAI_API_KEY_2=gsk_...  # Optional second API key for failover
AI_MODEL=eryx-fast
AI_MODEL_WITH_TOOLS=eryx-fast
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.7
MAX_CONTEXT_TOKENS=2000
MAX_SYSTEM_PROMPT_TOKENS=1500
MAX_RECENT_MESSAGES=20
```

## Why Not Vector Search?

Vector embeddings sound powerful but are **overkill** for chat context because:

1. **Chat is sequential** - semantic similarity is less useful than recency
2. **Storage overhead** - 1536 dimensions per message is huge
3. **Latency** - embedding generation adds delay
4. **Complexity** - consistency between sessions is hard

What we do instead:
- **Summary-based retrieval** (similar to what ChatGPT/Claude use)
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