-- CreateTable
CREATE TABLE "UserUsageStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedMessages" INTEGER NOT NULL DEFAULT 0,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUsageStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserUsageStats_userId_key" ON "UserUsageStats"("userId");

-- CreateIndex
CREATE INDEX "UserUsageStats_userId_month_year_idx" ON "UserUsageStats"("userId", "month", "year");
