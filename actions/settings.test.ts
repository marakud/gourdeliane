import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../data/prisma";
import { ensureSeedUser } from "../data/user";
import { computeWeekParity } from "../domain/schedule";
import { getTodaySchoolDate, schoolDateToIso } from "../domain/school-day";
import { setCurrentWeekParity, setFirstNameAction } from "./settings";

// Tests d'intégration contre la vraie base de dev (SQLite) -- setCurrentWeekParity
// et setFirstNameAction agissent tous deux sur des champs singleton du seed
// user réel (pas de userId synthétique possible ici, même contrainte
// qu'actions/checklist.test.ts). Leurs valeurs d'origine sont sauvegardées
// puis restaurées après coup pour ne pas altérer l'état réel de l'app entre
// deux exécutions de la suite -- `fileParallelism: false` (vitest.config.ts)
// garantit qu'aucun autre fichier de test ne touche ces mêmes champs en même
// temps.
let originalReference: Date | null = null;
let originalFirstName: string | null = null;

beforeAll(async () => {
  const user = await ensureSeedUser();
  originalReference = user.weekAReferenceMonday;
  originalFirstName = user.firstName;
});

afterAll(async () => {
  const user = await ensureSeedUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      weekAReferenceMonday: originalReference,
      firstName: originalFirstName,
    },
  });
  await prisma.$disconnect();
});

describe("setCurrentWeekParity (Story 1.4)", () => {
  it("déclare la semaine en cours comme semaine A", async () => {
    const result = await setCurrentWeekParity("A");
    expect(result.ok).toBe(true);

    const user = await ensureSeedUser();
    expect(user.weekAReferenceMonday).not.toBeNull();
    const referenceIso = user.weekAReferenceMonday!.toISOString().slice(0, 10);
    const todayIso = schoolDateToIso(getTodaySchoolDate(new Date()));
    expect(computeWeekParity(todayIso, referenceIso)).toBe("A");
  });

  it("déclare la semaine en cours comme semaine B -- lundi de référence décalé d'une semaine (pas la même valeur que pour A)", async () => {
    const resultB = await setCurrentWeekParity("B");
    expect(resultB.ok).toBe(true);
    const userAfterB = await ensureSeedUser();
    const referenceIsoB = userAfterB.weekAReferenceMonday!.toISOString().slice(0, 10);
    const todayIso = schoolDateToIso(getTodaySchoolDate(new Date()));
    expect(computeWeekParity(todayIso, referenceIsoB)).toBe("B");

    const resultA = await setCurrentWeekParity("A");
    expect(resultA.ok).toBe(true);
    const userAfterA = await ensureSeedUser();
    const referenceIsoA = userAfterA.weekAReferenceMonday!.toISOString().slice(0, 10);

    // La déclaration "B" ne doit jamais dériver la même référence que "A" --
    // sinon les deux boutons de components/settings/week-parity-card.tsx
    // produiraient le même effet.
    expect(referenceIsoB).not.toBe(referenceIsoA);
  });

  it("rejette une parité invalide sans toucher à la référence existante", async () => {
    await setCurrentWeekParity("A");
    const before = (await ensureSeedUser()).weekAReferenceMonday?.toISOString();

    const result = await setCurrentWeekParity("C");
    expect(result.ok).toBe(false);

    const after = (await ensureSeedUser()).weekAReferenceMonday?.toISOString();
    expect(after).toBe(before);
  });
});

describe("setFirstNameAction (retour utilisateur -- message d'accueil)", () => {
  it("enregistre un prénom, trimmé", async () => {
    const result = await setFirstNameAction("  Léa  ");
    expect(result.ok).toBe(true);

    const user = await ensureSeedUser();
    expect(user.firstName).toBe("Léa");
  });

  it("efface le prénom quand la valeur est vide ou uniquement des espaces", async () => {
    await setFirstNameAction("Léa");

    const result = await setFirstNameAction("   ");
    expect(result.ok).toBe(true);

    const user = await ensureSeedUser();
    expect(user.firstName).toBeNull();
  });

  it("rejette un prénom trop long sans toucher à la valeur existante", async () => {
    await setFirstNameAction("Léa");
    const before = (await ensureSeedUser()).firstName;

    const tooLong = "a".repeat(61);
    const result = await setFirstNameAction(tooLong);
    expect(result.ok).toBe(false);

    const after = (await ensureSeedUser()).firstName;
    expect(after).toBe(before);
  });
});
