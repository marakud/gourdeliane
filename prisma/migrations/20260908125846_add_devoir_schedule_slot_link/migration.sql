-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Devoir" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "aRendre" BOOLEAN NOT NULL DEFAULT false,
    "echeance" DATETIME,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduleSlotId" TEXT,
    CONSTRAINT "Devoir_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Devoir_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Devoir_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "ScheduleSlot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Devoir" ("aRendre", "createdAt", "description", "done", "echeance", "id", "subjectId", "userId") SELECT "aRendre", "createdAt", "description", "done", "echeance", "id", "subjectId", "userId" FROM "Devoir";
DROP TABLE "Devoir";
ALTER TABLE "new_Devoir" RENAME TO "Devoir";
CREATE INDEX "Devoir_userId_done_idx" ON "Devoir"("userId", "done");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
