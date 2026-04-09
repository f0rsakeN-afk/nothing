-- Add composite indexes for common query patterns

-- Chat: listing user's chats (filtered by user, not deleted, sorted by updatedAt)
CREATE INDEX IF NOT EXISTS "Chat_user_updated_idx" ON "Chat"("userId", "deletedAt", "updatedAt" DESC);

-- Message: fetching messages for a chat chronologically
CREATE INDEX IF NOT EXISTS "Message_chat_created_idx" ON "Message"("chatId", "createdAt" DESC);

-- MessageFeedback: unique constraint on message + user
CREATE INDEX IF NOT EXISTS "MessageFeedback_message_user_idx" ON "MessageFeedback"("messageId", "userId");

-- Project: listing user's projects
CREATE INDEX IF NOT EXISTS "Project_user_deleted_idx" ON "Project"("userId", "deletedAt");

-- SearchResult: user's search history
CREATE INDEX IF NOT EXISTS "SearchResult_user_created_idx" ON "SearchResult"("userId", "createdAt" DESC);

-- Message: soft delete with chat ownership check
CREATE INDEX IF NOT EXISTS "Message_chat_deleted_idx" ON "Message"("chatId", "deletedAt");
