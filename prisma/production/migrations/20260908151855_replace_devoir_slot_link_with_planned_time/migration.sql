-- AlterTable: add the new columns first (nullable, so existing rows are valid immediately)
ALTER TABLE "Devoir" ADD COLUMN "plannedStartTime" TEXT,
ADD COLUMN "plannedWeekday" "Weekday";

-- Backfill: any devoir previously linked to a ScheduleSlot (scheduleSlotId,
-- the design this migration replaces) keeps an equivalent placement --
-- corrected in review: the auto-generated version of this migration dropped
-- scheduleSlotId with no backfill, which would have silently lost the link
-- for any devoir that had one (this design was briefly live in production
-- before being replaced).
UPDATE "Devoir" d
SET "plannedWeekday" = s."weekday",
    "plannedStartTime" = s."startTime"
FROM "ScheduleSlot" s
WHERE d."scheduleSlotId" = s."id";

-- DropForeignKey
ALTER TABLE "Devoir" DROP CONSTRAINT "Devoir_scheduleSlotId_fkey";

-- AlterTable: now safe to drop the old column
ALTER TABLE "Devoir" DROP COLUMN "scheduleSlotId";
