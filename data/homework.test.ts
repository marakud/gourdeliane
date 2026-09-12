import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  createDevoir,
  deleteDevoir,
  listDevoirs,
  startDevoir,
  toggleDevoirDone,
  updateDevoir,
} from "./homework";
import {
  DEVOIR_STATUS_DONE,
  DEVOIR_STATUS_IN_PROGRESS,
  DEVOIR_STATUS_TODO,
} from "@/domain/homework";

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
  // onDelete: Cascade sur Subject/Devoir/ScheduleSlot -- supprimer le user
  // nettoie tout le reste en une fois.
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
    expect(devoir.echeanceTime).toBeNull();
    expect(devoir.status).toBe(DEVOIR_STATUS_TODO);
    expect(devoir.estimatedMinutes).toBeNull();
  });

  it("accepte une durée estimée quand fournie", async () => {
    const devoir = await createDevoir(
      TEST_USER_ID,
      subjectId,
      "Exos p.12 avec durée",
      false,
      null,
      null,
      30
    );

    expect(devoir.estimatedMinutes).toBe(30);
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

  it("accepte une échéance avec heure précise (calendrier unifié, évolution CartableFlow)", async () => {
    const echeance = new Date("2026-09-17T00:00:00Z");
    const devoir = await createDevoir(
      TEST_USER_ID,
      subjectId,
      "Réviser jeudi 16h",
      false,
      echeance,
      "16:00"
    );

    expect(devoir.echeance?.toISOString()).toBe(echeance.toISOString());
    expect(devoir.echeanceTime).toBe("16:00");
  });
});

describe("toggleDevoirDone -- bidirectionnel, scopé par (id, userId)", () => {
  it("passe done à true puis reste présent en base, jamais supprimé (AD-7)", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "À cocher");
    expect(devoir.done).toBe(false);

    const updated = await toggleDevoirDone(devoir.id, TEST_USER_ID, true);
    expect(updated.done).toBe(true);
    expect(updated.status).toBe(DEVOIR_STATUS_DONE);

    const all = await listDevoirs(TEST_USER_ID);
    const persisted = all.find((d) => d.id === devoir.id);
    expect(persisted).toBeDefined();
    expect(persisted?.done).toBe(true);
  });

  it("peut redécocher un devoir déjà fait (retour utilisateur Story 2.4) -- status repasse à TODO", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "À redécocher");
    await toggleDevoirDone(devoir.id, TEST_USER_ID, true);

    const reverted = await toggleDevoirDone(devoir.id, TEST_USER_ID, false);
    expect(reverted.done).toBe(false);
    expect(reverted.status).toBe(DEVOIR_STATUS_TODO);
  });

  it("rejette une mise à jour scopée à un autre userId (protection {id, userId})", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Protégé");

    await expect(
      toggleDevoirDone(devoir.id, "un-autre-utilisateur", true)
    ).rejects.toThrow();

    const stillUnchecked = await prisma.devoir.findUnique({
      where: { id: devoir.id },
    });
    expect(stillUnchecked?.done).toBe(false);
  });
});

describe("startDevoir -- TODO -> IN_PROGRESS, idempotent (évolution CartableFlow)", () => {
  it("passe un devoir TODO à IN_PROGRESS", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "À commencer");
    expect(devoir.status).toBe(DEVOIR_STATUS_TODO);

    const result = await startDevoir(devoir.id, TEST_USER_ID);
    expect(result.started).toBe(true);

    const persisted = await prisma.devoir.findUnique({ where: { id: devoir.id } });
    expect(persisted?.status).toBe(DEVOIR_STATUS_IN_PROGRESS);
    expect(persisted?.done).toBe(false);
  });

  it("ne redémarre pas un devoir déjà IN_PROGRESS (idempotent, jamais une confiance aveugle dans le statut affiché côté client)", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Déjà en cours");
    await startDevoir(devoir.id, TEST_USER_ID);

    const second = await startDevoir(devoir.id, TEST_USER_ID);
    expect(second.started).toBe(false);
  });

  it("ne redémarre pas un devoir déjà fait", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Déjà fait");
    await toggleDevoirDone(devoir.id, TEST_USER_ID, true);

    const result = await startDevoir(devoir.id, TEST_USER_ID);
    expect(result.started).toBe(false);

    const persisted = await prisma.devoir.findUnique({ where: { id: devoir.id } });
    expect(persisted?.status).toBe(DEVOIR_STATUS_DONE);
  });

  it("rejette (started=false) une tentative scopée à un autre userId", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Protégé start");

    const result = await startDevoir(devoir.id, "un-autre-utilisateur");
    expect(result.started).toBe(false);

    const persisted = await prisma.devoir.findUnique({ where: { id: devoir.id } });
    expect(persisted?.status).toBe(DEVOIR_STATUS_TODO);
  });
});

describe("updateDevoir -- modifie un devoir existant, scopé par (id, userId)", () => {
  it("modifie tous les champs d'un devoir existant", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "À modifier");
    const echeance = new Date("2026-12-25T00:00:00Z");

    const updated = await updateDevoir(
      devoir.id,
      TEST_USER_ID,
      subjectId,
      "Description modifiée",
      true,
      echeance,
      "16:00",
      45
    );

    expect(updated.description).toBe("Description modifiée");
    expect(updated.aRendre).toBe(true);
    expect(updated.echeance?.toISOString()).toBe(echeance.toISOString());
    expect(updated.echeanceTime).toBe("16:00");
    expect(updated.estimatedMinutes).toBe(45);
  });

  it("ne touche jamais à `done` (AD-7, réservé à toggleDevoirDone)", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Fait, à modifier");
    await toggleDevoirDone(devoir.id, TEST_USER_ID, true);

    const updated = await updateDevoir(
      devoir.id,
      TEST_USER_ID,
      subjectId,
      "Description modifiée sans toucher done",
      false,
      null,
      null,
      null
    );

    expect(updated.done).toBe(true);
  });

  it("rejette une modification scopée à un autre userId (protection {id, userId})", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Protégé3");

    await expect(
      updateDevoir(
        devoir.id,
        "un-autre-utilisateur",
        subjectId,
        "Modification non autorisée",
        false,
        null,
        null,
        null
      )
    ).rejects.toThrow();

    const stillOriginal = await prisma.devoir.findUnique({ where: { id: devoir.id } });
    expect(stillOriginal?.description).toBe("Protégé3");
  });
});

describe("deleteDevoir -- suppression définitive, scopée par (id, userId)", () => {
  it("supprime le devoir", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "À supprimer");

    await deleteDevoir(devoir.id, TEST_USER_ID);

    const stillThere = await prisma.devoir.findUnique({
      where: { id: devoir.id },
    });
    expect(stillThere).toBeNull();
  });

  it("rejette une suppression scopée à un autre userId (protection {id, userId})", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Protégé2");

    await expect(
      deleteDevoir(devoir.id, "un-autre-utilisateur")
    ).rejects.toThrow();

    const stillThere = await prisma.devoir.findUnique({
      where: { id: devoir.id },
    });
    expect(stillThere).not.toBeNull();
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

  it("n'exclut pas les devoirs faits (Boundaries spec 2.4 amendée -- restent visibles)", async () => {
    const devoir = await createDevoir(TEST_USER_ID, subjectId, "Fait mais visible");
    await toggleDevoirDone(devoir.id, TEST_USER_ID, true);

    const all = await listDevoirs(TEST_USER_ID);
    expect(all.some((d) => d.id === devoir.id)).toBe(true);
  });
});
