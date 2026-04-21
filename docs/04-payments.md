# Payment & Subscription System

## Overview

Payments are handled via **Polar** - a Merchant of Record platform that handles:
- **Tax compliance** - Global tax handling included
- **Payment processing** - Multiple payment methods
- **Subscription management** - Automatic renewals
- **Credit packages** - One-time purchases

## Why Polar?

| Feature | Stripe | Polar |
|---------|--------|-------|
| Tax Compliance | Extra cost | Included (4% + $0.40/transaction) |
| Setup Complexity | High | Low |
| Embedded Checkout | Manual implementation | Built-in |
| Merchant of Record | No | Yes |
| Subscription Management | Manual | Automated |

## Configuration

**File:** `lib/polar-config.ts`

```typescript
import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
  server: process.env.POLAR_MODE === "production" ? "production" : "sandbox",
});

export const polarConfig = {
  // Authentication
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET || "",
  server: (process.env.POLAR_MODE || "sandbox") as "sandbox" | "production",

  // Credit packages (one-time purchases)
  creditPackages: [
    { id: "credits_50", amount: 99, credits: 50, name: "Starter" },
    { id: "credits_200", amount: 299, credits: 200, name: "Basic" },
    { id: "credits_1000", amount: 999, credits: 1000, name: "Pro" },
    { id: "credits_5000", amount: 3999, credits: 5000, name: "Enterprise" },
  ],

  // Credit costs per operation
  creditCosts: {
    "eryx-1": 1,
    "eryx-1-fast": 1,
    "eryx-1-pro": 5,
    "web-search": 3,
    "file-analysis": 5,
    "image-generation": 20,
  },

  // Plan subscriptions - map to Polar product IDs
  plans: {
    free: { polarProductId: null },
    basic: { polarProductId: process.env.POLAR_BASIC_PRODUCT_ID },
    pro: { polarProductId: process.env.POLAR_PRO_PRODUCT_ID },
    enterprise: { polarProductId: process.env.POLAR_ENTERPRISE_PRODUCT_ID },
  },
};
```

## Credit System

### Credit Costs

Each AI operation costs credits based on model tier:
- **Fast models** (`eryx-fast`, `eryx-nano`): 1 credit
- **Pro models** (`eryx-pro`, `eryx-ultra`): 5 credits
- **Web search**: 3 credits
- **File analysis**: 5 credits
- **Image generation**: 20 credits

### Credit Packages

One-time credit purchases:

| Package | Price | Credits |
|---------|-------|---------|
| Starter | $0.99 | 50 |
| Basic | $2.99 | 200 |
| Pro | $9.99 | 1000 |
| Enterprise | $39.99 | 5000 |

### Credit Deduction Flow

```typescript
// services/credit.service.ts
export async function deductCredits(
  userId: string,
  operation: CreditOperation,
  customAmount?: number
): Promise<DeductionResult> {
  const cost = customAmount ?? polarConfig.creditCosts[operation] ?? 1;

  const currentBalance = user.credits || 0;
  if (currentBalance < cost) {
    return { success: false, error: "Insufficient credits" };
  }

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

  return { success: true, deducted: cost, remainingCredits: updatedUser.credits };
}
```

### Credit Rollover

Credits roll over month-to-month. On subscription renewal:
- New monthly credits are **added** to existing balance
- Example: User has 50 credits left, renews → receives 200 new credits → 250 total

## Subscription Plans

### Plan Tiers

| Plan | Price | Credits | Max Chats | Max Projects |
|------|-------|---------|-----------|--------------|
| Free | $0 | 25 | 100 | 2 |
| Basic | $4.99/mo | 200 | 500 | 5 |
| Pro | $14.99/mo | 1000 | Unlimited | Unlimited |
| Enterprise | $49.99/mo | 5000 | Unlimited | Unlimited |

## Polar Webhook Events

**File:** `app/api/polar/webhook/route.ts`

The webhook handler processes these Polar events:

### `checkout.created`
Triggered when a checkout is initiated.

```typescript
async function handleCheckoutCreated(data: Record<string, unknown>) {
  const checkout = data as {
    id: string;
    customerId: string;
    productId: string;
    amount: number;
    metadata?: Record<string, string>;
  };

  console.log(`Checkout created: ${checkout.id}`);
  // Store pending checkout if needed
}
```

### `order.paid`
**Primary event** - Activates subscription or adds credits.

```typescript
async function handleOrderPaid(data: Record<string, unknown>) {
  const order = data as {
    id: string;
    customerId: string;
    productId: string;
    metadata?: Record<string, string>;
  };

  const userId = order.metadata?.userId;
  const isCreditPackage = order.metadata?.type === "credit_package";

  if (isCreditPackage) {
    // Add credits to user
    const credits = parseInt(order.metadata?.credits || "0", 10);
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: credits } },
    });
  } else {
    // Activate subscription
    const planId = order.metadata?.planId;
    const plan = await prisma.plan.findUnique({ where: { id: planId } });

    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, planId, status: "ACTIVE", ... },
      update: { planId, status: "ACTIVE", ... },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        planTier: plan.tier,
        planId: plan.id,
        credits: { increment: plan.credits },
        features: plan.features,
      },
    });
  }
}
```

### `order.refunded`
Handles refund scenarios.

### `subscription.created`
New subscription created.

```typescript
async function handleSubscriptionCreated(data: Record<string, unknown>) {
  const subscription = data as {
    id: string;
    customerId: string;
    productId: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    metadata?: Record<string, string>;
  };

  const userId = subscription.metadata?.userId;
  const planId = subscription.metadata?.planId;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planId,
      status: mapSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.currentPeriodStart * 1000),
      currentPeriodEnd: new Date(subscription.currentPeriodEnd * 1000),
    },
    update: { ... },
  });
}
```

### `subscription.active`
Subscription is active and billing.

### `subscription.canceled`
Subscription was cancelled by user.

```typescript
async function handleSubscriptionCanceled(data: Record<string, unknown>) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  // Keep credits (user paid for them)
  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier: "FREE",
      planId: null,
      credits: user.credits, // Keep remaining credits
    },
  });
}
```

### `subscription.updated`
Subscription metadata changed.

### `subscription.uncanceled`
User reactivated a canceled subscription.

```typescript
async function handleSubscriptionUncanceled(data: Record<string, unknown>) {
  const existingSub = await prisma.subscription.findFirst({
    where: { userId },
    include: { plan: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier: existingSub.plan.tier,
      planId: existingSub.plan.id,
      features: existingSub.plan.features,
    },
  });
}
```

### `benefit_grant.cycled`
**Credit rollover** - Fires on subscription renewal.

```typescript
async function handleBenefitGrantCycled(data: Record<string, unknown>) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    include: { plan: true },
  });

  // Add monthly credits on top of existing (rollover)
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: subscription.plan.credits } },
  });
}
```

## Webhook Security

Polar webhooks are verified using the SDK:

```typescript
import { validateEvent } from "@polar-sh/sdk/webhooks";

const event = validateEvent(
  body,
  {
    "polar-signature": request.headers.get("polar-signature"),
    "polar-timestamp": request.headers.get("polar-timestamp"),
  },
  process.env.POLAR_WEBHOOK_SECRET
);
```

## API Endpoints

```
POST /api/polar/checkout     - Create checkout URL for subscription or credits
POST /api/polar/subscription - Cancel subscription (marks for cancellation)
DELETE /api/polar/subscription - Reactivate canceled subscription
POST /api/polar/webhook      - Polar webhook handler
```

## Checkout Flow

### Embedded Checkout (Recommended)

```typescript
// Client-side: Open Polar checkout in embedded mode
const response = await fetch("/api/polar/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ planId: "pro" }),
});

const { url } = await response.json();
// Open url in embed or redirect
window.location.href = url;
```

### Checkout Link Format

```
https://polar.sh/checkout/{productId}?metadata[userId]=xxx&metadata[planId]=xxx&embed=true&embed_origin=https://yourapp.com
```

## Environment Variables

```env
# Polar Authentication
POLAR_ACCESS_TOKEN=pk_live_...
POLAR_MODE=sandbox  # or 'production'

# Webhook verification
POLAR_WEBHOOK_SECRET=whsec_...

# Product IDs (from Polar dashboard)
POLAR_BASIC_PRODUCT_ID=prod_...
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_ENTERPRISE_PRODUCT_ID=prod_...

# Credit package products
POLAR_CREDITS_50_PRODUCT_ID=prod_...
POLAR_CREDITS_200_PRODUCT_ID=prod_...
POLAR_CREDITS_1000_PRODUCT_ID=prod_...
POLAR_CREDITS_5000_PRODUCT_ID=prod_...
```

## Webhook Events Summary

| Event | Trigger | Action |
|-------|---------|--------|
| `checkout.created` | Checkout initiated | Log event |
| `order.paid` | Payment successful | Activate subscription/add credits |
| `order.refunded` | Refund processed | Reverse credits if needed |
| `subscription.created` | New subscription | Create subscription record |
| `subscription.active` | Subscription active | Update status |
| `subscription.canceled` | User cancels | Downgrade to free, keep credits |
| `subscription.updated` | Subscription changed | Update record |
| `subscription.uncanceled` | User reactivates | Restore plan |
| `benefit_grant.cycled` | Renewal | Add rollover credits |

## Migration from Stripe

To migrate from Stripe:

1. **Create Polar account** at polar.sh/signup
2. **Create products** in Polar dashboard (basic, pro, enterprise, credit packages)
3. **Update environment variables** (see above)
4. **Replace Stripe routes** with Polar routes in `app/api/polar/`
5. **Update webhook handler** to use Polar SDK validation
6. **Test with sandbox** before production

### Key Differences

| Stripe | Polar |
|--------|-------|
| `stripe.checkout.sessions.create()` | Checkout links or SDK |
| `stripe.subscriptions.update()` | Via Polar dashboard or customer portal |
| `stripe.webhooks.constructEvent()` | `validateEvent()` from SDK |
| Manual tax handling | Included in pricing |
| `payment_intent.succeeded` | `order.paid` |
| `customer.subscription.deleted` | `subscription.canceled` |