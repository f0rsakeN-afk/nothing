# Eryx Architecture

## Directory Structure

```
eryx/
├── app/
│   ├── (main)/           Route group: authenticated app (chat, projects, memory, settings)
│   ├── (marketing)/      Route group: public marketing pages
│   ├── admin/            Admin panel pages (dashboard, users, chats, settings, plans…)
│   ├── api/              API routes
│   │   ├── admin/        Admin-only API (auth-guarded, admin/moderator role required)
│   │   ├── polar/        Polar payment integration (checkout, subscription, webhook)
│   │   └── …/            User-facing API (chat, projects, files, auth…)
│   └── layout.tsx        Root layout (providers, env config)
│
├── components/
│   ├── admin/            Admin panel UI components
│   ├── main/             Authenticated app components (chat, sidebar, header…)
│   ├── ui/               shadcn/ui base components
│   └── …/                Feature-specific (mcp-elicitation-modal, customize…)
│
├── lib/                  Shared utilities
│   ├── index.ts          Barrel export — import from here for lib/ helpers
│   ├── admin/            Admin utilities (audit-log, errors)
│   ├── redis.ts          Redis client + KEYS + TTL constants
│   ├── prisma.ts         Prisma client singleton
│   ├── auth.ts           validateAuth, isAdminOrModerator
│   └── validations/      Zod schemas organized by domain
│
├── services/             Business logic
│   ├── index.ts          Barrel export for stable domains
│   ├── chat.service.ts   Chat CRUD, streaming, branching
│   ├── credit.service.ts Credit balance, deduction, refunds
│   ├── limit.service.ts  Plan limit checking
│   ├── plan.service.ts   Plan and subscription management
│   └── admin/           Admin-only services (audit, users, inbox…)
│
└── prisma/
    └── schema.prisma     Database schema (all models)
```

## Data Flow

```
Browser
  │
  ▼
app/api/{domain}/route.ts        ← Validate auth, parse input (Zod), call service
  │
  ▼
services/*.service.ts           ← Business logic, Redis cache-aside
  │
  ▼
lib/prisma.ts                  ← Prisma client → PostgreSQL
  │
  ▼
Redis (cache-aside)            ← KEYS + TTL defined in lib/redis.ts
```

## Key Patterns

### API Route (every route follows this template)
```typescript
export async function GET(request: NextRequest) {
  const user = await validateAuth(request);
  if (!user) return unauthorizedError();

  if (!await isAdminOrModerator(user.id)) return forbiddenError();

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);

  // ...
}
```

### Redis Caching
```typescript
// Cache-aside: read from Redis first, fall back to DB, write back
const cached = await redis.get(KEYS.adminSettings());
if (cached) return JSON.parse(cached);

const data = await prisma.adminSetting.findMany();
await redis.setex(KEYS.adminSettings(), TTL.adminSettings, JSON.stringify(data));
return data;
```

### Cache Invalidation
When admin data changes, invalidate both admin and public caches:
```typescript
await redis.del(KEYS.adminPlans());
await redis.del(KEYS.polarPlans()); // Public pricing page cache
```

## Features

### Credits
Credit deduction flow:
1. `POST /api/chat` → `streamChat()`
2. `deductCredits(userId, modelKey)` → check balance → decrement `User.credits`
3. Cost loaded from `AdminSetting: credit_costs` (JSON array) → cached in Redis `credit:costs`
4. On failure, credits refunded in catch block

### Chat Streaming
1. `streamChat()` starts a resumable SSE stream
2. Chunks published to Redis pub/sub channel `chat:{chatId}`
3. `resumable-stream.service.ts` stores partial response in Redis
4. Resume: client sends `x-resume-stream` header, server reads from `chat:{chatId}:partial`

### Billing (Polar)
1. `POST /api/polar/checkout` → redirects to `polar.sh/checkout/{productId}`
2. User pays on Polar (handles tax, global compliance)
3. `POST /api/polar/webhook` receives events (`subscription.active`, `order.paid`)
4. Webhook handler provisions credits/subscription via `subscription.service.ts`

### Admin Panel
All admin routes live under `/api/admin/` and `/admin/`. Auth flow:
- Middleware validates session
- `isAdminOrModerator(userId)` checks `User.isAdmin || User.isModerator`
- Audit events fire asynchronously (fire-and-forget) via `logAuditEvent()`

## Adding a New API Route

1. Create `app/api/{domain}/route.ts`
2. Import `validateAuth`, `isAdminOrModerator` from `@/lib/auth`
3. Use Zod schema for input validation (put in `lib/validations/`)
4. Add Redis caching using `KEYS` and `TTL` from `@/lib/redis`
5. Add audit logging via `logAuditEvent` from `@/lib/admin/audit-log`
6. If admin-only: wrap handler with admin role check
7. If cache needs invalidation: delete relevant `KEYS.*` key after mutation

## Adding a New Service

1. Create `services/{feature}.service.ts`
2. Export typed interfaces for all return values
3. Use `prisma` from `@/lib/prisma`, `redis` from `@/lib/redis`
4. For cache functions, follow the cache-aside pattern
5. Add `invalidate*Cache` helper that calls `redis.del(KEYS.*)`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `POLAR_ACCESS_TOKEN` | Polar API token |
| `POLAR_WEBHOOK_SECRET` | Polar webhook signature secret |
| `POLAR_MODE` | `sandbox` or `production` |
| `NEXT_PUBLIC_APP_URL` | Public URL for webhook redirect |
