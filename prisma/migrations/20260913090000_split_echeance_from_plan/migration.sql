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
    "planDate" DATETIME,
    "planTime" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "estimatedMinutes" INTEGER,
    CONSTRAINT "Devoir_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Devoir_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Ce qui était saisi comme "échéance" via l'ancien calendrier fusionné était
-- en réalité une planification (retour utilisateur -- échéance et
-- planification sont deux notions distinctes) : migré vers planDate/planTime,
-- l'échéance repart à zéro (à renseigner séparément si besoin).
INSERT INTO "new_Devoir" ("id", "userId", "subjectId", "description", "aRendre", "echeance", "planDate", "planTime", "done", "createdAt", "status", "estimatedMinutes")
SELECT "id", "userId", "subjectId", "description", "aRendre", NULL, "echeance", "echeanceTime", "done", "createdAt", "status", "estimatedMinutes" FROM "Devoir";
DROP TABLE "Devoir";
ALTER TABLE "new_Devoir" RENAME TO "Devoir";
CREATE INDEX "Devoir_userId_done_idx" ON "Devoir"("userId", "done");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
