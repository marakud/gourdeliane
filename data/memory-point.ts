import { prisma } from "./prisma";
import type { MemoryStatus } from "@/domain/memory-point";

export async function listMemoryPoints(userId: string) {
  return prisma.memoryPoint.findMany({
    where: { userId },
    include: { subject: true },
    orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
  });
}

export async function createMemoryPoint(
  userId: string,
  subjectId: string,
  content: string,
  note: string | null
) {
  return prisma.memoryPoint.create({
    data: { userId, subjectId, content, note },
  });
}

export async function updateMemoryPointStatus(
  id: string,
  userId: string,
  status: MemoryStatus
) {
  return prisma.memoryPoint.update({ where: { id, userId }, data: { status } });
}

export async function markMemoryPointReviewed(id: string, userId: string) {
  const point = await prisma.memoryPoint.findUniqueOrThrow({ where: { id, userId } });
  return prisma.memoryPoint.update({
    where: { id, userId },
    data: {
      reviewCount: { increment: 1 },
      lastReviewedAt: new Date(),
      status: point.status === "TO_REVIEW" ? "LEARNING" : point.status,
    },
  });
}

export async function deleteMemoryPoint(id: string, userId: string) {
  return prisma.memoryPoint.delete({ where: { id, userId } });
}
