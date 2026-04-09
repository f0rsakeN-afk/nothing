-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING_UPLOAD', 'PROCESSING', 'READY', 'FAILED');

-- DropIndex
DROP INDEX "Chat_searchResultId_idx";

-- DropIndex
DROP INDEX "Chat_user_updated_idx";

-- DropIndex
DROP INDEX "Message_chat_created_idx";

-- DropIndex
DROP INDEX "Message_chat_deleted_idx";

-- DropIndex
DROP INDEX "Message_searchResultId_idx";

-- DropIndex
DROP INDEX "MessageFeedback_message_user_idx";

-- DropIndex
DROP INDEX "Project_user_deleted_idx";

-- DropIndex
DROP INDEX "SearchResult_user_created_idx";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "contentPreview" TEXT,
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "extractedContent" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "s3Bucket" TEXT,
ADD COLUMN     "s3Key" TEXT,
ADD COLUMN     "status" "FileStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
ADD COLUMN     "tokenCount" INTEGER,
ADD COLUMN     "uploadId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "SavedSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedSource_userId_idx" ON "SavedSource"("userId");

-- CreateIndex
CREATE INDEX "SavedSource_createdAt_idx" ON "SavedSource"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedSource_userId_sourceId_key" ON "SavedSource"("userId", "sourceId");

-- CreateIndex
CREATE INDEX "Chat_userId_deletedAt_idx" ON "Chat"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Chat_userId_updatedAt_idx" ON "Chat"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "File_projectId_idx" ON "File"("projectId");

-- CreateIndex
CREATE INDEX "File_status_idx" ON "File"("status");

-- CreateIndex
CREATE INDEX "Message_parentId_idx" ON "Message"("parentId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
