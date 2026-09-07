-- CreateTable
CREATE TABLE "FixedChecklistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checklistType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedChecklistItem_userId_checklistType_idx" ON "FixedChecklistItem"("userId", "checklistType");

-- AddForeignKey
ALTER TABLE "FixedChecklistItem" ADD CONSTRAINT "FixedChecklistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
