-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Customize" ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "name" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maxChats" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "maxMessages" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "maxProjects" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "autoTitle" BOOLEAN NOT NULL DEFAULT true,
    "enterToSend" BOOLEAN NOT NULL DEFAULT false,
    "showSuggestions" BOOLEAN NOT NULL DEFAULT true,
    "compactMode" BOOLEAN NOT NULL DEFAULT false,
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "streaming" BOOLEAN NOT NULL DEFAULT true,
    "codeHighlight" BOOLEAN NOT NULL DEFAULT true,
    "persistentMemory" BOOLEAN NOT NULL DEFAULT false,
    "emailUpdates" BOOLEAN NOT NULL DEFAULT true,
    "emailMarketing" BOOLEAN NOT NULL DEFAULT false,
    "browserNotifs" BOOLEAN NOT NULL DEFAULT false,
    "usageAlerts" BOOLEAN NOT NULL DEFAULT true,
    "analytics" BOOLEAN NOT NULL DEFAULT true,
    "usageData" BOOLEAN NOT NULL DEFAULT false,
    "crashReports" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE INDEX "Chat_pinnedAt_idx" ON "Chat"("pinnedAt");

-- CreateIndex
CREATE INDEX "Project_pinnedAt_idx" ON "Project"("pinnedAt");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
