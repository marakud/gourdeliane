import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../data/prisma";
import { ensureSeedUser } from "../data/user";
import { createDevoirAction, toggleDevoirDoneAction } from "./homework";

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
  "action-test-devoir-bad-echeance",
  "action-test-devoir-invalid-calendar-date",
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

describe("toggleDevoirDoneAction -- marque fait, jamais supprimé (AD-7)", () => {
  it("passe done à true et le devoir reste en base", async () => {
    await ensureTestSubject();

    const created = await createDevoirAction({
      subjectId,
      description: "action-test-devoir-toggle",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const toggled = await toggleDevoirDoneAction({ id: created.data.id });
    expect(toggled.ok).toBe(true);

    const devoir = await prisma.devoir.findUnique({ where: { id: created.data.id } });
    expect(devoir).not.toBeNull();
    expect(devoir?.done).toBe(true);
  });

  it("rejette un id vide", async () => {
    const result = await toggleDevoirDoneAction({ id: "" });
    expect(result.ok).toBe(false);
  });
});
