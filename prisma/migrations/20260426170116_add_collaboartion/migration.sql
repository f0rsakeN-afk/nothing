/*
  Warnings:

  - You are about to drop the column `firstName` on the `Customize` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Customize` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- AlterTable
ALTER TABLE "Customize" DROP COLUMN "firstName",
DROP COLUMN "lastName";

-- CreateTable
CREATE TABLE "ChatMember" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatInvitation" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL DEFAULT 'VIEWER',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMember_chatId_idx" ON "ChatMember"("chatId");

-- CreateIndex
CREATE INDEX "ChatMember_userId_idx" ON "ChatMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMember_chatId_userId_key" ON "ChatMember"("chatId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatInvitation_token_key" ON "ChatInvitation"("token");

-- CreateIndex
CREATE INDEX "ChatInvitation_chatId_idx" ON "ChatInvitation"("chatId");

-- CreateIndex
CREATE INDEX "ChatInvitation_email_idx" ON "ChatInvitation"("email");

-- CreateIndex
CREATE INDEX "ChatInvitation_token_idx" ON "ChatInvitation"("token");

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatInvitation" ADD CONSTRAINT "ChatInvitation_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
