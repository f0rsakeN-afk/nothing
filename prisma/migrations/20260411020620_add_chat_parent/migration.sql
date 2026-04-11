/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `searchResultId` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Customize` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `deletedBy` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Memory` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `searchResultId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Archive` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SavedSource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SearchResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Trash` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_searchResultId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_searchResultId_fkey";

-- DropIndex
DROP INDEX "Chat_deletedAt_idx";

-- DropIndex
DROP INDEX "Chat_userId_deletedAt_idx";

-- DropIndex
DROP INDEX "Contact_deletedAt_idx";

-- DropIndex
DROP INDEX "Customize_deletedAt_idx";

-- DropIndex
DROP INDEX "Feedback_deletedAt_idx";

-- DropIndex
DROP INDEX "File_deletedAt_idx";

-- DropIndex
DROP INDEX "Message_deletedAt_idx";

-- DropIndex
DROP INDEX "Project_deletedAt_idx";

-- DropIndex
DROP INDEX "Report_deletedAt_idx";

-- DropIndex
DROP INDEX "User_deletedAt_idx";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "deletedAt",
DROP COLUMN "searchResultId",
ADD COLUMN     "parentChatId" TEXT;

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Customize" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "deletedAt",
DROP COLUMN "deletedBy";

-- AlterTable
ALTER TABLE "Memory" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "deletedAt",
DROP COLUMN "searchResultId";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "deletedAt";

-- DropTable
DROP TABLE "Archive";

-- DropTable
DROP TABLE "SavedSource";

-- DropTable
DROP TABLE "SearchResult";

-- DropTable
DROP TABLE "Trash";

-- DropEnum
DROP TYPE "ArchivableModel";

-- DropEnum
DROP TYPE "TrashableModel";

-- CreateIndex
CREATE INDEX "Chat_parentChatId_idx" ON "Chat"("parentChatId");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_parentChatId_fkey" FOREIGN KEY ("parentChatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
