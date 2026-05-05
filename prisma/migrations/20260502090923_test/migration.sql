/*
  Warnings:

  - You are about to drop the column `theme` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "theme",
ADD COLUMN     "colorScheme" TEXT NOT NULL DEFAULT 'civic',
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "showApps" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showChips" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showFiles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showMemory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showNewChat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showSearch" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showTagline" BOOLEAN NOT NULL DEFAULT true;
