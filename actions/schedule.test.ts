import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../data/prisma";
import { ensureSeedUser } from "../data/user";
import { createSlot, updateSlot } from "./schedule";

// Tests d'intégration contre la vraie base de dev (SQLite) -- createSlot/
// updateSlot appellent en interne `ensureSeedUser()` (même contrainte
// qu'actions/checklist.test.ts : pas de userId synthétique possible). Le
// nettoyage se fait par nom de matière distinctif plutôt que par userId.
// User.weekAReferenceMonday est un champ singleton du seed user réel --
// sauvegardé puis restauré après coup (`fileParallelism: false`,
// vitest.config.ts, garantit qu'aucun autre fichier de test ne le touche en
// même temps).
const TEST_SUBJECT_NAME = "action-test-week-parity-subject";

let originalReference: Date | null = null;

beforeAll(async () => {
  const user = await ensureSeedUser();
  originalReference = user.weekAReferenceMonday;
});

afterEach(async () => {
  const subject = await prisma.subject.findFirst({
    where: { name: TEST_SUBJECT_NAME },
  });
  if (subject) {
    await prisma.subject.delete({ where: { id: subject.id } }); // cascade -> ScheduleSlot
  }
});

afterAll(async () => {
  const user = await ensureSeedUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { weekAReferenceMonday: originalReference },
  });
  await prisma.$disconnect();
});

describe("createSlot / updateSlot -- garde-fou semaine A/B (Story 1.4, spec I/O matrix)", () => {
  it("rejette la création d'un créneau semaine A quand aucune référence n'est configurée", async () => {
    const user = await ensureSeedUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { weekAReferenceMonday: null },
    });

    const result = await createSlot({
      weekday: "MONDAY",
      startTime: "08:00",
      endTime: "09:00",
      subjectName: TEST_SUBJECT_NAME,
      weekParity: "A",
    });

    expect(result.ok).toBe(false);

    const rows = await prisma.scheduleSlot.findMany({
      where: { subject: { name: TEST_SUBJECT_NAME } },
    });
    expect(rows).toHaveLength(0);
  });

  it("accepte la création d'un créneau semaine A une fois la référence configurée", async () => {
    const user = await ensureSeedUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { weekAReferenceMonday: new Date("2026-09-07T00:00:00.000Z") },
    });

    const result = await createSlot({
      weekday: "MONDAY",
      startTime: "08:00",
      endTime: "09:00",
      subjectName: TEST_SUBJECT_NAME,
      weekParity: "A",
    });

    expect(result.ok).toBe(true);

    const rows = await prisma.scheduleSlot.findMany({
      where: { subject: { name: TEST_SUBJECT_NAME } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].weekParity).toBe("A");
  });

  it('crée un créneau "toutes les semaines" sans référence configurée (comportement historique préservé)', async () => {
    const user = await ensureSeedUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { weekAReferenceMonday: null },
    });

    const result = await createSlot({
      weekday: "MONDAY",
      startTime: "08:00",
      endTime: "09:00",
      subjectName: TEST_SUBJECT_NAME,
      weekParity: "",
    });

    expect(result.ok).toBe(true);

    const rows = await prisma.scheduleSlot.findMany({
      where: { subject: { name: TEST_SUBJECT_NAME } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].weekParity).toBeNull();
  });

  it("rejette la modification d'un créneau existant vers semaine B quand aucune référence n'est configurée", async () => {
    const user = await ensureSeedUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { weekAReferenceMonday: new Date("2026-09-07T00:00:00.000Z") },
    });

    const created = await createSlot({
      weekday: "MONDAY",
      startTime: "08:00",
      endTime: "09:00",
      subjectName: TEST_SUBJECT_NAME,
      weekParity: "",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await prisma.user.update({
      where: { id: user.id },
      data: { weekAReferenceMonday: null },
    });

    const updated = await updateSlot(created.data.id, {
      weekday: "MONDAY",
      startTime: "08:00",
      endTime: "09:00",
      subjectName: TEST_SUBJECT_NAME,
      weekParity: "B",
    });

    expect(updated.ok).toBe(false);

    const row = await prisma.scheduleSlot.findUnique({ where: { id: created.data.id } });
    expect(row?.weekParity).toBeNull();
  });
});
