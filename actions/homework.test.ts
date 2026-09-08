import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../data/prisma";
import { ensureSeedUser } from "../data/user";
import {
  createDevoirAction,
  deleteDevoirAction,
  toggleDevoirDoneAction,
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
  "action-test-devoir-slot",
  "action-test-devoir-delete",
];

let subjectId: string;
let scheduleSlotId: string;

async function ensureTestSubject() {
  const user = await ensureSeedUser();
  const subject = await prisma.subject.create({
    data: { userId: user.id, name: `action-test-subject-${Date.now()}`, colorIndex: 1 },
  });
  subjectId = subject.id;
  return subject;
}

async function ensureTestSlot() {
  const user = await ensureSeedUser();
  if (!subjectId) await ensureTestSubject();
  const slot = await prisma.scheduleSlot.create({
    data: {
      userId: user.id,
      subjectId,
      weekday: "THURSDAY",
      startTime: "08:00",
      endTime: "09:00",
    },
  });
  scheduleSlotId = slot.id;
  return slot;
}

afterAll(async () => {
  await prisma.devoir.deleteMany({
    where: { description: { in: TEST_DESCRIPTIONS } },
  });
  if (scheduleSlotId) {
    await prisma.scheduleSlot.delete({ where: { id: scheduleSlotId } }).catch(() => {});
  }
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
    expect(devoir?.scheduleSlotId).toBeNull();
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

  it("accepte un rattachement à un créneau EDT existant (retour utilisateur Story 2.4)", async () => {
    await ensureTestSlot();

    const result = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-slot",
      scheduleSlotId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const devoir = await prisma.devoir.findUnique({ where: { id: result.data.id } });
    expect(devoir?.scheduleSlotId).toBe(scheduleSlotId);
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
