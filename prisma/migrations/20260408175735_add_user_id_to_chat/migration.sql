-- AlterEnum
ALTER TYPE "SENDER" ADD VALUE 'assistant';

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
