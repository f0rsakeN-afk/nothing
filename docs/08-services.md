# Services Architecture

## Overview

Business logic is separated into services under `/services/`. API routes act as thin wrappers that handle HTTP concerns and delegate to services.

## Service Files

```
services/
├── chat.service.ts       # Chat CRUD and message operations
├── credit.service.ts     # Credit balance and deductions
├── limit.service.ts      # Plan limits checking and enforcement
├── plan.service.ts       # Plan data access
├── memory.service.ts     # User memory operations
├── preferences.service.ts # User preferences
├── rate-limit.service.ts # Rate limiting logic
└── summarize.service.ts  # Chat context summarization (hierarchical)
```

## Chat Service

**File:** `services/chat.service.ts`

Handles all chat-related database operations.

### Functions

```typescript
// Get user's chat list (with caching)
async function getUserChats(
  userId: string,
  limit = 20,
  cursor?: string,
  options: { archived?: boolean; projectId?: string } = {}
): Promise<{ chats: Chat[]; nextCursor: string | null }>

// Search user's chats
async function searchUserChats(
  userId: string,
  query: string,
  limit = 20
): Promise<{ chats: Chat[]; nextCursor: null }>

// Create new chat
async function createChat(
  userId: string,
  options: { projectId?: string; firstMessage?: string } = {}
): Promise<Chat>

// Get chat by ID
async function getChatById(chatId: string, userId: string): Promise<Chat | null>

// Update chat (title, archived, pinned, project)
async function updateChat(
  chatId: string,
  userId: string,
  data: { title?: string; archivedAt?: Date | null; projectId?: string | null; pinnedAt?: Date | null }
): Promise<Chat>

// Delete chat
async function deleteChat(chatId: string, userId: string): Promise<void>

// Get chat messages with pagination
async function getChatMessages(
  chatId: string,
  userId: string,
  limit = 50,
  cursor?: string,
  direction: "before" | "after" = "before"
): Promise<{ messages: Message[]; nextCursor: string | null; prevCursor: string | null }>

// Add message to chat
async function addChatMessage(
  chatId: string,
  userId: string,
  data: { role: "user" | "assistant"; content: string }
): Promise<Message>

// Get recent messages for AI context
async function getRecentMessages(chatId: string, limit = 20): Promise<Message[]>
```

### Caching Strategy

```typescript
// Chat list cached for 5 minutes
const result = await redis.setex(
  KEYS.userChats(userId),
  TTL.userChats,  // 5 minutes
  JSON.stringify({ chats, nextCursor })
);

// Chat metadata cached in Redis hash
await redis.hset(KEYS.chatMeta(chatId), {
  title: chat.title,
  createdAt: chat.createdAt.toISOString(),
  projectId: chat.projectId || "",
});

// Chat messages cached in Redis list
await redis.lpush(KEYS.chatMessages(chatId), JSON.stringify(message));
await redis.ltrim(KEYS.chatMessages(chatId), 0, 99);  // Keep last 100
```

### Pub/Sub Notifications

When chat state changes, publish events for real-time updates:

```typescript
await redis.publish(
  CHANNELS.sidebar(userId),
  JSON.stringify({
    type: "chat:archived" | "chat:pinned" | "chat:renamed" | "chat:deleted",
    chatId: chat.id,
    title: chat.title,
  })
);

await redis.publish(
  CHANNELS.chat(chatId),
  JSON.stringify({
    type: "message:new",
    message: { id, role, content, createdAt },
  })
);
```

## Credit Service

**File:** `services/credit.service.ts`

Handles credit balance and deductions.

### Functions

```typescript
// Get user's current credit balance
async function getUserCredits(userId: string): Promise<number>

// Deduct credits for an operation
async function deductCredits(
  userId: string,
  operation: CreditOperation,
  customAmount?: number
): Promise<DeductionResult>

// Add credits to user balance
async function addCredits(
  userId: string,
  amount: number
): Promise<CreditResult>

// Check if user has enough credits for operation
async function checkCreditsForOperation(
  userId: string,
  operation: CreditOperation
): Promise<boolean>

// Get user's subscription info
async function getUserSubscription(userId: string): Promise<SubscriptionInfo | null>
```

### Credit Operations

```typescript
type CreditOperation = "eryx-1" | "eryx-1-fast" | "eryx-1-pro" | "web-search" | "file-analysis" | "image-generation";

creditCosts: {
  "eryx-1": 1,
  "eryx-1-fast": 1,
  "eryx-1-pro": 5,
  "web-search": 3,
  "file-analysis": 5,
  "image-generation": 20,
}
```

### Deduction Flow

```typescript
async function deductCredits(userId, operation, customAmount?) {
  const cost = customAmount ?? stripeConfig.creditCosts[operation] ?? 1;

  // Check balance
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if ((user.credits || 0) < cost) {
    return { success: false, error: "Insufficient credits" };
  }

  // Deduct
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: cost } },
  });

  // If credits reached 0 and user had paid tier, downgrade to free
  if (updatedUser.credits === 0 && user.planTier !== "FREE") {
    const freePlan = await prisma.plan.findUnique({ where: { id: "free" } });
    await prisma.user.update({
      where: { id: userId },
      data: { planTier: "FREE", planId: null, features: freePlan.features },
    });
    await invalidateUserLimitsCache(userId);
  }

  return {
    success: true,
    deducted: cost,
    remainingCredits: updatedUser.credits,
  };
}
```

## Limit Service

**File:** `services/limit.service.ts`

Checks user limits based on their plan tier.

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
  planTier: string;
  maxProjects: number;
  maxChats: number;
  maxMessages: number;
}
```

### Limit Check Functions

```typescript
// Get full limits object (cached)
async function getUserLimits(userId: string): Promise<UserLimits>

// Invalidate cache when plan changes
async function invalidateUserLimitsCache(userId: string): Promise<void>

// Check individual limits
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

### LimitCheckResult

```typescript
interface LimitCheckResult {
  allowed: boolean;
  current?: number;
  limit?: number;
  error?: string;
  feature?: string;
}
```

### Caching

User limits are cached in Redis for 5 minutes:

```typescript
const CACHE_TTL = 300; // 5 minutes

const cacheKey = `user:limits:${userId}`;
// Cache structure:
{
  plan: PlanData,
  isActiveSubscription: boolean,
  expiresAt: number  // Date.now() + CACHE_TTL * 1000
}
```

### Plan Hierarchy

1. **Active subscription** → Use subscribed plan
2. **No active subscription but has credits** → Keep using subscribed plan
3. **No subscription and no credits** → Fall back to free tier

## Plan Service

**File:** `services/plan.service.ts`

Single source of truth for plan configuration from database.

### Functions

```typescript
// Get plan by ID
async function getPlan(planId: string): Promise<PlanData | null>

// Get all visible, active plans
async function getAllActivePlans(): Promise<PlanData[]>

// Get default plan for new users
async function getDefaultPlan(): Promise<PlanData | null>

// Get plan by tier
async function getPlanByTier(tier: PlanTier): Promise<PlanData | null>
```

### PlanData Interface

```typescript
interface PlanData {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  price: number;
  stripePriceId: string | null;
  stripeProductId: string | null;
  credits: number;
  maxChats: number;
  maxProjects: number;
  maxMessages: number;
  maxMemoryItems: number;
  maxBranchesPerChat: number;
  maxFolders: number;
  maxAttachmentsPerChat: number;
  maxFileSizeMb: number;
  canExport: boolean;
  canApiAccess: boolean;
  features: string[];
  isActive: boolean;
  isVisible: boolean;
}
```

## Memory Service

Handles user memory items for AI context.

```typescript
// Get all memories for user
async function getUserMemories(userId: string): Promise<Memory[]>

// Get memories by category
async function getMemoriesByCategory(userId: string, category: string): Promise<Memory[]>

// Create memory
async function createMemory(
  userId: string,
  data: { title: string; content: string; tags?: string[]; category?: string }
): Promise<Memory>

// Update memory
async function updateMemory(
  memoryId: string,
  userId: string,
  data: Partial<Memory>
): Promise<Memory>

// Delete memory
async function deleteMemory(memoryId: string, userId: string): Promise<void>
```

## Preferences Service

```typescript
// Get user preferences (cached)
async function getUserPreferences(userId: string, email: string): Promise<UserPreferences>

// Update preferences
async function updateUserPreferences(
  userId: string,
  data: Partial<UserPreferences>
): Promise<UserPreferences>
```

## Summarize Service

**File:** `services/summarize.service.ts`

Handles hierarchical context management for long conversations using LLM-generated summaries.

### Why Summarization?

When a chat has 50+ messages, sending all messages to the LLM exceeds token budgets. Instead of raw truncation, we:
1. Generate a structured summary via LLM
2. Store summary in PostgreSQL + Redis cache
3. Use summary + recent messages for context

### Key Functions

```typescript
// Get smart context - returns summary + recent messages
async function getChatContext(
  chatId: string,
  options: { maxTokens?: number }
): Promise<{
  messages: { id: string; role: string; content: string; createdAt: string }[];
  summary?: string;
  topics?: string[];
  keyFacts?: string[];
  truncated: boolean;
}>

// Check if chat needs summarization
async function shouldSummarize(chatId: string): Promise<boolean>

// Trigger async summarization (fire and forget)
async function queueSummarization(chatId: string): Promise<void>

// Perform LLM-based summarization
async function summarizeChat(chatId: string): Promise<boolean>

// Delete summary when chat is deleted
async function deleteSummary(chatId: string): Promise<void>
```

### Context Flow

```
getChatContext(chatId)
    │
    ├─→ Redis cache for summary? → return cached
    │
    ├─→ PostgreSQL for summary? → return + cache it
    │
    └─→ Get recent 20 messages
         │
         ▼
    If token budget exceeded:
    → Keep last 10 messages + summary + topics + keyFacts
```

### Summary Data Structure

```typescript
// Stored in ChatSummary model
interface ChatSummary {
  summary: string;      // "User discussed auth setup, chose NextAuth..."
  topics: string[];     // ["authentication", "NextAuth", "JWT"]
  keyFacts: string[];   // ["import prisma from '@/lib/prisma'", "API: /api/chat"]
  startMessageId: string;
  endMessageId: string;
  messageCount: number;
  tokenCount: number;
}
```

### Performance Features

1. **Incremental summarization** - Only summarizes NEW messages, not entire history
2. **Redis caching** - Single round-trip for summary retrieval
3. **Lock mechanism** - Prevents duplicate summarization jobs
4. **Async processing** - User never waits for summarization
5. **Threshold tracking** - Redis counter avoids DB count queries

### Redis Keys

```typescript
chat:{chatId}:summary     → Cached summary JSON (7 day TTL)
chat:{chatId}:summarizing   → Lock key (5 min TTL)
chat:{chatId}:msg_count     → Message count for threshold (7 day TTL)
```

## Rate Limit Service

**File:** `services/rate-limit.service.ts`

See [Middleware & Security](./02-middleware-security.md#rate-limiting) for details.

## API Route Pattern

API routes follow a consistent pattern:

```typescript
// 1. Import services
import { getOrCreateUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";
import { checkChatLimit, createChat } from "@/services/chat.service";

export async function POST(request: Request) {
  // 2. Rate limit
  const rateLimitResult = await rateLimit(request, "chat");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.resetAt);
  }

  // 3. Authenticate
  let user;
  try {
    user = await getOrCreateUser(request);
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return Response.json({ error: "Account deactivated" }, { status: 403 });
    }
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 4. Validate input (Zod schema)
  const validationResult = createChatSchema.safeParse(body);
  if (!validationResult.success) {
    return Response.json({ error: validationResult.error.message }, { status: 400 });
  }

  // 5. Check limits
  const limitCheck = await checkChatLimit(user.id);
  if (!limitCheck.allowed) {
    return Response.json(
      { error: limitCheck.error, upgradeTo: "pro" },
      { status: 402 }
    );
  }

  // 6. Business logic
  const chat = await createChat(user.id, validationResult.data);

  // 7. Return response
  return Response.json(chat);
}
```

## Error Handling Pattern

```typescript
// Custom errors for specific cases
export class AccountDeactivatedError extends Error {
  constructor() {
    super("ACCOUNT_DEACTIVATED");
    this.name = "AccountDeactivatedError";
  }
}

// Typed errors for API responses
interface APIError {
  error: string;
  code?: string;
  upgradeTo?: string;  // Suggest upgrade for limit errors
}
```

## Transaction Pattern

For atomic operations:

```typescript
const chat = await prisma.$transaction(async (tx) => {
  // Verify user exists
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User ${userId} does not exist`);

  // Create chat
  const newChat = await tx.chat.create({ data: { title, userId, projectId } });

  // Create first message if provided
  if (firstMessage) {
    await tx.message.create({
      data: {
        chatId: newChat.id,
        sender: "user",
        role: "user",
        content: firstMessage,
      },
    });
  }

  return newChat;
});
```