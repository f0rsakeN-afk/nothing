-- CreateIndex
CREATE INDEX "Chat_title_idx" ON "Chat"("title");

-- CreateIndex
CREATE INDEX "ChatSummary_createdAt_idx" ON "ChatSummary"("createdAt");

-- CreateIndex
CREATE INDEX "ChatSummary_updatedAt_idx" ON "ChatSummary"("updatedAt");

-- CreateIndex
CREATE INDEX "File_createdAt_idx" ON "File"("createdAt");

-- CreateIndex
CREATE INDEX "File_name_idx" ON "File"("name");

-- CreateIndex
CREATE INDEX "Memory_updatedAt_idx" ON "Memory"("updatedAt");

-- CreateIndex
CREATE INDEX "Message_sender_idx" ON "Message"("sender");

-- CreateIndex
CREATE INDEX "Message_updatedAt_idx" ON "Message"("updatedAt");

-- CreateIndex
CREATE INDEX "Plan_createdAt_idx" ON "Plan"("createdAt");

-- CreateIndex
CREATE INDEX "Plan_updatedAt_idx" ON "Plan"("updatedAt");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_createdAt_idx" ON "Subscription"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_updatedAt_idx" ON "Subscription"("updatedAt");

-- CreateIndex
CREATE INDEX "User_planId_idx" ON "User"("planId");

-- CreateIndex
CREATE INDEX "User_updatedAt_idx" ON "User"("updatedAt");
