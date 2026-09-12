-- AlterTable
ALTER TABLE "Devoir" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'TODO',
ADD COLUMN "estimatedMinutes" INTEGER;
