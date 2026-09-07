-- CreateTable
CREATE TABLE "SubjectItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItemState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checklistType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItemState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubjectItem_userId_subjectId_idx" ON "SubjectItem"("userId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItemState_userId_date_checklistType_sourceType_sou_key" ON "ChecklistItemState"("userId", "date", "checklistType", "sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "SubjectItem" ADD CONSTRAINT "SubjectItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectItem" ADD CONSTRAINT "SubjectItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemState" ADD CONSTRAINT "ChecklistItemState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

