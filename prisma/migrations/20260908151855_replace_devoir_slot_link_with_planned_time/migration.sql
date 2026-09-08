/*
  Warnings:

  - You are about to drop the column `scheduleSlotId` on the `Devoir` table.
    Any existing link is backfilled into `plannedWeekday`/`plannedStartTime`
    below (from the linked ScheduleSlot's own weekday/startTime) before the
    column is dropped -- corrected in review: the auto-generated version of
    this migration dropped the column with no backfill, which would have
    silently lost the schedule-slot link for any devoir that had one (this
    design was briefly live in production before being replaced).

*/
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
    "plannedWeekday" TEXT,
    "plannedStartTime" TEXT,
    CONSTRAINT "Devoir_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Devoir_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Devoir" ("id", "userId", "subjectId", "description", "aRendre", "echeance", "done", "createdAt", "plannedWeekday", "plannedStartTime")
SELECT d."id", d."userId", d."subjectId", d."description", d."aRendre", d."echeance", d."done", d."createdAt",
       s."weekday", s."startTime"
FROM "Devoir" d
LEFT JOIN "ScheduleSlot" s ON s."id" = d."scheduleSlotId";
DROP TABLE "Devoir";
ALTER TABLE "new_Devoir" RENAME TO "Devoir";
CREATE INDEX "Devoir_userId_done_idx" ON "Devoir"("userId", "done");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
