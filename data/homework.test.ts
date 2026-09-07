import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createDevoir, listDevoirs, markDevoirDone } from "./homework";

// Tests d'intégration contre la vraie base de dev (SQLite), même convention
// que data/checklist.test.ts -- userId synthétique distinct pour ne pas
// interférer si les fichiers de test tournent en parallèle.
const TEST_USER_ID = "test-user-homework-integration";
let subjectId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
  const subject = await prisma.subject.create({
    data: { userId: TEST_USER_ID, name: "Test Homework Subject", colorIndex: 1 },
  });
  subjectId = subject.id;
});

afterAll(async () => {
  // onDelete: Cascade sur Subject/Devoir -- supprimer le user nettoie tout
  // le reste en une fois.
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("createDevoir -- création minimale (spec 2.4 I/O matrix)", () => {
  it("crée un devoir avec matière + description seules, aRendre=false et echeance=null par défaut", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Exos p.12");

    expect(devoir.description).toBe("Exos p.12");
    expect(devoir.aRendre).toBe(false);
    expect(devoir.echeance).toBeNull();
    expect(devoir.done).toBe(false);
    expect(devoir.subjectId).toBe(subjectId);
  });

  it("accepte aRendre et echeance quand fournis", async () => {
    const echeance = new Date("2026-12-20T00:00:00Z");
    const devoir = await createDevoir(
      TEST_USER_ID,
      subjectId,
      "Rendre le compte-rendu",
      true,
      echeance
    );

    expect(devoir.aRendre).toBe(true);
    expect(devoir.echeance?.toISOString()).toBe(echeance.toISOString());
  });
});

describe("markDevoirDone -- scopé par (id, userId) (AD-7)", () => {
  it("passe done à true puis le devoir n'est plus renvoyé comme 'à faire' par le filtre du domaine", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "À cocher");
    expect(devoir.done).toBe(false);

    const updated = await markDevoirDone(devoir.id, TEST_USER_ID);
    expect(updated.done).toBe(true);

    const all = await listDevoirs(TEST_USER_ID);
    const persisted = all.find((d) => d.id === devoir.id);
    // Toujours présent en base (jamais supprimé, AD-7) -- même si "fait".
    expect(persisted).toBeDefined();
    expect(persisted?.done).toBe(true);
  });

  it("rejette une mise à jour scopée à un autre userId (protection {id, userId})", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Protégé");

    await expect(
      markDevoirDone(devoir.id, "un-autre-utilisateur")
    ).rejects.toThrow();

    const stillUnchecked = await prisma.devoir.findUnique({
      where: { id: devoir.id },
    });
    expect(stillUnchecked?.done).toBe(false);
  });
});

describe("listDevoirs -- ordre createdAt asc, matière incluse", () => {
  it("renvoie les devoirs dans l'ordre de création, avec leur matière", async () => {
    const before = await listDevoirs(TEST_USER_ID);
    const beforeIds = new Set(before.map((d) => d.id));

    const first = await createDevoir(TEST_USER_ID, subjectId, "Premier");
    const second = await createDevoir(TEST_USER_ID, subjectId, "Second");

    const after = await listDevoirs(TEST_USER_ID);
    const newOnes = after.filter((d) => !beforeIds.has(d.id));

    expect(newOnes.map((d) => d.id)).toEqual([first.id, second.id]);
    expect(newOnes[0].subject.id).toBe(subjectId);
  });
});
