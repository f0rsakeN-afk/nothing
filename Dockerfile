# syntax=docker/dockerfile:1

# ============================================================
# Stage 1: Dependencies
# ============================================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat python3 make g++ curl

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --ignore-scripts

# ============================================================
# Stage 2: Builder
# ============================================================
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++ curl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# ============================================================
# Stage 3: Workers
# ============================================================
FROM node:20-alpine AS worker

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services ./services
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/src ./src
COPY prisma ./prisma

# Generate Prisma client for workers
RUN npx prisma generate

USER node

CMD ["bun", "run", "services/workers.ts"]

# ============================================================
# Stage 4: Runner - Minimal production image
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
