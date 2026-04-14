-- CreateTable
CREATE TABLE "ChatSummary" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "summary" TEXT NOT NULL,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyFacts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startMessageId" TEXT NOT NULL,
    "endMessageId" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "parentSummaryId" TEXT,
    "tokenCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatSummary_chatId_key" ON "ChatSummary"("chatId");

-- CreateIndex
CREATE INDEX "ChatSummary_chatId_idx" ON "ChatSummary"("chatId");

-- CreateIndex
CREATE INDEX "ChatSummary_parentSummaryId_idx" ON "ChatSummary"("parentSummaryId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- CreateIndex
CREATE INDEX "Chat_userId_archivedAt_idx" ON "Chat"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "File_projectId_status_idx" ON "File"("projectId", "status");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatSummary" ADD CONSTRAINT "ChatSummary_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSummary" ADD CONSTRAINT "ChatSummary_parentSummaryId_fkey" FOREIGN KEY ("parentSummaryId") REFERENCES "ChatSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
