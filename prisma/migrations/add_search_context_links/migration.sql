-- Add search context links for persistent search context per chat
-- Phase 2: Link search results to Chat and Message models

-- Add searchResultId to Chat model
ALTER TABLE "Chat" ADD COLUMN "searchResultId" TEXT;

-- Add searchResultId to Message model for thread-level search inheritance
ALTER TABLE "Message" ADD COLUMN "searchResultId" TEXT;

-- Add foreign key constraints
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_searchResultId_fkey"
  FOREIGN KEY ("searchResultId") REFERENCES "SearchResult"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message" ADD CONSTRAINT "Message_searchResultId_fkey"
  FOREIGN KEY ("searchResultId") REFERENCES "SearchResult"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for efficient lookups
CREATE INDEX "Chat_searchResultId_idx" ON "Chat"("searchResultId");
CREATE INDEX "Message_searchResultId_idx" ON "Message"("searchResultId");
