import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../data/prisma";
import { ensureSeedUser } from "../data/user";
import { computeWeekParity } from "../domain/schedule";
import { getTodaySchoolDate, schoolDateToIso } from "../domain/school-day";
import { setCurrentWeekParity } from "./settings";

// Tests d'intégration contre la vraie base de dev (SQLite) -- setCurrentWeekParity
// agit sur User.weekAReferenceMonday, un champ singleton du seed user réel
// (pas de userId synthétique possible ici, même contrainte qu'actions/checklist.test.ts).
// La valeur d'origine est sauvegardée puis restaurée après coup pour ne pas
// altérer l'état réel de l'app entre deux exécutions de la suite --
// `fileParallelism: false` (vitest.config.ts) garantit qu'aucun autre fichier
// de test ne touche ce même champ en même temps.
let originalReference: Date | null = null;

beforeAll(async () => {
  const user = await ensureSeedUser();
  originalReference = user.weekAReferenceMonday;
});

afterAll(async () => {
  const user = await ensureSeedUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { weekAReferenceMonday: originalReference },
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
