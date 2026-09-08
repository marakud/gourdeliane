-- CreateEnum
CREATE TYPE "WeekParity" AS ENUM ('A', 'B');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weekAReferenceMonday" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ScheduleSlot" ADD COLUMN     "weekParity" "WeekParity";
