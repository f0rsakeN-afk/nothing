-- CreateIndex
CREATE INDEX "ChatInvitation_chatId_status_expiresAt_idx" ON "ChatInvitation"("chatId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "ChatMember_userId_chatId_idx" ON "ChatMember"("userId", "chatId");
