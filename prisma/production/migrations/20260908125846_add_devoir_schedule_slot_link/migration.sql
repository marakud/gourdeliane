-- AlterTable
ALTER TABLE "Devoir" ADD COLUMN     "scheduleSlotId" TEXT;

-- AddForeignKey
ALTER TABLE "Devoir" ADD CONSTRAINT "Devoir_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "ScheduleSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
