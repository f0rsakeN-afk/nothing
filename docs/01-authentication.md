# Authentication System

## Overview

This project uses **Stack Auth** for authentication. Stack Auth is a managed authentication service that handles OAuth flows, session management, and user identity.

## Stack Auth Integration

### Server Configuration

Stack Auth is configured in `src/stack/server.ts`. The server-side app is created and exported for use in API routes:

```typescript
// src/stack/server.ts
export const stackServerApp = new StackServerApp({ ... });
```

### Client Configuration

Client-side configuration is in `src/stack/client.ts` and provides the `stackClientApp` for use in React components.

## Authentication Flow

### 1. Token Validation

When a request comes to an API route, authentication is handled through `lib/auth.ts`:

```typescript
import { stackServerApp } from "@/src/stack/server";

// Validate and get user from request
const user = await stackServerApp.getUser({ tokenStore: request });
```

The `tokenStore: request` option tells Stack Auth to extract the authentication token from the request (via cookies or Authorization header).

### 2. User Lookup/Creation

The `lib/auth.ts` module provides two main functions:

#### `getOrCreateUser(request: Request)`

Full authentication flow with database user creation. Used in API routes that need to create users on first login.

**Flow:**
1. Validate token via Stack Auth
2. Get user email from Stack Auth (`primaryEmail` or `${stackId}@placeholder.local`)
3. Look up user in database by `stackId`
4. If not found, create new user in Prisma
5. Check if account is active (`isActive` field)
6. Cache user data in Redis (5 min TTL)
7. Return `AuthenticatedUser`

**Code:**
```typescript
export async function getOrCreateUser(request: Request): Promise<AuthenticatedUser> {
  const stackUser = await stackServerApp.getUser({ tokenStore: request });

  if (!stackUser) {
    throw new Error("Unauthorized");
  }

  const email = stackUser.primaryEmail || `${stackUser.id}@placeholder.local`;

  let user = await prisma.user.findUnique({
    where: { stackId: stackUser.id },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        stackId: stackUser.id,
        email,
        role: "USER",
      },
    });
  }

  // Check if account is deactivated
  if (!user.isActive) {
    throw new AccountDeactivatedError();
  }

  return {
    id: user.id,
    email: user.email,
    stackId: stackUser.id,
  };
}
```

#### `validateAuth(request: Request)`

Simple validation without database operations. Returns `null` if not authenticated. Used when you just need to check if a user is logged in.

**Flow:**
1. Validate token via Stack Auth
2. Check Redis cache for user data
3. If cache miss, look up in database
4. Check if account is active
5. Return `AuthenticatedUser` or `null`

### 3. AuthenticatedUser Interface

```typescript
export interface AuthenticatedUser {
  id: string;      // Internal user ID (Prisma User.id)
  email: string;   // User's email
  stackId: string; // Stack Auth user ID
}
```

## Account Deactivation

Users can be deactivated via the `isActive` field on the User model. When a deactivated user tries to authenticate:

```typescript
if (!user.isActive) {
  throw new AccountDeactivatedError();
}
```

The `AccountDeactivatedError` is a custom error class that API routes can catch and return a 403 response.

## Database Schema

### User Model (Relevant Fields)

```prisma
model User {
  id        String   @id @default(uuid())
  stackId   String   @unique  // Stack Auth user ID
  email     String   @unique
  isActive  Boolean  @default(true)  // Account status
  role      Role     @default(USER)  // USER, MODERATOR, ADMIN

  // Index for fast lookup
  @@index([stackId])
}
```

## Redis Caching

User data is cached in Redis to reduce database lookups:

```typescript
// Key pattern
const cacheKey = KEYS.userCache(stackId); // "user:cache:{stackId}"

// Cache for 5 minutes
await redis.setex(cacheKey, TTL.userCache, JSON.stringify({
  id: user.id,
  email: user.email,
}));
```

## Environment Variables

```env
# Stack Auth (from Stack Auth dashboard)
STACK_SECRET_KEY=sk_...
STACK_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_STACK_PUBLISHABLE_KEY=pk_...
STACK_AUTH_REDIRECT_URL=http://localhost:3000/callback
```

## API Route Pattern

```typescript
// app/api/example/route.ts
import { getOrCreateUser } from "@/lib/auth";
import { rateLimit } from "@/services/rate-limit.service";

export async function POST(request: Request) {
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
      return Response.json({ error: "Account deactivated" }, { status: 403 });
    }
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Business logic
  // ...
}
```

## Security Considerations

1. **Token Validation**: Always use `getOrCreateUser` or `validateAuth` on API routes
2. **Account Status**: Check `isActive` to prevent deactivated users from accessing the system
3. **Cache Invalidation**: User cache expires after 5 minutes
4. **Race Conditions**: Handle duplicate user creation with Prisma's `P2002` error code