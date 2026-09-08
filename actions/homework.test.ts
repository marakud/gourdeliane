import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../data/prisma";
import { ensureSeedUser } from "../data/user";
import {
  createDevoirAction,
  deleteDevoirAction,
  toggleDevoirDoneAction,
  updateDevoirAction,
} from "./homework";

// Tests d'intégration contre la vraie base de dev (SQLite). Comme
// actions/checklist.test.ts, ces actions appellent en interne
// `ensureSeedUser()` -- pas de userId synthétique possible, elles agissent
// toujours sur l'utilisateur unique réel de l'app. Le nettoyage se fait donc
// par `description` (distinctive à chaque test) plutôt que par userId.
//
// `revalidatePath` lève hors d'une requête Next.js (avalé par
// `safeRevalidate`) -- ces actions restent testables directement ici sans
// serveur Next.js démarré.

const TEST_DESCRIPTIONS = [
  "action-test-devoir-minimal",
  "action-test-devoir-complet",
  "action-test-devoir-toggle",
  "action-test-devoir-untoggle",
  "action-test-devoir-bad-echeance",
  "action-test-devoir-invalid-calendar-date",
  "action-test-devoir-planned",
  "action-test-devoir-partial-plan-day",
  "action-test-devoir-partial-plan-time",
  "action-test-devoir-bad-weekday",
  "action-test-devoir-bad-time",
  "action-test-devoir-delete",
  "action-test-devoir-update-before",
  "action-test-devoir-update-after",
  "action-test-devoir-update-done-preserved",
  "action-test-devoir-update-done-preserved (modifié)",
  "action-test-devoir-update-bad",
  "action-test-devoir-update-empty-id",
];

let subjectId: string;

async function ensureTestSubject() {
  const user = await ensureSeedUser();
  const subject = await prisma.subject.create({
    data: { userId: user.id, name: `action-test-subject-${Date.now()}`, colorIndex: 1 },
  });
  subjectId = subject.id;
  return subject;
}

afterAll(async () => {
  await prisma.devoir.deleteMany({
    where: { description: { in: TEST_DESCRIPTIONS } },
  });
  if (subjectId) {
    await prisma.subject.delete({ where: { id: subjectId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe("createDevoirAction -- création minimale (spec 2.4 I/O matrix)", () => {
  it("crée un devoir avec matière + description seules, aRendre=false et echeance=null", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-minimal",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const devoir = await prisma.devoir.findUnique({ where: { id: result.data.id } });
    expect(devoir?.aRendre).toBe(false);
    expect(devoir?.echeance).toBeNull();
    expect(devoir?.done).toBe(false);
    expect(devoir?.plannedWeekday).toBeNull();
    expect(devoir?.plannedStartTime).toBeNull();
  });

  it("accepte aRendre + echeance quand fournis", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-complet",
      aRendre: true,
      echeance: "2026-12-20",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const devoir = await prisma.devoir.findUnique({ where: { id: result.data.id } });
    expect(devoir?.aRendre).toBe(true);
    expect(devoir?.echeance?.toISOString().slice(0, 10)).toBe("2026-12-20");
  });

  it("accepte un placement (jour + heure) dans un trou libre de l'EDT (retour utilisateur Story 2.4)", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-planned",
      plannedWeekday: "THURSDAY",
      plannedStartTime: "16:00",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const devoir = await prisma.devoir.findUnique({ where: { id: result.data.id } });
    expect(devoir?.plannedWeekday).toBe("THURSDAY");
    expect(devoir?.plannedStartTime).toBe("16:00");
  });

  it("rejette un jour sans heure (créneau incomplet)", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-partial-plan-day",
      plannedWeekday: "THURSDAY",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette une heure sans jour (créneau incomplet)", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-partial-plan-time",
      plannedStartTime: "16:00",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette un jour de la semaine invalide", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-bad-weekday",
      plannedWeekday: "SOMEDAY",
      plannedStartTime: "16:00",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette un horaire mal formé", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-bad-time",
      plannedWeekday: "THURSDAY",
      plannedStartTime: "16h00",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette une description vide", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({ subjectId, description: "   " });
    expect(result.ok).toBe(false);
  });

  it("rejette une matière invalide", async () => {
    const result = await createDevoirAction({
      subjectId: "",
      description: "action-test-devoir-minimal",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette une échéance mal formée plutôt que de l'ignorer silencieusement", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-bad-echeance",
      echeance: "pas-une-date",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette une échéance calendairement invalide plutôt que de la reporter silencieusement (ex. 30 février)", async () => {
    await ensureTestSubject();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-invalid-calendar-date",
      echeance: "2026-02-30",
    });
    expect(result.ok).toBe(false);
  });
});

describe("toggleDevoirDoneAction -- bidirectionnel, jamais supprimé (AD-7)", () => {
  it("passe done à true et le devoir reste en base", async () => {
    await ensureTestSubject();

    const created = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-toggle",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const toggled = await toggleDevoirDoneAction({ id: created.data.id, done: true });
    expect(toggled.ok).toBe(true);

    const devoir = await prisma.devoir.findUnique({ where: { id: created.data.id } });
    expect(devoir).not.toBeNull();
    expect(devoir?.done).toBe(true);
  });

  it("peut redécocher un devoir déjà fait (retour utilisateur Story 2.4)", async () => {
    await ensureTestSubject();

    const created = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-untoggle",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await toggleDevoirDoneAction({ id: created.data.id, done: true });
    const reverted = await toggleDevoirDoneAction({ id: created.data.id, done: false });
    expect(reverted.ok).toBe(true);

    const devoir = await prisma.devoir.findUnique({ where: { id: created.data.id } });
    expect(devoir?.done).toBe(false);
  });

  it("rejette un id vide", async () => {
    const result = await toggleDevoirDoneAction({ id: "", done: true });
    expect(result.ok).toBe(false);
  });
});

describe("updateDevoirAction -- modification (retour utilisateur)", () => {
  it("modifie un devoir existant", async () => {
    await ensureTestSubject();

    const created = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-update-before",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await updateDevoirAction(created.data.id, {
      subjectId,
      description: "action-test-devoir-update-after",
      aRendre: true,
      echeance: "2026-12-20",
      plannedWeekday: "THURSDAY",
      plannedStartTime: "16:00",
    });
    expect(updated.ok).toBe(true);

    const devoir = await prisma.devoir.findUnique({ where: { id: created.data.id } });
    expect(devoir?.description).toBe("action-test-devoir-update-after");
    expect(devoir?.aRendre).toBe(true);
    expect(devoir?.plannedWeekday).toBe("THURSDAY");
    expect(devoir?.plannedStartTime).toBe("16:00");
  });

  it("ne touche jamais à `done` (AD-7, réservé à toggleDevoirDoneAction)", async () => {
    await ensureTestSubject();

    const created = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-update-done-preserved",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await toggleDevoirDoneAction({ id: created.data.id, done: true });

    const updated = await updateDevoirAction(created.data.id, {
      subjectId,
      description: "action-test-devoir-update-done-preserved (modifié)",
    });
    expect(updated.ok).toBe(true);

    const devoir = await prisma.devoir.findUnique({ where: { id: created.data.id } });
    expect(devoir?.done).toBe(true);
  });

  it("rejette une description vide", async () => {
    await ensureTestSubject();

    const created = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-update-bad",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await updateDevoirAction(created.data.id, {
      subjectId,
      description: "   ",
    });
    expect(result.ok).toBe(false);
  });

  it("rejette un id vide", async () => {
    const result = await updateDevoirAction("", {
      subjectId,
      description: "action-test-devoir-update-empty-id",
    });
    expect(result.ok).toBe(false);
  });
});

describe("deleteDevoirAction -- suppression définitive (retour utilisateur Story 2.4)", () => {
  it("supprime le devoir", async () => {
    await ensureTestSubject();

    const created = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-delete",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = await deleteDevoirAction({ id: created.data.id });
    expect(deleted.ok).toBe(true);

    const devoir = await prisma.devoir.findUnique({ where: { id: created.data.id } });
    expect(devoir).toBeNull();
  });

  it("rejette un id vide", async () => {
    const result = await deleteDevoirAction({ id: "" });
    expect(result.ok).toBe(false);
  });
});
