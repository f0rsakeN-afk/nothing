# Documentation Index

Welcome to the Eryx AI Assistant codebase documentation. This folder contains detailed documentation for all major systems.

## Quick Start

1. [Authentication](./01-authentication.md) - How user login and auth works
2. [Middleware & Security](./02-middleware-security.md) - Security headers, CORS, rate limiting
3. [Redis](./03-redis.md) - Caching and Pub/Sub architecture
4. [Payments](./04-payments.md) - Polar integration and subscriptions
5. [AI System](./05-ai-system.md) - Groq integration, context management
6. [Web Search](./06-web-search.md) - SearxNG integration
7. [Database](./07-database.md) - Prisma schema and models
8. [Services](./08-services.md) - Business logic layer
9. [API Routes](./09-api-routes.md) - HTTP endpoints

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           Client                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App Router                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │   API Routes │  │     Middleware           │  │
│  │  (React)    │  │   (REST)    │  │  (Security, CORS)        │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│    Services       │ │   AI Provider     │ │   External        │
│  (Business Logic) │ │   (Groq)          │ │   Services        │
│  - chat.service   │ │                   │ │   - Polar         │
│  - credit.service │ │                   │ │   - SearxNG       │
│  - limit.service  │ │                   │ │   - Stack Auth    │
└────────┬──────────┘ └───────────────────┘ └───────────────────┘
         │
         ▼
┌───────────────────┐ ┌───────────────────┐
│   Redis           │ │   PostgreSQL       │
│   (Cache/PubSub)  │ │   (Prisma ORM)     │
└───────────────────┘ └───────────────────┘
```

## Key Technologies

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.2.2, React 19.2.4 |
| Runtime | Bun |
| Database | PostgreSQL + Prisma |
| Cache/PubSub | Redis (ioredis) |
| Auth | Stack Auth |
| AI | Groq SDK (Llama models) |
| Payments | Polar (Merchant of Record) |
| Search | SearxNG |
| UI | shadcn/ui, Radix, Tailwind |

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/mydb

# Redis
REDIS_URL=redis://localhost:6380

# Stack Auth
STACK_SECRET_KEY=sk_...
STACK_PUBLISHABLE_KEY=pk_...

# Groq AI
GROQ_API_KEY=gsk_...

# Polar
POLAR_ACCESS_TOKEN=pk_live_...
POLAR_MODE=sandbox  # or 'production'
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_BASIC_PRODUCT_ID=prod_...
POLAR_PRO_PRODUCT_ID=prod_...

# Web Search
SEARXNG_BASE_URL=http://localhost:8888

# AI Settings
AI_MODEL=llama-3.1-8b-instant
AI_MAX_TOKENS=1024
AI_TEMPERATURE=0.7
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (main)/            # Main app pages (authenticated)
│   ├── (marketing)/       # Marketing pages
│   └── (plain)/           # Unauthenticated pages
├── components/            # React components
├── contexts/              # React contexts
├── hooks/                 # Custom hooks
├── lib/                   # Core library code
│   ├── auth.ts            # Authentication
│   ├── redis.ts           # Redis client
│   ├── config.ts          # AI config
│   ├── polar-config.ts  # Polar config
│   ├── web-search.ts      # Web search
│   ├── scraper.ts         # Content scraping
│   ├── context-manager.ts # AI context
│   └── prompts.ts         # AI prompts
├── services/              # Business logic
│   ├── chat.service.ts
│   ├── credit.service.ts
│   ├── limit.service.ts
│   ├── plan.service.ts
│   └── summarize.service.ts  # Chat context summarization
├── prisma/                # Database schema
│   └── schema.prisma
└── src/
    ├── generated/prisma/  # Prisma client
    └── stack/             # Stack Auth generated
```

## Common Patterns

### Making an Authenticated API Call

```typescript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    chatId: "xxx",
    messages: [{ role: "user", content: "Hello" }],
  }),
});
```

### Using Services in API Routes

```typescript
import { getOrCreateUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";
import { createChat } from "@/services/chat.service";

export async function POST(request) {
  const rateLimitResult = await rateLimit(request, "chat");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.resetAt);
  }

  const user = await getOrCreateUser(request);
  const chat = await createChat(user.id, { firstMessage: "Hello" });

  return NextResponse.json(chat);
}
```

## Getting Help

If a document doesn't answer your question, check:
1. Code comments in the relevant source file
2. Related service files in `/services/`
3. Related library files in `/lib/`