import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  createSubjectItem,
  deleteFixedChecklistItem,
  listChecklistItemStates,
  listFixedChecklistItems,
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

describe("listFixedChecklistItems -- pré-remplissage des défauts (spec 2.2, I/O matrix)", () => {
  const MATIN_TYPE = "MATIN";
  const DEFAULTS = ["Clés", "Goûter", "Carnet", "Chargeur"];

  it("pré-remplit les défauts à la toute première consultation, puis ne les recrée jamais tant qu'il reste des items", async () => {
    const first = await listFixedChecklistItems(TEST_USER_ID, MATIN_TYPE, DEFAULTS);
    expect(first.map((item) => item.label)).toEqual(DEFAULTS);

    // Deuxième consultation : la liste déjà existante est renvoyée telle
    // quelle, aucun doublon n'est créé (idempotence du pré-remplissage).
    const second = await listFixedChecklistItems(TEST_USER_ID, MATIN_TYPE, DEFAULTS);
    expect(second).toHaveLength(DEFAULTS.length);
    expect(second.map((item) => item.id).sort()).toEqual(
      first.map((item) => item.id).sort()
    );
  });

  it("n'affiche pas les défauts recréés si l'utilisateur a tout supprimé lui-même (Never)", async () => {
    const initial = await listFixedChecklistItems(TEST_USER_ID, MATIN_TYPE, DEFAULTS);
    expect(initial.length).toBeGreaterThan(0);

    for (const item of initial) {
      await deleteFixedChecklistItem(item.id, TEST_USER_ID);
    }

    const afterDeletion = await listFixedChecklistItems(
      TEST_USER_ID,
      MATIN_TYPE,
      DEFAULTS
    );
    expect(afterDeletion).toEqual([]);
  });

  it("résout deux premières consultations concurrentes sur le même (userId, checklistType) sans liste vide ni doublon", async () => {
    // Type distinct des deux tests précédents pour ne pas hériter de leur
    // état (le premier a déjà pré-rempli MATIN_TYPE, le second l'a vidé et
    // marqué "jamais recréer") -- ici on veut repartir d'un type jamais vu.
    const RACE_TYPE = "MATIN_RACE_TEST";

    const [first, second] = await Promise.all([
      listFixedChecklistItems(TEST_USER_ID, RACE_TYPE, DEFAULTS),
      listFixedChecklistItems(TEST_USER_ID, RACE_TYPE, DEFAULTS),
    ]);

    // Ni l'une ni l'autre requête concurrente ne doit voir une liste vide
    // (la fenêtre de course que corrige la transaction marqueur+défauts) --
    // les deux doivent renvoyer le même jeu de 4 items.
    expect(first.map((item) => item.label)).toEqual(DEFAULTS);
    expect(second.map((item) => item.label)).toEqual(DEFAULTS);
    expect(first.map((item) => item.id).sort()).toEqual(
      second.map((item) => item.id).sort()
    );

    const allItems = await prisma.fixedChecklistItem.findMany({
      where: { userId: TEST_USER_ID, checklistType: RACE_TYPE },
    });
    expect(allItems).toHaveLength(DEFAULTS.length);
  });
});
