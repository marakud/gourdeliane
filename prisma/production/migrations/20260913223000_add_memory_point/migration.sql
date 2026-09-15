CREATE TABLE "MemoryPoint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TO_REVIEW',
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MemoryPoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemoryPoint_userId_status_idx" ON "MemoryPoint"("userId", "status");
CREATE INDEX "MemoryPoint_userId_subjectId_idx" ON "MemoryPoint"("userId", "subjectId");
ALTER TABLE "MemoryPoint" ADD CONSTRAINT "MemoryPoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemoryPoint" ADD CONSTRAINT "MemoryPoint_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
