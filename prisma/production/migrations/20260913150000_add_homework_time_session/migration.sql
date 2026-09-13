-- CreateTable
CREATE TABLE "HomeworkTimeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "devoirId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "plannedSeconds" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkTimeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeworkTimeSession_userId_devoirId_idx" ON "HomeworkTimeSession"("userId", "devoirId");

-- AddForeignKey
ALTER TABLE "HomeworkTimeSession" ADD CONSTRAINT "HomeworkTimeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkTimeSession" ADD CONSTRAINT "HomeworkTimeSession_devoirId_fkey" FOREIGN KEY ("devoirId") REFERENCES "Devoir"("id") ON DELETE CASCADE ON UPDATE CASCADE;
