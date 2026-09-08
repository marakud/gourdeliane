-- AlterTable
ALTER TABLE "ScheduleSlot" ADD COLUMN "weekParity" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "weekAReferenceMonday" DATETIME;
