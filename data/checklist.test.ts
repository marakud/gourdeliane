import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  createSubjectItem,
  listChecklistItemStates,
  upsertChecklistItemState,
} from "./checklist";

// Tests d'intégration contre la vraie base de dev (SQLite), même convention
// que data/schedule.test.ts -- userId synthétique distinct pour ne pas
// interférer si les fichiers de test tournent en parallèle.
const TEST_USER_ID = "test-user-checklist-integration";
const CHECKLIST_TYPE = "SAC";
const SOURCE_TYPE = "SUBJECT_ITEM";

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
});

afterAll(async () => {
  // onDelete: Cascade sur Subject/SubjectItem/ChecklistItemState -- supprimer
  // le user nettoie tout le reste en une fois.
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("upsertChecklistItemState -- idempotence sur la clé stable (AD-3)", () => {
  it("met à jour la même ligne au lieu d'en créer une nouvelle quand la clé est identique", async () => {
    const subject = await prisma.subject.create({
      data: { userId: TEST_USER_ID, name: "Test Checklist Subject", colorIndex: 1 },
    });
    const item = await createSubjectItem(TEST_USER_ID, subject.id, "Cahier");
    const date = new Date("2026-12-16T00:00:00Z");

    const firstCall = await upsertChecklistItemState({
      userId: TEST_USER_ID,
      date,
      checklistType: CHECKLIST_TYPE,
      sourceType: SOURCE_TYPE,
      sourceId: item.id,
      checked: true,
    });
    const secondCall = await upsertChecklistItemState({
      userId: TEST_USER_ID,
      date,
      checklistType: CHECKLIST_TYPE,
      sourceType: SOURCE_TYPE,
      sourceId: item.id,
      checked: false,
    });

    expect(secondCall.id).toBe(firstCall.id);
    expect(secondCall.checked).toBe(false);

    const states = await listChecklistItemStates(TEST_USER_ID, date, CHECKLIST_TYPE);
    expect(states).toHaveLength(1);
    expect(states[0].checked).toBe(false);
  });
});
