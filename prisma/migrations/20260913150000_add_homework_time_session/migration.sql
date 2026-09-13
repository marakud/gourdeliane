-- CreateTable
CREATE TABLE "HomeworkTimeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "devoirId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "plannedSeconds" INTEGER,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "HomeworkTimeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HomeworkTimeSession_devoirId_fkey" FOREIGN KEY ("devoirId") REFERENCES "Devoir" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HomeworkTimeSession_userId_devoirId_idx" ON "HomeworkTimeSession"("userId", "devoirId");
