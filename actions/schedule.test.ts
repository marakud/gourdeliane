import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../data/prisma";
import { createSlot, updateSlot } from "./schedule";

// Tests d'intégration contre la vraie base de dev (SQLite) -- createSlot/
// updateSlot résolvent l'utilisateur depuis la session (`requireCurrentUser`,
// lib/current-user.ts), mocké ici vers un utilisateur de test synthétique
// (jamais le vrai utilisateur unique d'avant l'authentification). Le mock
// relit `TEST_USER_ID` en base à chaque appel (pas une valeur figée) : ces
// tests mutent `weekAReferenceMonday` directement puis vérifient que
// l'action relit bien la valeur courante. `onDelete: Cascade`
// (User -> Subject -> ScheduleSlot) nettoie tout via la suppression de
// l'utilisateur de test en `afterAll`.
const TEST_USER_ID = "test-user-actions-schedule";
const TEST_SUBJECT_NAME = "action-test-week-parity-subject";

vi.mock("@/lib/current-user", () => ({
  requireCurrentUser: async () =>
    prisma.user.findUniqueOrThrow({ where: { id: TEST_USER_ID } }),
}));

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
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
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("createSlot / updateSlot -- garde-fou semaine A/B (Story 1.4, spec I/O matrix)", () => {
  it("rejette la création d'un créneau semaine A quand aucune référence n'est configurée", async () => {
    await prisma.user.update({
      where: { id: TEST_USER_ID },
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
    await prisma.user.update({
      where: { id: TEST_USER_ID },
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
    await prisma.user.update({
      where: { id: TEST_USER_ID },
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
    await prisma.user.update({
      where: { id: TEST_USER_ID },
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
      where: { id: TEST_USER_ID },
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
