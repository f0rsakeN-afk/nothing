export const STATIC_RESPONSE = `
## Overview

Here's a comprehensive breakdown covering all response types. I'll walk through concepts, media, and code examples.

---

## Images

Here's a sample architecture diagram:

![System architecture overview](https://picsum.photos/seed/arch/800/420)

You can click any image to view it full-size and download it.

---

## Video & Audio

Sample media files from the backend:

[Watch — architecture walkthrough](https://www.youtube.com/watch?v=BVD-NPcRaRw&list=RDBVD-NPcRaRw&start_radio=1&pp=oAcB)

[Listen — system audio brief](https://www.w3schools.com/html/horse.ogg)

---

## Useful Links

- [React documentation](https://react.dev)
- [Next.js App Router guide](https://nextjs.org/docs/app)
- [Tailwind CSS reference](https://tailwindcss.com/docs)

---

## Key Concepts

### 1. Stateless Services

Stateless services don't retain any client session data between requests. This means any instance can handle any request, making horizontal scaling trivial.

- No shared in-memory state between pods
- Session data lives in a distributed store (Redis, DynamoDB)
- Health checks are simple — a pod is either up or down
- Rolling deployments cause zero downtime

### 2. Caching Strategy

A well-designed cache has multiple layers:

1. **CDN edge cache** — static assets and public API responses
2. **Application cache** — frequently-read database records
3. **Database query cache** — repeated query results

> Premature cache invalidation is the root of all evil. Start simple — cache at the edges and work inward only when you have data to justify it.

---

## Code Examples

Inline code: call \`crypto.randomUUID()\` to generate a unique ID, or use \`Date.now()\` for a timestamp-based one.


**TypeScript — event types:**

\`\`\`typescript
console.log("hello naresh")
\`\`\`

**TypeScript — event types:**

\`\`\`typescript
interface OrderEvent {
  type: "order.created" | "order.fulfilled" | "order.cancelled";
  payload: {
    orderId: string;
    userId: string;
    items: OrderItem[];
    timestamp: number;
  };
}

async function publishEvent(event: OrderEvent): Promise<void> {
  await broker.publish("orders", {
    key: event.payload.orderId,
    value: JSON.stringify(event),
  });
}
\`\`\`

**Python — order service:**

\`\`\`python
from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4

@dataclass
class Order:
    id: str
    user_id: str
    total: float
    created_at: datetime = field(default_factory=datetime.utcnow)

class OrderService:
    def __init__(self, repo, broker):
        self.repo = repo
        self.broker = broker

    async def create_order(self, user_id: str, items: list) -> Order:
        order = Order(id=uuid4().hex, user_id=user_id, total=sum(i.price for i in items))
        await self.repo.save(order)
        await self.broker.publish("order.created", order)
        return order
\`\`\`

**SQL — fulfillment query:**

\`\`\`sql
SELECT
  o.id,
  o.user_id,
  o.total,
  COUNT(oi.id)  AS item_count,
  MAX(s.status) AS latest_status
FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN shipments s    ON s.order_id  = o.id
WHERE o.created_at > NOW() - INTERVAL '30 days'
GROUP BY o.id, o.user_id, o.total
ORDER BY o.created_at DESC;
\`\`\`

---

## Comparison Table

| Pattern | Latency | Consistency | Complexity | Best for |
|---|---|---|---|---|
| Synchronous REST | Low | Strong | Low | CRUD operations |
| Async messaging | Medium | Eventual | Medium | Workflows, notifications |
| Event sourcing | Low | Eventual | High | Audit trail, CQRS |
| GraphQL | Low | Strong | Medium | Flexible client queries |

---

## Text Formatting

- **Bold** for important terms
- *Italic* for emphasis or foreign terms
- ~~Strikethrough~~ for deprecated items
- \`inline code\` for short identifiers

---

## Summary

- Keep services **stateless** — store session data externally
- Cache **aggressively** at the edges, lazily near the database
- Prefer **async messaging** for cross-service workflows
- Use **strong types** for event payloads to catch schema drift early
`;
