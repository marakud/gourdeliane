-- CreateTable
CREATE TABLE "FixedChecklistDefaultsSeed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "checklistType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FixedChecklistDefaultsSeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FixedChecklistDefaultsSeed_userId_checklistType_key" ON "FixedChecklistDefaultsSeed"("userId", "checklistType");
