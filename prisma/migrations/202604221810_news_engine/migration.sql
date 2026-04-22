-- CreateTable
CREATE TABLE "NewsItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "arabicSummary" TEXT NOT NULL,
  "actionNote" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publishedAt" DATETIME NOT NULL,
  "symbol" TEXT NOT NULL,
  "rawCategory" TEXT NOT NULL,
  "detectedCategory" TEXT NOT NULL,
  "sentiment" TEXT NOT NULL,
  "impactLevel" TEXT NOT NULL,
  "impactScore" INTEGER NOT NULL,
  "urgencyScore" INTEGER NOT NULL,
  "dedupeHash" TEXT NOT NULL,
  "sentToTelegram" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NewsAlertLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "newsItemId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "payload" TEXT NOT NULL,
  "deliveredAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsAlertLog_newsItemId_fkey" FOREIGN KEY ("newsItemId") REFERENCES "NewsItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistSymbol" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "symbol" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "marketWide" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistSymbol_symbol_key" ON "WatchlistSymbol"("symbol");
CREATE INDEX "NewsItem_symbol_publishedAt_idx" ON "NewsItem"("symbol", "publishedAt");
CREATE INDEX "NewsItem_detectedCategory_publishedAt_idx" ON "NewsItem"("detectedCategory", "publishedAt");
CREATE INDEX "NewsItem_dedupeHash_idx" ON "NewsItem"("dedupeHash");
CREATE INDEX "NewsAlertLog_newsItemId_createdAt_idx" ON "NewsAlertLog"("newsItemId", "createdAt");
