# Eryx

AI-powered chat application with real-time streaming, MCP tool integration, and multi-container deployment support.

![Chat Interface](public/ss/chat.png)

---

## Features

- **AI Chat** - Streaming responses with resume support across reconnections
- **Real-Time Sync** - SSE-based live updates across all devices
- **MCP Tools** - Model Context Protocol integration for extensible AI capabilities
- **Context Aware** - RAG-powered context retrieval and conversation summarization
- **Push Notifications** - Web push alerts for new messages when away
- **Credit System** - Token-based usage tracking and billing
- **Project Context** - Attach project files and knowledge to chats

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (ioredis)
- **AI**: Vercel AI SDK with OpenAI compatibility
- **Queue**: BullMQ for async job processing
- **Styling**: Tailwind CSS

---

## Preview

| Chat | Search | Memory |
|------|--------|--------|
| ![Chat](public/ss/chat.png) | ![Search](public/ss/search.png) | ![Memory](public/ss/memory.png) |

| Customize | Apps | Pricing |
|----------|-------|---------|
| ![Customize](public/ss/customize.png) | ![Apps](public/ss/apps.png) | ![Pricing](public/ss/pricing.png) |

| Account | Settings | Feedback |
|---------|----------|----------|
| ![Account](public/ss/account.png) | ![Settings](public/ss/settings.png) | ![Feedback](public/ss/feedback.png) |

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npx prisma db push

# Start development server
npm run dev
```

---

## Project Structure

```
├── app/api/           # API routes (chat, files, MCP, payments, etc.)
├── components/        # React components
├── contexts/          # React context providers
├── hooks/             # Custom React hooks
├── lib/               # Utilities, config, AI providers, Redis
├── services/          # Business logic (stream, credit, queue, etc.)
├── docs/              # Detailed documentation
└── prisma/            # Database schema
```

---

## Key Features Overview

### Resumable Streams
AI responses stream in real-time and can be resumed if the connection drops. Tracks active streams across multiple containers via Redis.

### MCP Integration
Connect MCP servers to extend AI capabilities. Supports bearer auth, header auth, and OAuth. Elicitation (tool input requests) are handled via a real-time provider.

### Real-Time Updates
Server-Sent Events (SSE) push chat updates, sidebar changes, and notifications to all connected clients without polling.

### Credit System
Usage-based credits with partial refunds for interrupted streams. Plan tiers with different limits and features.

---

## Documentation

- [Authentication](docs/01-authentication.md)
- [Middleware & Security](docs/02-middleware-security.md)
- [Redis Patterns](docs/03-redis.md)
- [Payments & Billing](docs/04-payments.md)
- [AI System](docs/05-ai-system.md)
- [Web Search](docs/06-web-search.md)
- [Database Schema](docs/07-database.md)
- [Services Architecture](docs/08-services.md)
- [API Routes](docs/09-api-routes.md)
- [Optimizations](docs/10-optimizations.md)
- [Real-Time Sync](docs/11-realtime-sync.md)
- [i18n](docs/12-i18n.md)
- [Resumable Streaming](docs/13-resumable-stream.md)
- [MCP Apps](docs/14-mcp-apps.md)