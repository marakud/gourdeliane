import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../data/prisma";
import { createDailyReportAction } from "./daily-report";

const USER_ID = "test-user-daily-report";
vi.mock("@/lib/current-user", () => ({ requireUserId: async () => USER_ID }));

let subjectId: string;

beforeAll(async () => {
  await prisma.user.upsert({ where: { id: USER_ID }, update: {}, create: { id: USER_ID } });
  const subject = await prisma.subject.create({
    data: { userId: USER_ID, name: `daily-report-${Date.now()}`, colorIndex: 1 },
  });
  subjectId = subject.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

describe("createDailyReportAction", () => {
  it("crée atomiquement les trois éléments du bilan", async () => {
    const result = await createDailyReportAction({
      subjectId,
      date: "2026-09-15",
      lessonContent: "Les fractions",
      homeworkDescription: "Exercices page 42",
      homeworkPlanDate: "2026-09-16",
      homeworkDueDate: "2026-09-18",
      memoryContent: "Réduire au même dénominateur",
      memoryNote: "Reprendre l'exemple du cahier",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [lesson, homework, memory] = await Promise.all([
      prisma.lessonLog.findUnique({ where: { id: result.data.lessonLogId! } }),
      prisma.devoir.findUnique({ where: { id: result.data.homeworkId! } }),
      prisma.memoryPoint.findUnique({ where: { id: result.data.memoryPointId! } }),
    ]);
    expect(lesson?.content).toBe("Les fractions");
    expect(homework?.aRendre).toBe(true);
    expect(homework?.planDate?.toISOString().slice(0, 10)).toBe("2026-09-16");
    expect(homework?.echeance?.toISOString().slice(0, 10)).toBe("2026-09-18");
    expect(memory?.status).toBe("TO_REVIEW");
  });

  it("n'écrit rien pour une matière appartenant à un autre utilisateur", async () => {
    const before = await prisma.lessonLog.count({ where: { userId: USER_ID } });
    const result = await createDailyReportAction({
      subjectId: "matiere-inconnue",
      date: "2026-09-15",
      lessonContent: "Ne doit pas être créé",
    });
    expect(result.ok).toBe(false);
    expect(await prisma.lessonLog.count({ where: { userId: USER_ID } })).toBe(before);
  });
});
