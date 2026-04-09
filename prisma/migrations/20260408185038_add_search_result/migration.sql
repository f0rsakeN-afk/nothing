-- CreateTable
CREATE TABLE "SearchResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchResult_userId_idx" ON "SearchResult"("userId");

-- CreateIndex
CREATE INDEX "SearchResult_createdAt_idx" ON "SearchResult"("createdAt");
