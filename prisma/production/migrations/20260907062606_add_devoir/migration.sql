-- CreateTable
CREATE TABLE "Devoir" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "aRendre" BOOLEAN NOT NULL DEFAULT false,
    "echeance" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Devoir_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Devoir_userId_done_idx" ON "Devoir"("userId", "done");

-- AddForeignKey
ALTER TABLE "Devoir" ADD CONSTRAINT "Devoir_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devoir" ADD CONSTRAINT "Devoir_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
