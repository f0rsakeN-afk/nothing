export const STATIC_RESPONSE = `
## Overview

Here's a comprehensive showcase of every supported response format.

---

## 1. Email Template

\`\`\`email
Subject: Sick Leave Request — [Your Name]

Dear [Manager's Name],

I hope you are doing well. I am writing to inform you that I am currently unwell and will not be able to attend work today. I would like to request sick leave for [date].

Thank you for your understanding.

Sincerely,
[Your Name]
\`\`\`

---

## 2. Timeline

\`\`\`timeline
{
  "title": "Product Roadmap",
  "items": [
    { "title": "Project Kickoff", "description": "Initial planning, team onboarding, and design system setup.", "date": "Jan 2024", "status": "done" },
    { "title": "Alpha Release", "description": "Core chat UI, authentication, and basic AI integration.", "date": "Mar 2024", "status": "done" },
    { "title": "Beta Launch", "description": "Public beta with formatting engine and media support.", "date": "Jun 2024", "status": "active" },
    { "title": "v1.0 GA", "description": "Full production release with billing and teams.", "date": "Q4 2024", "status": "upcoming" },
    { "title": "Mobile Apps", "description": "iOS and Android clients.", "date": "2025", "status": "upcoming" }
  ]
}
\`\`\`

---

## 3. Comparison

\`\`\`comparison
{
  "title": "Frontend Frameworks",
  "items": [
    {
      "name": "Next.js",
      "badge": "Recommended",
      "description": "Full-stack React framework with SSR, SSG, and edge support.",
      "features": ["App Router & RSC", "Built-in optimizations", "Edge & serverless ready"],
      "highlight": true
    },
    {
      "name": "Remix",
      "description": "Web standards-first React framework focused on progressive enhancement.",
      "features": ["Nested routing", "Progressive enhancement", "Great data loading"]
    },
    {
      "name": "Vite + React",
      "description": "Minimal SPA setup with lightning-fast HMR.",
      "features": ["Blazing fast HMR", "Zero opinions", "Great for SPAs"]
    }
  ]
}
\`\`\`

---

## 4. Terminal Output

\`\`\`terminal
$ bun install
bun install v1.1.0
 + next@16.2.1
 + react@19.2.4
 + tailwindcss@4.0.0
106 packages installed [3.2s]

$ bun run build
> next build

   ▲ Next.js 16.2.1
   Creating an optimized production build...

✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages (12/12)

Route (app)               Size     First Load JS
┌ ○ /                     4.2 kB         102 kB
├ ○ /home                 6.8 kB         108 kB
└ ƒ /chat/[id]            9.1 kB         112 kB

✓ Build complete in 18.4s
\`\`\`

---

## 5. Metrics

\`\`\`metric
{
  "title": "Dashboard Overview",
  "items": [
    { "label": "Monthly Revenue", "value": "$48.2K", "trend": "+12.4% vs last month", "up": true },
    { "label": "Active Users", "value": "24.5K", "trend": "+8.1%", "up": true },
    { "label": "Churn Rate", "value": "2.1%", "trend": "-0.4%", "up": false, "description": "Lower is better" },
    { "label": "Avg Session", "value": "6m 32s", "trend": "+18s", "up": true }
  ]
}
\`\`\`

---

## 6. Kanban Board

\`\`\`kanban
{
  "title": "Sprint 14",
  "columns": [
    {
      "title": "To Do",
      "items": ["Design system audit", "Write integration tests", "Update onboarding flow"]
    },
    {
      "title": "In Progress",
      "items": ["Auth middleware refactor", "Dashboard chart components"]
    },
    {
      "title": "Done",
      "items": ["CI/CD pipeline setup", "Project scaffolding", "Dark mode support"]
    }
  ]
}
\`\`\`

---

## 7. Mermaid Diagram

\`\`\`mermaid
graph TD
  A[User] -->|HTTP Request| B[API Gateway]
  B --> C{Auth Service}
  C -->|Valid Token| D[Chat Service]
  C -->|Invalid| E[401 Unauthorized]
  D --> F[(Vector DB)]
  D --> G[LLM API]
  G -->|Stream| H[SSE Response]
  H -->|Rendered| A
\`\`\`

---

## 8. Flashcards

\`\`\`flashcard
{
  "title": "React Concepts",
  "cards": [
    {
      "front": "What is the difference between useMemo and useCallback?",
      "back": "useMemo memoizes a computed value; useCallback memoizes a function reference. Both prevent unnecessary recalculations on re-renders."
    },
    {
      "front": "When does React bail out of rendering a child?",
      "back": "When wrapped in React.memo and props are shallowly equal, or when a state update produces the same value as the current state."
    },
    {
      "front": "What is the purpose of the key prop in lists?",
      "back": "It gives React a stable identity for each element so it can efficiently diff, reorder, and reconcile list items without recreating DOM nodes."
    }
  ]
}
\`\`\`

---

## 9. Poll

\`\`\`poll
{
  "question": "Which AI assistant do you use most at work?",
  "options": [
    { "label": "ChatGPT", "votes": 1840 },
    { "label": "Claude", "votes": 1320 },
    { "label": "Gemini", "votes": 740 },
    { "label": "Copilot", "votes": 620 },
    { "label": "Other", "votes": 280 }
  ]
}
\`\`\`

---

## 10. File Tree

\`\`\`file-tree
frontend/
  app/
    (main)/
      home/
        page.tsx
      chat/
        [id]/
          page.tsx
    layout.tsx
  components/
    main/
      chat/
        ai-response-formatter.tsx
        format/
          code-block.tsx
          chart-visualizer.tsx
          timeline.tsx
          mermaid.tsx
    ui/
      button.tsx
      sidebar.tsx
  lib/
    utils.ts
  package.json
  tailwind.config.ts
\`\`\`

---

## 11. Persona Card

\`\`\`persona
{
  "name": "Priya Nair",
  "role": "Lead Frontend Engineer · 7 years experience",
  "avatar": "PN",
  "bio": "Obsessed with design systems, performance budgets, and shipping fast. Believes every millisecond of TTI is a moral failing.",
  "tags": ["React", "TypeScript", "Design Systems", "a11y"],
  "traits": [
    { "label": "Technical depth", "value": 92 },
    { "label": "Design sensitivity", "value": 85 },
    { "label": "Process maturity", "value": 74 },
    { "label": "Mentorship", "value": 88 }
  ]
}
\`\`\`

---

## 12. Diff Viewer

\`\`\`diff
--- a/lib/utils.ts
+++ b/lib/utils.ts
@@ -1,6 +1,8 @@
 import { clsx } from 'clsx'
-import { twMerge } from 'tailwind-merge'
+import { twMerge, type ClassValue } from 'tailwind-merge'

-export function cn(...inputs: any[]) {
+export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs))
 }
+
+export const noop = () => {}
\`\`\`

---

## 13. Charts

\`\`\`chart
{
  "type": "bar",
  "title": "Weekly Active Users",
  "items": [
    { "name": "Mon", "value": 3200 },
    { "name": "Tue", "value": 4100 },
    { "name": "Wed", "value": 3800 },
    { "name": "Thu", "value": 5200 },
    { "name": "Fri", "value": 4700 },
    { "name": "Sat", "value": 2100 },
    { "name": "Sun", "value": 1800 }
  ]
}
\`\`\`

---

## 14. Math

$$
\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

Inline: the complexity is $O(n \\log n)$.

---

## 15. Callouts

> [!NOTE]
> All visualizations lazy-load their dependencies — Recharts and Mermaid are never in the initial bundle.

> [!TIP]
> Use \`\`\`mermaid for flowcharts, sequence diagrams, ER diagrams, and Gantt charts natively.

> [!WARNING]
> The \`diff\` parser expects unified diff format. Output from \`git diff\` works out of the box.

---

## 16. Code

\`\`\`typescript
async function streamChat(prompt: string) {
  const res = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  for await (const chunk of readChunks(reader)) {
    process(decoder.decode(chunk));
  }
}
\`\`\`

---

## 17. System Design

\`\`\`system-design
{
  "title": "URL Shortener — Distributed Architecture",
  "description": "Handles 10B+ redirects/day with sub-10ms p99 latency",
  "nodes": [
    { "id": "client",    "type": "client",       "label": "Browser / App",      "x": 0,    "y": 180 },
    { "id": "dns",       "type": "cdn",           "label": "DNS + CDN",          "description": "Global edge routing", "x": 240,  "y": 40  },
    { "id": "lb",        "type": "loadbalancer",  "label": "Load Balancer",      "x": 240,  "y": 180 },
    { "id": "api",       "type": "apigateway",    "label": "API Gateway",        "description": "Auth, rate limiting", "x": 480,  "y": 180 },
    { "id": "shortener", "type": "service",       "label": "Shortener Service",  "description": "Encodes long URLs",   "x": 720,  "y": 60  },
    { "id": "redirect",  "type": "service",       "label": "Redirect Service",   "description": "302 → destination",  "x": 720,  "y": 300 },
    { "id": "cache",     "type": "cache",         "label": "Redis Cluster",      "description": "Hot URLs, 1h TTL",   "x": 960,  "y": 60  },
    { "id": "db",        "type": "database",      "label": "Cassandra",          "description": "URL mappings",       "x": 960,  "y": 220 },
    { "id": "kafka",     "type": "queue",         "label": "Kafka",              "description": "Click event stream", "x": 960,  "y": 380 },
    { "id": "worker",    "type": "worker",        "label": "Analytics Worker",   "x": 1200, "y": 380 },
    { "id": "storage",   "type": "storage",       "label": "S3 / Analytics DB",  "x": 1200, "y": 500 }
  ],
  "edges": [
    { "source": "client",    "target": "dns",       "label": "Static assets" },
    { "source": "client",    "target": "lb",        "label": "HTTPS" },
    { "source": "lb",        "target": "api" },
    { "source": "api",       "target": "shortener", "label": "POST /shorten" },
    { "source": "api",       "target": "redirect",  "label": "GET /:code" },
    { "source": "shortener", "target": "db",        "label": "Write" },
    { "source": "redirect",  "target": "cache",     "label": "Cache hit", "animated": true },
    { "source": "redirect",  "target": "db",        "label": "Cache miss" },
    { "source": "redirect",  "target": "kafka",     "label": "Click event", "animated": true },
    { "source": "kafka",     "target": "worker",    "animated": true },
    { "source": "worker",    "target": "storage",   "label": "Aggregate" }
  ]
}
\`\`\`

---

## 18. Steps

\`\`\`steps
{
  "title": "Deploy a Next.js App to Production",
  "steps": [
    {
      "title": "Install dependencies",
      "description": "Make sure all packages are up to date before building.",
      "code": "bun install"
    },
    {
      "title": "Run tests",
      "description": "All unit and integration tests must pass before proceeding.",
      "code": "bun test"
    },
    {
      "title": "Build for production",
      "description": "Creates an optimized build in the .next directory.",
      "code": "bun run build"
    },
    {
      "title": "Set environment variables",
      "description": "Configure DATABASE_URL, NEXTAUTH_SECRET, and any third-party API keys in your hosting dashboard."
    },
    {
      "title": "Deploy",
      "description": "Push to your main branch or trigger a manual deploy from the dashboard.",
      "code": "git push origin main"
    }
  ]
}
\`\`\`

---

## 19. Status

\`\`\`status
{
  "title": "Eryx Platform",
  "overall": "degraded",
  "updated": "3 minutes ago",
  "services": [
    { "name": "API Gateway",      "status": "operational" },
    { "name": "Authentication",   "status": "operational" },
    { "name": "Chat Service",     "status": "degraded",    "note": "Elevated response times" },
    { "name": "Vector Search",    "status": "degraded",    "note": "P99 latency +320ms" },
    { "name": "File Storage",     "status": "operational" },
    { "name": "Billing",          "status": "maintenance", "note": "Scheduled until 03:00 UTC" },
    { "name": "Web App (CDN)",    "status": "operational" }
  ]
}
\`\`\`

---

## 20. Checklist

\`\`\`checklist
{
  "title": "Production Launch Checklist",
  "items": [
    { "label": "Set up CI/CD pipeline",            "status": "done" },
    { "label": "Configure environment variables",  "status": "done" },
    { "label": "Enable rate limiting on API",      "status": "done" },
    { "label": "Write integration tests",          "status": "in-progress" },
    { "label": "Security & dependency audit",      "status": "in-progress" },
    { "label": "Load testing (10k concurrent)",    "status": "pending" },
    { "label": "Set up error monitoring",          "status": "pending" },
    { "label": "DNS cutover",                      "status": "blocked", "note": "Waiting on domain transfer approval" }
  ]
}
\`\`\`

---

## 21. Command Reference

\`\`\`command
{
  "title": "VS Code Shortcuts",
  "sections": [
    {
      "label": "Navigation",
      "items": [
        { "keys": ["Cmd", "P"],       "description": "Quick open file" },
        { "keys": ["Cmd", "Shift", "P"], "description": "Command palette" },
        { "keys": ["Cmd", "B"],       "description": "Toggle sidebar" },
        { "keys": ["Ctrl", "Tab"],    "description": "Cycle open editors" }
      ]
    },
    {
      "label": "Editing",
      "items": [
        { "keys": ["Cmd", "D"],       "description": "Select next occurrence" },
        { "keys": ["Opt", "↑"],       "description": "Move line up" },
        { "keys": ["Cmd", "Shift", "K"], "description": "Delete line" },
        { "keys": ["Cmd", "/"],       "description": "Toggle line comment" }
      ]
    },
    {
      "label": "Terminal",
      "items": [
        { "keys": ["Ctrl", "\`"],      "description": "Toggle integrated terminal" },
        { "keys": ["Cmd", "Shift", "5"], "description": "Split terminal" }
      ]
    }
  ]
}
\`\`\`

---

## 22. Changelog

\`\`\`changelog
{
  "title": "Eryx Release Notes",
  "versions": [
    {
      "version": "2.4.0",
      "date": "Apr 1, 2026",
      "tag": "latest",
      "changes": [
        { "type": "added",    "text": "System design canvas with split-view mode" },
        { "type": "added",    "text": "5 new response formats: steps, status, checklist, command, changelog" },
        { "type": "improved", "text": "File tree now renders with proper connected guide lines" },
        { "type": "improved", "text": "Callout blocks have per-type accent colors and backgrounds" },
        { "type": "fixed",    "text": "Split panel no longer overlaps header action buttons" }
      ]
    },
    {
      "version": "2.3.0",
      "date": "Mar 18, 2026",
      "tag": "stable",
      "changes": [
        { "type": "added",    "text": "Real-time web search with cited sources" },
        { "type": "added",    "text": "PDF and document upload support" },
        { "type": "improved", "text": "Streaming latency reduced by 40%" },
        { "type": "fixed",    "text": "LaTeX rendering on mobile viewports" },
        { "type": "security", "text": "Rotated signing keys for session tokens" }
      ]
    },
    {
      "version": "2.0.0",
      "date": "Jan 5, 2026",
      "changes": [
        { "type": "breaking",   "text": "API routes moved from /api/v1 to /api/v2" },
        { "type": "added",      "text": "Complete UI redesign with dark mode first" },
        { "type": "deprecated", "text": "Legacy /api/v1 endpoints — will be removed in v3" },
        { "type": "removed",    "text": "Flash message system replaced by toast notifications" }
      ]
    }
  ]
}
\`\`\`

---

## 23. System Design (Complex Flow)

\`\`\`system-design
{
  "title": "AI-Powered E-Commerce Platform",
  "description": "Multi-region, event-driven with real-time recommendations and full observability",
  "nodes": [
    { "id": "web",        "type": "web",          "label": "Web App",            "description": "Next.js / SSR",              "x": 0,    "y": 100 },
    { "id": "mobile",     "type": "mobile",       "label": "Mobile App",         "description": "iOS & Android",              "x": 0,    "y": 300 },
    { "id": "cdn",        "type": "cdn",          "label": "CDN",                "description": "CloudFront edge",            "x": 250,  "y": 0   },
    { "id": "lb",         "type": "loadbalancer", "label": "Load Balancer",      "description": "L7, health checks",          "x": 250,  "y": 200 },
    { "id": "gateway",    "type": "apigateway",   "label": "API Gateway",        "description": "Auth, rate limit, routing",  "x": 500,  "y": 200 },
    { "id": "auth",       "type": "auth",         "label": "Auth Service",       "description": "JWT + OAuth2",               "x": 750,  "y": 40  },
    { "id": "products",   "type": "service",      "label": "Product Service",    "description": "Catalog & inventory",        "x": 750,  "y": 160 },
    { "id": "orders",     "type": "service",      "label": "Order Service",      "description": "Checkout & fulfillment",     "x": 750,  "y": 280 },
    { "id": "payments",   "type": "payment",      "label": "Payment Service",    "description": "Stripe, fraud detection",    "x": 750,  "y": 400 },
    { "id": "notify",     "type": "notification", "label": "Notify Service",     "description": "Email, SMS, push",           "x": 750,  "y": 520 },
    { "id": "redis",      "type": "redis",        "label": "Redis Cluster",      "description": "Sessions + hot cache",       "x": 1000, "y": 40  },
    { "id": "postgres",   "type": "postgresql",   "label": "PostgreSQL",         "description": "Orders, users, inventory",   "x": 1000, "y": 200 },
    { "id": "kafka",      "type": "kafka",        "label": "Kafka",              "description": "Event backbone",             "x": 1000, "y": 380 },
    { "id": "s3",         "type": "s3",           "label": "S3",                 "description": "Media, receipts, exports",   "x": 1000, "y": 540 },
    { "id": "recommender","type": "llm",          "label": "Recommender",        "description": "Collab filtering + LLM",     "x": 1250, "y": 80  },
    { "id": "search",     "type": "elasticsearch","label": "Elasticsearch",      "description": "Full-text product search",   "x": 1250, "y": 260 },
    { "id": "worker",     "type": "worker",       "label": "Event Worker",       "description": "Async job processor",        "x": 1250, "y": 440 },
    { "id": "dw",         "type": "datawarehouse","label": "Data Warehouse",     "description": "BigQuery analytics",         "x": 1500, "y": 260 },
    { "id": "monitoring", "type": "grafana",      "label": "Grafana",            "description": "Dashboards & alerting",      "x": 1500, "y": 440 }
  ],
  "edges": [
    { "source": "web",        "target": "cdn",        "label": "Assets" },
    { "source": "web",        "target": "lb",         "label": "HTTPS" },
    { "source": "mobile",     "target": "lb",         "label": "HTTPS" },
    { "source": "lb",         "target": "gateway" },
    { "source": "gateway",    "target": "auth",       "label": "Verify JWT",     "animated": true },
    { "source": "gateway",    "target": "products",   "label": "GET /products" },
    { "source": "gateway",    "target": "orders",     "label": "POST /orders" },
    { "source": "gateway",    "target": "payments",   "label": "POST /pay" },
    { "source": "auth",       "target": "redis",      "label": "Session",        "animated": true },
    { "source": "products",   "target": "redis",      "label": "Cache",          "animated": true },
    { "source": "products",   "target": "postgres",   "label": "Read/Write" },
    { "source": "products",   "target": "search",     "label": "Index sync" },
    { "source": "orders",     "target": "postgres",   "label": "Write" },
    { "source": "orders",     "target": "kafka",      "label": "order.placed",   "animated": true },
    { "source": "payments",   "target": "kafka",      "label": "payment.done",   "animated": true },
    { "source": "payments",   "target": "postgres",   "label": "Write" },
    { "source": "kafka",      "target": "worker",     "label": "Consume",        "animated": true },
    { "source": "kafka",      "target": "recommender","label": "User events",    "animated": true },
    { "source": "recommender","target": "redis",      "label": "Cache recs" },
    { "source": "worker",     "target": "notify",     "label": "Trigger",        "animated": true },
    { "source": "worker",     "target": "dw",         "label": "Aggregate" },
    { "source": "worker",     "target": "s3",         "label": "Receipts" },
    { "source": "monitoring", "target": "postgres",   "label": "Metrics" }
  ]
}
\`\`\`
`;
