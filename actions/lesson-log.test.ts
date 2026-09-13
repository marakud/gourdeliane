import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../data/prisma";
import {
  createLessonLogAction,
  deleteLessonLogAction,
  updateLessonLogAction,
} from "./lesson-log";

// Tests d'intégration contre la vraie base de dev (SQLite), même convention
// que actions/homework.test.ts -- `requireUserId` mocké vers un utilisateur
// de test synthétique.

const TEST_USER_ID = "test-user-actions-lesson-log";

vi.mock("@/lib/current-user", () => ({
  requireUserId: async () => TEST_USER_ID,
}));

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
});

let subjectId: string;

async function ensureTestSubject() {
  const subject = await prisma.subject.create({
    data: { userId: TEST_USER_ID, name: `lesson-log-test-subject-${Date.now()}`, colorIndex: 1 },
  });
  subjectId = subject.id;
  return subject;
}

afterAll(async () => {
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("createLessonLogAction", () => {
  it("crée une entrée avec matière, date et contenu", async () => {
    await ensureTestSubject();

    const result = await createLessonLogAction({
      subjectId,
      date: "2026-09-14",
      content: "Chapitre 3 : les fractions",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const log = await prisma.lessonLog.findUnique({ where: { id: result.data.id } });
    expect(log?.subjectId).toBe(subjectId);
    expect(log?.date.toISOString().slice(0, 10)).toBe("2026-09-14");
    expect(log?.content).toBe("Chapitre 3 : les fractions");
  });

  it("rejette une matière invalide", async () => {
    const result = await createLessonLogAction({
      subjectId: "",
      date: "2026-09-14",
      content: "Contenu",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette une date manquante", async () => {
    await ensureTestSubject();

    const result = await createLessonLogAction({
      subjectId,
      date: "",
      content: "Contenu",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette une date mal formée", async () => {
    await ensureTestSubject();

    const result = await createLessonLogAction({
      subjectId,
      date: "pas-une-date",
      content: "Contenu",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette une date calendairement invalide plutôt que de la reporter silencieusement (ex. 30 février)", async () => {
    await ensureTestSubject();

    const result = await createLessonLogAction({
      subjectId,
      date: "2026-02-30",
      content: "Contenu",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette un contenu vide", async () => {
    await ensureTestSubject();

    const result = await createLessonLogAction({
      subjectId,
      date: "2026-09-14",
      content: "   ",
    });
    expect(result.ok).toBe(false);
  });
});

describe("updateLessonLogAction", () => {
  it("modifie une entrée existante", async () => {
    await ensureTestSubject();

    const created = await createLessonLogAction({
      subjectId,
      date: "2026-09-14",
      content: "Avant",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await updateLessonLogAction(created.data.id, {
      subjectId,
      date: "2026-09-15",
      content: "Après",
    });
    expect(updated.ok).toBe(true);

    const log = await prisma.lessonLog.findUnique({ where: { id: created.data.id } });
    expect(log?.content).toBe("Après");
    expect(log?.date.toISOString().slice(0, 10)).toBe("2026-09-15");
  });

  it("rejette un id vide", async () => {
    const result = await updateLessonLogAction("", {
      subjectId,
      date: "2026-09-14",
      content: "Contenu",
    });
    expect(result.ok).toBe(false);
  });
});

describe("deleteLessonLogAction", () => {
  it("supprime l'entrée", async () => {
    await ensureTestSubject();

    const created = await createLessonLogAction({
      subjectId,
      date: "2026-09-14",
      content: "À supprimer",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = await deleteLessonLogAction({ id: created.data.id });
    expect(deleted.ok).toBe(true);

    const log = await prisma.lessonLog.findUnique({ where: { id: created.data.id } });
    expect(log).toBeNull();
  });

  it("rejette un id vide", async () => {
    const result = await deleteLessonLogAction({ id: "" });
    expect(result.ok).toBe(false);
  });
});
