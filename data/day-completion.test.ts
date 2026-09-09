import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createSubjectItem, upsertChecklistItemState } from "./checklist";
import { createDevoir, toggleDevoirDone } from "./homework";
import { recomputeAndPersistSoirCompletion } from "./day-completion";
import {
  CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
  CHECKLIST_SOURCE_TYPE_SUBJECT,
  CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
  CHECKLIST_TYPE_REVISIONS,
  CHECKLIST_TYPE_SAC,
} from "@/domain/checklist";
import { DAY_COMPLETION_MOMENT_SOIR } from "@/domain/day-completion";

// Tests d'intégration contre la vraie base de dev (SQLite), même convention
// que data/homework.test.ts/data/checklist.test.ts -- userId synthétique
// distinct pour ne pas polluer le vrai utilisateur unique de l'app (et pour
// que la ligne DayCompletion créée par ces tests soit nettoyée en cascade,
// contrairement à celle qu'écriraient des tests appelant l'action réelle
// avec `new Date()` -- correctif de revue, cf. deferred-work.md).
//
// `now` est ancré au mercredi 9 septembre 2026 à 18h UTC (14h America/
// Guadeloupe) -- un jour scolaire connu, "demain" = jeudi 10 septembre.
// Passé explicitement à `recomputeAndPersistSoirCompletion` (jamais lu en
// interne depuis `new Date()`), donc déterministe indépendamment de la date
// réelle d'exécution des tests.
const NOW = new Date("2026-09-09T18:00:00.000Z");
const TODAY_ISO = "2026-09-09";
const TOMORROW_ISO = "2026-09-10";

const TEST_USER_ID = "test-user-day-completion-integration";
let todaySubjectId: string;
let tomorrowSubjectId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
  const todaySubject = await prisma.subject.create({
    data: { userId: TEST_USER_ID, name: "Test Today Subject", colorIndex: 1 },
  });
  todaySubjectId = todaySubject.id;
  const tomorrowSubject = await prisma.subject.create({
    data: { userId: TEST_USER_ID, name: "Test Tomorrow Subject", colorIndex: 2 },
  });
  tomorrowSubjectId = tomorrowSubject.id;

  // Aujourd'hui (mercredi) a cours de `todaySubject` -- alimente Révisions.
  await prisma.scheduleSlot.create({
    data: {
      userId: TEST_USER_ID,
      subjectId: todaySubjectId,
      weekday: "WEDNESDAY",
      startTime: "08:00",
      endTime: "09:00",
    },
  });
  // Demain (jeudi) a cours de `tomorrowSubject` -- alimente Sac.
  await prisma.scheduleSlot.create({
    data: {
      userId: TEST_USER_ID,
      subjectId: tomorrowSubjectId,
      weekday: "THURSDAY",
      startTime: "08:00",
      endTime: "09:00",
    },
  });
  // Un objet Sac pour la matière de demain -- sans ça, `sacGroups` aurait un
  // groupe avec `items: []`, trivialement complet, et ne testerait rien.
  await createSubjectItem(TEST_USER_ID, tomorrowSubjectId, "Cahier de test");
});

afterAll(async () => {
  // onDelete: Cascade sur Subject/ScheduleSlot/SubjectItem/ChecklistItemState/
  // Devoir/DayCompletion -- supprimer le user nettoie tout le reste en une
  // fois (même convention que data/homework.test.ts).
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

async function getPersistedCompletion() {
  return prisma.dayCompletion.findUnique({
    where: {
      userId_date_moment: {
        userId: TEST_USER_ID,
        date: new Date(`${TODAY_ISO}T00:00:00.000Z`),
        moment: DAY_COMPLETION_MOMENT_SOIR,
      },
    },
  });
}

describe("recomputeAndPersistSoirCompletion (Story 2.7, FR-20 -- contre la vraie base)", () => {
  it("est incomplet quand rien n'a encore été coché/fait, et persiste complete=false", async () => {
    const result = await recomputeAndPersistSoirCompletion(TEST_USER_ID, NOW);

    expect(result.complete).toBe(false);
    const persisted = await getPersistedCompletion();
    expect(persisted?.complete).toBe(false);
  });

  it("devient complet une fois Sac et Révisions cochés, et persiste complete=true", async () => {
    await upsertChecklistItemState({
      userId: TEST_USER_ID,
      date: new Date(`${TOMORROW_ISO}T00:00:00.000Z`),
      checklistType: CHECKLIST_TYPE_SAC,
      sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
      sourceId: (
        await prisma.subjectItem.findFirstOrThrow({
          where: { userId: TEST_USER_ID, subjectId: tomorrowSubjectId },
        })
      ).id,
      checked: true,
    });
    await upsertChecklistItemState({
      userId: TEST_USER_ID,
      date: new Date(`${TODAY_ISO}T00:00:00.000Z`),
      checklistType: CHECKLIST_TYPE_REVISIONS,
      sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT,
      sourceId: todaySubjectId,
      checked: true,
    });

    const result = await recomputeAndPersistSoirCompletion(TEST_USER_ID, NOW);

    expect(result.complete).toBe(true);
    const persisted = await getPersistedCompletion();
    expect(persisted?.complete).toBe(true);
  });

  it("un devoir 'à rendre' échéant demain, non fait, bloque la complétude même si Sac et Révisions sont cochés", async () => {
    const devoir = await createDevoir(
      TEST_USER_ID,
      tomorrowSubjectId,
      "Exercice à rendre",
      true,
      new Date(`${TOMORROW_ISO}T00:00:00.000Z`)
    );

    const result = await recomputeAndPersistSoirCompletion(TEST_USER_ID, NOW);

    expect(result.complete).toBe(false);
    const persisted = await getPersistedCompletion();
    expect(persisted?.complete).toBe(false);

    // Un devoir "à rendre" échéant demain est aussi injecté comme objet
    // cochable dans son groupe Sac (Story 2.5) -- il faut donc résoudre les
    // DEUX cases pour atteindre la complétude (voir le test dédié plus bas),
    // pas seulement `Devoir.done`.
    await toggleDevoirDone(devoir.id, TEST_USER_ID, true);
    await upsertChecklistItemState({
      userId: TEST_USER_ID,
      date: new Date(`${TOMORROW_ISO}T00:00:00.000Z`),
      checklistType: CHECKLIST_TYPE_SAC,
      sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
      sourceId: devoir.id,
      checked: true,
    });
    const afterDone = await recomputeAndPersistSoirCompletion(TEST_USER_ID, NOW);
    expect(afterDone.complete).toBe(true);
  });

  it("un devoir 'à rendre' injecté dans le Sac exige les DEUX cases (Sac préparé ET devoir fait) -- l'une sans l'autre ne suffit pas", async () => {
    // Ce devoir est "à rendre" et échéant demain sur `tomorrowSubjectId` --
    // il est donc injecté comme objet cochable dans le groupe Sac de cette
    // matière (Story 2.5), EN PLUS de sa propre case "fait" dans "Devoirs à
    // faire" (Story 2.4). Les deux sont des `ChecklistItemState`/`Devoir.done`
    // distincts -- corrige un point non testé signalé en revue.
    const devoir = await createDevoir(
      TEST_USER_ID,
      tomorrowSubjectId,
      "Deuxième exercice à rendre",
      true,
      new Date(`${TOMORROW_ISO}T00:00:00.000Z`)
    );
    // Fait ("Devoirs à faire"), mais PAS encore préparé dans le sac.
    await toggleDevoirDone(devoir.id, TEST_USER_ID, true);

    const result = await recomputeAndPersistSoirCompletion(TEST_USER_ID, NOW);
    expect(result.complete).toBe(false);

    // Préparé dans le sac (sourceType dédié, sourceId = Devoir.id) -- les
    // deux cases sont désormais cochées.
    await upsertChecklistItemState({
      userId: TEST_USER_ID,
      date: new Date(`${TOMORROW_ISO}T00:00:00.000Z`),
      checklistType: CHECKLIST_TYPE_SAC,
      sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
      sourceId: devoir.id,
      checked: true,
    });

    const afterBothChecked = await recomputeAndPersistSoirCompletion(
      TEST_USER_ID,
      NOW
    );
    expect(afterBothChecked.complete).toBe(true);
  });

  it("un devoir 'à rendre' sans échéance, ou échéant plus tard que demain, ne bloque jamais (PRD §9 confirmée)", async () => {
    await createDevoir(
      TEST_USER_ID,
      tomorrowSubjectId,
      "Sans échéance",
      true,
      null
    );
    await createDevoir(
      TEST_USER_ID,
      tomorrowSubjectId,
      "Échéance lointaine",
      true,
      new Date("2026-09-20T00:00:00.000Z")
    );

    const result = await recomputeAndPersistSoirCompletion(TEST_USER_ID, NOW);

    // Tout ce qui échéait précisément demain a déjà été traité par les tests
    // précédents (même suite, état cumulatif) -- seuls ces deux nouveaux
    // devoirs, hors périmètre de la règle, sont en jeu ici.
    expect(result.complete).toBe(true);
  });
});
