# API Routes

## Overview

API routes are located in `app/api/` and follow Next.js App Router conventions. Each route is a thin HTTP wrapper around service functions.

## Route Structure

```
app/api/
├── account/          # Account operations
├── auth/             # Auth status
│   └── status/
├── chat/             # Streaming chat (POST - main AI endpoint)
├── chats/            # Chat CRUD
│   ├── [id]/
│   │   ├── route.ts          # GET/PATCH/DELETE single chat
│   │   ├── branch/           # Chat branching
│   │   ├── messages/         # Message operations
│   │   └── title/           # Title generation
│   └── route.ts             # GET list, POST create
├── credits/          # Credit balance
├── customize/        # User customization
├── events/           # Event tracking
├── feedback/         # Feedback submissions
├── files/            # File uploads
├── health/           # Health checks
├── init-user/       # User initialization
├── memory/           # Memory operations
├── messages/         # Message operations
├── notifications/    # Notifications
├── onboarding/       # Onboarding flow
├── projects/         # Project CRUD
├── report/           # Bug reports
├── search/           # Web search (GET)
├── settings/         # User settings
├── status/           # Status checks
└── polar/           # Payment processing (Polar MoR)
    ├── checkout/     # Create checkout URL
    ├── subscription/ # Manage subscription
    └── webhook/      # Polar webhook handler
```

## Common Pattern

Every API route follows this structure:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";
import { someServiceFunction } from "@/services/some.service";

export async function GET(request: NextRequest) {
  // 1. Rate limit check
  const rateLimitResult = await rateLimit(request, "default");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.resetAt);
  }

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

  // 3. Parse params
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  // 4. Call service
  const result = await someServiceFunction(user.id, { limit });

  // 5. Return response
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  // Same pattern, plus request body parsing
  const body = await request.json();

  // ... rest of pattern
}
```

## Key Routes

### Chat (Streaming)

**File:** `app/api/chat/route.ts`

```
POST /api/chat
```

Streams AI responses using Server-Sent Events.

```typescript
// Request
{
  "chatId": "string",
  "messages": [{ "role": "user" | "assistant", "content": "string" }],
  "mode": "chat" | "web"
}

// Response: SSE stream
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]

// Error (402 for insufficient credits)
{
  "error": "Insufficient credits",
  "required": 1,
  "current": 0,
  "message": "This operation requires 1 credits..."
}
```

### Chats List

**File:** `app/api/chats/route.ts`

```
GET /api/chats?limit=20&cursor=xxx&archived=false&projectId=xxx
POST /api/chats
```

### Single Chat Operations

**File:** `app/api/chats/[id]/route.ts`

```
GET /api/chats/:id      # Get chat details
PATCH /api/chats/:id    # Update chat (title, archive, pin, project)
DELETE /api/chats/:id   # Delete chat
```

### Chat Branching

**File:** `app/api/chats/[id]/branch/route.ts`

```
POST /api/chats/:id/branch
{
  "messageId": "string"  // Create branch from this message
}

// Response
{
  "newChatId": "string",
  "branchTitle": "string",
  "messageCount": 0
}
```

### Chat Messages

**File:** `app/api/chats/[id]/messages/route.ts`

```
GET /api/chats/:id/messages?limit=30&cursor=xxx&direction=before|after
POST /api/chats/:id/messages
```

### Title Generation

**File:** `app/api/chats/[id]/title/route.ts`

```
POST /api/chats/:id/title
// Generates title from first user messages
```

### Web Search

**File:** `app/api/search/route.ts`

```
GET /api/search?q=query&limit=10&offset=0
```

## Response Formats

### Success

```typescript
// Single item
NextResponse.json(item);

// List with pagination
NextResponse.json({
  items: [...],
  nextCursor: "xxx" | null,
});

// Mutation success
NextResponse.json({ success: true, ...data });
```

### Error

```typescript
// Validation error (400)
NextResponse.json({ error: "Invalid input" }, { status: 400 });

// Unauthorized (401)
NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Forbidden (403)
NextResponse.json({ error: "Account deactivated" }, { status: 403 });

// Not found (404)
NextResponse.json({ error: "Chat not found" }, { status: 404 });

// Rate limited (429)
NextResponse.json(
  { error: "Too many requests", retryAfter: 60 },
  { status: 429, headers: { "Retry-After": "60" } }
);

// Upgrade required (402)
NextResponse.json(
  { error: "Chat limit reached", upgradeTo: "pro" },
  { status: 402 }
);

// Insufficient credits (402)
NextResponse.json(
  {
    error: "Insufficient credits",
    required: 1,
    current: 0,
    upgradeTo: "Pro",
  },
  { status: 402 }
);

// Server error (500)
NextResponse.json({ error: "Internal server error" }, { status: 500 });
```

## Rate Limit Tiers by Route

| Route | Limit Type | Max Requests |
|-------|-----------|--------------|
| `GET /api/chats` | `default` | 100/min |
| `POST /api/chats` | `chat` | 60/min |
| `POST /api/chat` | `chat` | 60/min |
| `GET /api/search` | `search` | 30/min |
| `POST /api/stripe/*` | `auth` | 10/5min |

## Authentication

All routes except these allow optional authentication:
- `GET /api/search` - Anonymous search allowed
- `GET /api/health` - Public health check
- `POST /api/stripe/webhook` - Stripe signature verification
- `POST /api/auth/*` - Auth endpoints

For routes with optional auth, use `validateAuth()` which returns `null` if not authenticated.

## Zod Validation

Input validation uses Zod schemas:

```typescript
import { z } from "zod";

const createChatSchema = z.object({
  firstMessage: z.string().optional(),
  projectId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validationResult = createChatSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      { error: validationResult.error.message },
      { status: 400 }
    );
  }

  // Use validationResult.data
}
```