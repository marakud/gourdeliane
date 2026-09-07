-- CreateTable
CREATE TABLE "FixedChecklistDefaultsSeed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checklistType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedChecklistDefaultsSeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FixedChecklistDefaultsSeed_userId_checklistType_key" ON "FixedChecklistDefaultsSeed"("userId", "checklistType");

-- AddForeignKey
ALTER TABLE "FixedChecklistDefaultsSeed" ADD CONSTRAINT "FixedChecklistDefaultsSeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
