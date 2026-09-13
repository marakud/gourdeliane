import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  createLessonLog,
  deleteLessonLog,
  listLessonLogs,
  updateLessonLog,
} from "./lesson-log";

// Tests d'intégration contre la vraie base de dev (SQLite), même convention
// que data/homework.test.ts -- userId synthétique distinct.
const TEST_USER_ID = "test-user-lesson-log-integration";
let subjectId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
  const subject = await prisma.subject.create({
    data: { userId: TEST_USER_ID, name: "Test Lesson Log Subject", colorIndex: 1 },
  });
  subjectId = subject.id;
});

afterAll(async () => {
  // onDelete: Cascade sur Subject/LessonLog -- supprimer le user nettoie
  // tout le reste en une fois.
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("createLessonLog", () => {
  it("crée une entrée avec matière, date et contenu", async () => {
    const date = new Date("2026-09-14T00:00:00Z");
    const log = await createLessonLog(
      TEST_USER_ID,
      subjectId,
      date,
      "Chapitre 3 : les fractions"
    );

    expect(log.subjectId).toBe(subjectId);
    expect(log.date.toISOString()).toBe(date.toISOString());
    expect(log.content).toBe("Chapitre 3 : les fractions");
    expect(log.subject.id).toBe(subjectId);
  });
});

describe("updateLessonLog -- scopé par (id, userId)", () => {
  it("modifie tous les champs d'une entrée existante", async () => {
    const log = await createLessonLog(
      TEST_USER_ID,
      subjectId,
      new Date("2026-09-14T00:00:00Z"),
      "Avant modification"
    );
    const newDate = new Date("2026-09-15T00:00:00Z");

    const updated = await updateLessonLog(
      log.id,
      TEST_USER_ID,
      subjectId,
      newDate,
      "Après modification"
    );

    expect(updated.content).toBe("Après modification");
    expect(updated.date.toISOString()).toBe(newDate.toISOString());
  });

  it("rejette une modification scopée à un autre userId (protection {id, userId})", async () => {
    const log = await createLessonLog(
      TEST_USER_ID,
      subjectId,
      new Date("2026-09-14T00:00:00Z"),
      "Protégé"
    );

    await expect(
      updateLessonLog(
        log.id,
        "un-autre-utilisateur",
        subjectId,
        new Date("2026-09-14T00:00:00Z"),
        "Modification non autorisée"
      )
    ).rejects.toThrow();

    const stillOriginal = await prisma.lessonLog.findUnique({ where: { id: log.id } });
    expect(stillOriginal?.content).toBe("Protégé");
  });
});

describe("deleteLessonLog -- suppression définitive, scopée par (id, userId)", () => {
  it("supprime l'entrée", async () => {
    const log = await createLessonLog(
      TEST_USER_ID,
      subjectId,
      new Date("2026-09-14T00:00:00Z"),
      "À supprimer"
    );

    await deleteLessonLog(log.id, TEST_USER_ID);

    const stillThere = await prisma.lessonLog.findUnique({ where: { id: log.id } });
    expect(stillThere).toBeNull();
  });

  it("rejette une suppression scopée à un autre userId (protection {id, userId})", async () => {
    const log = await createLessonLog(
      TEST_USER_ID,
      subjectId,
      new Date("2026-09-14T00:00:00Z"),
      "Protégé2"
    );

    await expect(deleteLessonLog(log.id, "un-autre-utilisateur")).rejects.toThrow();

    const stillThere = await prisma.lessonLog.findUnique({ where: { id: log.id } });
    expect(stillThere).not.toBeNull();
  });
});

describe("listLessonLogs -- ordre date desc puis createdAt asc, matière incluse", () => {
  it("renvoie les entrées triées par date décroissante", async () => {
    const before = await listLessonLogs(TEST_USER_ID);
    const beforeIds = new Set(before.map((l) => l.id));

    const older = await createLessonLog(
      TEST_USER_ID,
      subjectId,
      new Date("2026-09-10T00:00:00Z"),
      "Plus ancien"
    );
    const newer = await createLessonLog(
      TEST_USER_ID,
      subjectId,
      new Date("2026-09-16T00:00:00Z"),
      "Plus récent"
    );

    const after = await listLessonLogs(TEST_USER_ID);
    const newOnes = after.filter((l) => !beforeIds.has(l.id));

    expect(newOnes.map((l) => l.id)).toEqual([newer.id, older.id]);
    expect(newOnes[0].subject.id).toBe(subjectId);
  });
});
