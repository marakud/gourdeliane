import { prisma } from "./prisma";
import type { ParsedDailyReportInput } from "@/domain/daily-report";

export async function createDailyReport(userId: string, input: ParsedDailyReportInput) {
  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.findFirst({
      where: { id: input.subjectId, userId },
      select: { id: true },
    });
    if (!subject) throw new Error("SUBJECT_NOT_FOUND");

    const lessonLog = input.lessonContent
      ? await tx.lessonLog.create({
          data: {
            userId,
            subjectId: subject.id,
            date: input.date,
            content: input.lessonContent,
          },
          select: { id: true },
        })
      : null;

    const homework = input.homework
      ? await tx.devoir.create({
          data: {
            userId,
            subjectId: subject.id,
            description: input.homework.description,
            planDate: input.homework.planDate,
            echeance: input.homework.dueDate,
            aRendre: input.homework.dueDate !== null,
          },
          select: { id: true },
        })
      : null;

    const memoryPoint = input.memory
      ? await tx.memoryPoint.create({
          data: {
            userId,
            subjectId: subject.id,
            content: input.memory.content,
            note: input.memory.note,
          },
          select: { id: true },
        })
      : null;

    return {
      lessonLogId: lessonLog?.id ?? null,
      homeworkId: homework?.id ?? null,
      memoryPointId: memoryPoint?.id ?? null,
    };
  });
}
