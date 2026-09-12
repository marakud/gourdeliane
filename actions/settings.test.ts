import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../data/prisma";
import { computeWeekParity } from "../domain/schedule";
import { getTodaySchoolDate, schoolDateToIso } from "../domain/school-day";
import { setCurrentWeekParity, setFirstNameAction } from "./settings";

// Tests d'intégration contre la vraie base de dev (SQLite) -- setCurrentWeekParity
// et setFirstNameAction résolvent l'utilisateur depuis la session
// (`requireUserId`, lib/current-user.ts), mocké ici vers un utilisateur de
// test synthétique -- plus besoin de sauvegarder/restaurer les valeurs
// d'origine du vrai seed user (utilisateur jetable, supprimé en `afterAll`).
const TEST_USER_ID = "test-user-actions-settings";

vi.mock("@/lib/current-user", () => ({
  requireUserId: async () => TEST_USER_ID,
}));

function getTestUser() {
  return prisma.user.findUniqueOrThrow({ where: { id: TEST_USER_ID } });
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("setCurrentWeekParity (Story 1.4)", () => {
  it("déclare la semaine en cours comme semaine A", async () => {
    const result = await setCurrentWeekParity("A");
    expect(result.ok).toBe(true);

    const user = await getTestUser();
    expect(user.weekAReferenceMonday).not.toBeNull();
    const referenceIso = user.weekAReferenceMonday!.toISOString().slice(0, 10);
    const todayIso = schoolDateToIso(getTodaySchoolDate(new Date()));
    expect(computeWeekParity(todayIso, referenceIso)).toBe("A");
  });

  it("déclare la semaine en cours comme semaine B -- lundi de référence décalé d'une semaine (pas la même valeur que pour A)", async () => {
    const resultB = await setCurrentWeekParity("B");
    expect(resultB.ok).toBe(true);
    const userAfterB = await getTestUser();
    const referenceIsoB = userAfterB.weekAReferenceMonday!.toISOString().slice(0, 10);
    const todayIso = schoolDateToIso(getTodaySchoolDate(new Date()));
    expect(computeWeekParity(todayIso, referenceIsoB)).toBe("B");

    const resultA = await setCurrentWeekParity("A");
    expect(resultA.ok).toBe(true);
    const userAfterA = await getTestUser();
    const referenceIsoA = userAfterA.weekAReferenceMonday!.toISOString().slice(0, 10);

    // La déclaration "B" ne doit jamais dériver la même référence que "A" --
    // sinon les deux boutons de components/settings/week-parity-card.tsx
    // produiraient le même effet.
    expect(referenceIsoB).not.toBe(referenceIsoA);
  });

  it("rejette une parité invalide sans toucher à la référence existante", async () => {
    await setCurrentWeekParity("A");
    const before = (await getTestUser()).weekAReferenceMonday?.toISOString();

    const result = await setCurrentWeekParity("C");
    expect(result.ok).toBe(false);

    const after = (await getTestUser()).weekAReferenceMonday?.toISOString();
    expect(after).toBe(before);
  });
});

describe("setFirstNameAction (retour utilisateur -- message d'accueil)", () => {
  it("enregistre un prénom, trimmé", async () => {
    const result = await setFirstNameAction("  Léa  ");
    expect(result.ok).toBe(true);

    const user = await getTestUser();
    expect(user.firstName).toBe("Léa");
  });

  it("efface le prénom quand la valeur est vide ou uniquement des espaces", async () => {
    await setFirstNameAction("Léa");

    const result = await setFirstNameAction("   ");
    expect(result.ok).toBe(true);

    const user = await getTestUser();
    expect(user.firstName).toBeNull();
  });

  it("rejette un prénom trop long sans toucher à la valeur existante", async () => {
    await setFirstNameAction("Léa");
    const before = (await getTestUser()).firstName;

    const tooLong = "a".repeat(61);
    const result = await setFirstNameAction(tooLong);
    expect(result.ok).toBe(false);

    const after = (await getTestUser()).firstName;
    expect(after).toBe(before);
  });
});
