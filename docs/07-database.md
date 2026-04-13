# Database Schema

## Overview

The project uses **PostgreSQL** with **Prisma ORM**. The database stores all user data, chats, messages, files, subscriptions, and settings.

## Schema Architecture

### Core Models

```
User
├── Chat (one-to-many)
├── Project (one-to-many)
├── Settings (one-to-one)
├── Customize (one-to-one)
├── Memory (one-to-many)
├── Notification (one-to-many)
├── Subscription (one-to-one)
├── Plan (many-to-one via userPlan)
└── Feedback, Report, etc.

Chat
├── Message (one-to-many)
├── ChatFile (many-to-many with File)
└── Chat branches (self-relation)

File
├── ProjectFile (many-to-many with Project)
├── ChatFile (many-to-many with Chat)
└── MessageFile (many-to-many with Message)
```

## User Model

Central to the system - represents authenticated users.

```prisma
model User {
  id        String   @id @default(uuid())
  stackId   String   @unique  // Stack Auth identifier
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Account status
  seenOnboarding Boolean   @default(false)
  isActive       Boolean   @default(true)  // Can be deactivated

  // Role for authorization
  role      Role       @default(USER)  // USER, MODERATOR, ADMIN

  // SaaS Subscription
  plan          String    @default("free") // DEPRECATED
  planTier      PlanTier  @default(FREE)   // FREE, BASIC, PRO, ENTERPRISE
  planId        String?                       // References Plan.id
  credits       Int       @default(25)        // Current credit balance
  maxChats      Int       @default(100)
  maxProjects   Int       @default(2)
  maxMessages   Int       @default(100)
  features      String[]  @default([])

  // Relations
  subscription  Subscription?
  userPlan      Plan?      @relation("UserPlan", fields: [planId], references: [id], onDelete: SetNull)

  @@index([stackId])
  @@index([role])
  @@index([planTier])
}
```

### PlanTier Enum

```prisma
enum PlanTier {
  FREE      // $0, 25 credits, basic limits
  BASIC     // $4.99/mo, 200 credits, moderate limits
  PRO       // $14.99/mo, 1000 credits, high limits
  ENTERPRISE // $49.99/mo, 5000 credits, unlimited
}
```

## Chat Model

Represents a conversation session.

```prisma
model Chat {
  id        String   @id @default(cuid())
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  archivedAt DateTime?  // Soft delete
  pinnedAt   DateTime?  // Pin to top

  projectId String?
  project   Project?   @relation(fields: [projectId], references: [id], onDelete: SetNull)
  userId    String?
  user      User?     @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Branching support
  parentChatId String?
  parentChat   Chat?    @relation("ChatBranches", fields: [parentChatId], references: [id], onDelete: SetNull)
  branches     Chat[]   @relation("ChatBranches")

  // Sharing
  visibility     String    @default("private")  // "private" | "public"
  shareToken     String?   @unique @default(cuid())
  shareExpiry    DateTime?
  sharePassword  String?

  messages  Message[]
  chatFiles ChatFile[]

  // Chat summary for long conversations (hierarchical context)
  summary ChatSummary?

  @@index([projectId])
  @@index([userId])
  @@index([archivedAt])
  @@index([pinnedAt])
  @@index([userId, updatedAt])
  @@index([shareToken])
  @@index([parentChatId])
}
```

## Message Model

Individual messages within a chat.

```prisma
model Message {
  id        String   @id @default(cuid())
  chatId    String
  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)

  sender String      // "user", "ai", "assistant"
  role   SENDER? @default(user)

  content String
  type    String  @default("text")

  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  // Threading support
  parentId String?
  parent   Message?  @relation("MessageThread", fields: [parentId], references: [id], onDelete: SetNull)
  replies Message[] @relation("MessageThread")

  messageFiles MessageFile[]

  @@index([chatId])
  @@index([parentId])
}
```

## ChatSummary Model

LLM-generated summary for long conversations, enabling hierarchical context management.

```prisma
model ChatSummary {
  id        String @id @default(cuid())
  chatId    String @unique  // One summary per chat

  // LLM-generated summary
  summary   String @db.Text

  // Structured extraction for precise retrieval
  topics    String[] @default([]) // ["authentication", "payments"]
  keyFacts  String[] @default([]) // ["import prisma from '@/lib/prisma'"]

  // Message range this summary covers
  startMessageId String  // First message included
  endMessageId   String  // Last message included
  messageCount   Int     // How many messages summarized

  // For branched conversations
  parentSummaryId String?
  parent         ChatSummary?  @relation("SummaryBranches", fields: [parentSummaryId], references: [id], onDelete: SetNull)
  branches       ChatSummary[] @relation("SummaryBranches")

  // Metadata
  tokenCount Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  chat   Chat   @relation(fields: [chatId], references: [id], onDelete: Cascade)

  @@index([chatId])
  @@index([parentSummaryId])
}
```

## SENDER Enum

```prisma
enum SENDER {
  user       // User's messages
  ai         // AI responses
  assistant  // Assistant responses
}
```

## File Model

Uploaded files stored in S3.

```prisma
enum FileStatus {
  PENDING_UPLOAD  // Upload not started
  PROCESSING      // Upload in progress or processing
  READY            // Available for use
  FAILED           // Upload or processing failed
}

model File {
  id        String @id @default(cuid())
  name      String
  url       String
  type      String

  // S3 storage details
  s3Key     String?
  s3Bucket  String?
  uploadId  String?  // S3 multipart upload ID

  // Extracted content for AI
  extractedContent String?  // Full text extracted from file
  contentPreview   String?  // First 500 chars
  tokenCount      Int?      // Estimated tokens

  status FileStatus @default(PENDING_UPLOAD)

  createdAt DateTime @default(now())

  projectId String?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Junction tables for many-to-many
  projectFiles ProjectFile[]
  chatFiles    ChatFile[]
  messageFiles MessageFile[]

  @@index([type])
  @@index([projectId])
  @@index([status])
}
```

## Project Model

Organizational unit for grouping chats.

```prisma
model Project {
  id          String @id @default(cuid())
  name        String @unique
  description String

  instruction String?  // Custom instructions for AI in this project

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  archivedAt DateTime?
  pinnedAt   DateTime?

  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  chats        Chat[]
  projectFiles ProjectFile[]
  files        File[]         // Direct relation for context files

  @@index([userId])
  @@index([archivedAt])
  @@index([pinnedAt])
  @@index([name])
}
```

## Plan Model

Subscription plans with limits and features.

```prisma
model Plan {
  id            String    @id  // "free", "basic", "pro", "enterprise"
  tier          PlanTier  @unique

  name          String
  description   String    @db.Text

  price         Int       @default(0)  // In cents (0 = free)

  // Stripe integration
  stripePriceId   String?   @unique
  stripeProductId String?

  // Limits
  credits       Int       @default(25)
  maxChats      Int       @default(100)   // -1 = unlimited
  maxProjects   Int       @default(2)
  maxMessages   Int       @default(100)   // -1 = unlimited

  // Feature-specific limits
  maxMemoryItems      Int      @default(0)    // 0 = not allowed, -1 = unlimited
  maxBranchesPerChat  Int      @default(0)    // Branches per chat
  maxFolders          Int      @default(0)    // Folders
  maxAttachmentsPerChat Int    @default(0)    // Files per chat
  maxFileSizeMb       Int      @default(0)    // Max file size

  // Feature flags
  canExport     Boolean   @default(false)
  canApiAccess  Boolean   @default(false)

  features      String[]  @default([])  // "basic-chat", "longer-memory", etc.

  // Scalability
  metadata      Json?
  sortOrder     Int       @default(0)    // For admin ordering

  // Status
  isActive      Boolean   @default(true)
  isVisible     Boolean   @default(true)  // Hide from pricing but keep for existing
  isDefault     Boolean   @default(false)  // Default for new users

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  users         User[]    @relation("UserPlan")
  subscriptions Subscription[]

  @@index([tier])
  @@index([isActive, isVisible])
}
```

## Subscription Model

Stripe subscription records.

```prisma
enum SubscriptionStatus {
  ACTIVE     // Good standing
  CANCELED   // Cancelled by user
  PAST_DUE   // Payment failed
  TRIALING   // In trial period
  UNPAID     // Payment overdue
}

model Subscription {
  id            String    @id @default(cuid())

  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  planId        String
  plan          Plan      @relation(fields: [planId], references: [id], onDelete: Restrict)

  stripeSubId     String?   @unique  // Stripe subscription ID
  stripeCustomerId String?          // Stripe customer ID

  status        SubscriptionStatus @default(ACTIVE)

  currentPeriodStart DateTime  @default(now())
  currentPeriodEnd   DateTime           // Subscription end date
  cancelAtPeriodEnd Boolean   @default(false)
  canceledAt         DateTime?

  // Legacy support
  legacyPlanId   String?

  metadata      Json?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId])
  @@index([status])
  @@index([stripeCustomerId])
  @@index([currentPeriodEnd])
}
```

## Settings Model

User preferences and settings.

```prisma
model Settings {
  id            String  @id @default(cuid())
  userId        String  @unique
  user          User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Display
  theme         String  @default("system")   // "light", "dark", "system"
  language      String  @default("en")

  // Chat behavior
  autoTitle     Boolean @default(true)      // Auto-generate chat titles
  enterToSend   Boolean @default(false)      // Enter to send vs button
  showSuggestions Boolean @default(true)    // Show AI suggestions
  compactMode   Boolean @default(false)      // Compact UI
  reducedMotion Boolean @default(false)     // Reduce animations

  // AI behavior
  streaming     Boolean @default(true)       // Stream AI responses
  codeHighlight Boolean @default(true)       // Syntax highlighting
  persistentMemory Boolean @default(false)  // Remember context across chats

  // Notifications
  emailUpdates  Boolean @default(true)
  emailMarketing Boolean @default(false)
  browserNotifs Boolean @default(false)
  usageAlerts   Boolean @default(true)

  // Privacy
  analytics     Boolean @default(true)
  usageData     Boolean @default(false)
  crashReports  Boolean @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Memory Model

User's persistent memory items for AI context.

```prisma
model Memory {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  title     String
  content   String
  tags      String[]
  category  String?
  metadata  Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([userId, category])
  @@index([createdAt])
}
```

## Notification Model

User notifications.

```prisma
model Notification {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  title       String
  description String
  read        Boolean   @default(false)
  archived    Boolean   @default(false)
  snoozedUntil DateTime?
  accent      String    @default("bg-blue-400")  // CSS color class

  createdAt   DateTime  @default(now())

  @@index([userId])
  @@index([userId, read, archived])
}
```

## NotificationPrefs Model

User notification preferences.

```prisma
model NotificationPrefs {
  id               String   @id @default(cuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  newFeature       Boolean  @default(true)
  credits          Boolean  @default(true)
  system           Boolean  @default(false)
  tips             Boolean  @default(true)
  security         Boolean  @default(true)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([userId])
}
```

## Customize Model

User customization preferences.

```prisma
enum KnowledgeDetail {
  CONCISE    // Brief answers
  BALANCED   // Medium detail
  DETAILED   // Comprehensive answers
}

model Customize {
  id              String          @id @default(cuid())
  userId          String          @unique
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  firstName       String          @default("")
  lastName        String          @default("")
  name            String          @default("")
  interest        String[]        // Topics user is interested in
  responseTone    String          // "balanced", "formal", "casual", etc.
  knowledgeDetail KnowledgeDetail @default(BALANCED)

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}
```

## Indexes Summary

| Model | Indexes |
|-------|---------|
| User | stackId, role, planTier |
| Chat | userId, projectId, archivedAt, pinnedAt, userId+updatedAt, shareToken, parentChatId |
| Message | chatId, parentId |
| File | type, projectId, status |
| Project | userId, archivedAt, pinnedAt, name |
| Subscription | userId, status, stripeCustomerId, currentPeriodEnd |
| Plan | tier, isActive+isVisible |
| Memory | userId, userId+category, createdAt |
| Notification | userId, userId+read+archived |

## Junction Tables

Junction tables implement many-to-many relationships:

```prisma
// Project <-> File
model ProjectFile {
  projectId String
  fileId    String
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  file    File    @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@id([projectId, fileId])
}

// Chat <-> File
model ChatFile {
  chatId String
  fileId String
  chat Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  file File @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@id([chatId, fileId])
}

// Message <-> File
model MessageFile {
  messageId String
  fileId    String
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  file    File    @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@id([messageId, fileId])
}
```

## Cascading Deletes

When a parent is deleted:
- `Chat` → Messages are deleted (Cascade)
- `User` → Chats, Projects, Settings, Notifications, etc. are deleted (Cascade)
- `Project` → Files are deleted (Cascade)
- `Message` → MessageFiles are deleted (Cascade)

Other relations use `SetNull` (e.g., chat.projectId becomes null when project is deleted).