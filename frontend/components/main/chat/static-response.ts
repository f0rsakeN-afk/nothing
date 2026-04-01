export const STATIC_RESPONSE = `
## Overview

Here's a comprehensive breakdown covering all response types. I'll walk through concepts, media, and code examples.

---

## Tasks & Progress

- [x] Initial research and planning
- [/] **Core implementation** (in progress)
- [ ] Final testing and polish
- [ ] User feedback loop

---

## Email Template (Editable)

Need to send a quick request? Tweak this template directly in the chat:

\`\`\`email
Subject: Sick Leave Request — [Your Name]

Dear [Manager's Name],

I hope you are doing well. I am writing to inform you that I am currently unwell and will not be able to attend work today. I would like to request sick leave for [date].

I will keep you updated on my condition and let you know if I need additional time to recover. In the meantime, I will ensure that any urgent tasks are managed as best as possible.

Thank you for your understanding.

Sincerely,
[Your Name]
\`\`\`

---

## Images

Here's a sample architecture diagram:

![System architecture overview](https://picsum.photos/seed/arch/800/420)

You can click any image to view it full-size and download it.

---

## Video & Audio

Sample media files from the backend (click to play directly):

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

Inline code: call \`crypto.randomUUID()\` to generate a unique ID.


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

### 1. Data Visualization

Here is the projected growth of the project over the next two quarters:

\`\`\`chart
{
  "type": "line",
  "title": "Revenue Growth (Q1-Q2)",
  "items": [
    {"name": "Jan", "value": 4000},
    {"name": "Feb", "value": 3000},
    {"name": "Mar", "value": 5000},
    {"name": "Apr", "value": 4500},
    {"name": "May", "value": 6000},
    {"name": "Jun", "value": 8500}
  ]
}
\`\`\`

And the market share distribution:

\`\`\`chart
{
  "type": "pie",
  "title": "Market Share",
  "items": [
    {"name": "Eryx AI", "value": 45},
    {"name": "Competitor A", "value": 25},
    {"name": "Competitor B", "value": 20},
    {"name": "Others", "value": 10}
  ]
}
\`\`\`

### 2. Mathematical Notation

The core algorithm is based on the following relationship:

$$
E = mc^2 + \int_{a}^{b} f(x) dx
$$

You can also include inline math like $\sqrt{x^2 + y^2} = r$ within your technical explanations.

### 3. Geographical Context

The main research hub is located here:

\`\`\`map
Silicon Valley, California, USA
\`\`\`

### 4. Complex Structures

- **Project Milestones**
  - **Phase 1: Foundation**
    - [x] Initial design system
    - [x] Core authentication
    - [ ] Database migration
  - **Phase 2: Visualization**
    - [x] Add chart support
    - [x] Integrate KaTeX math
- **Technical Requirements**
  1. **Performance**: Must load in < 200ms
  2. **Scalability**: Support 10k concurrent users

## Advanced Callouts & Footnotes

> [!NOTE]
> This is a professional note about the system architecture. It uses the new GitHub-style alert syntax supported by our enhanced \`AiResponseFormatter\` [^1].

> [!TIP]
> You can now use \`> [!TIP]\` to provide helpful suggestions to users with a distinct emerald theme.

> [!WARNING]
> Critical warnings like this one use the amber theme and a triangle icon to grab immediate attention.

## Conclusion

Our new response formatting system is now enterprise-grade, supporting everything from \`inline snapshots\` to academic citations, interactive charts, and real-time geographical markers.

[^1]: Scientific references and citations are now styled with superscript markers and a dedicated reference section at the bottom.
`;
