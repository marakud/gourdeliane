-- AlterTable
ALTER TABLE "Devoir" DROP COLUMN "plannedWeekday";
ALTER TABLE "Devoir" RENAME COLUMN "plannedStartTime" TO "echeanceTime";
