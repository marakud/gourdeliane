import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../data/prisma";
import { createDevoirAction } from "./homework";
import { startHomeworkTimerAction, stopHomeworkTimerAction } from "./homework-timer";
import { DEVOIR_STATUS_IN_PROGRESS } from "@/domain/homework";
import { TIMER_MODE_CHRONO, TIMER_MODE_MINUTEUR } from "@/domain/homework-timer";

// Tests d'intégration contre la vraie base de dev (SQLite), même convention
// que actions/homework.test.ts.

const TEST_USER_ID = "test-user-actions-homework-timer";

vi.mock("@/lib/current-user", () => ({
  requireUserId: async () => TEST_USER_ID,
}));

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
});

let subjectId: string;
let devoirId: string;

async function ensureTestDevoir() {
  const subject = await prisma.subject.create({
    data: { userId: TEST_USER_ID, name: `timer-test-subject-${Date.now()}`, colorIndex: 1 },
  });
  subjectId = subject.id;
  const created = await createDevoirAction({
    subjectId,
    description: "timer-test-devoir",
  });
  if (!created.ok) throw new Error("setup failed");
  devoirId = created.data.id;
  return devoirId;
}

afterAll(async () => {
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("startHomeworkTimerAction", () => {
  it("démarre un chronomètre et passe le devoir en IN_PROGRESS", async () => {
    await ensureTestDevoir();

    const result = await startHomeworkTimerAction({ devoirId, mode: TIMER_MODE_CHRONO });
    expect(result.ok).toBe(true);

    const devoir = await prisma.devoir.findUnique({ where: { id: devoirId } });
    expect(devoir?.status).toBe(DEVOIR_STATUS_IN_PROGRESS);

    const session = await prisma.homeworkTimeSession.findFirst({ where: { devoirId } });
    expect(session?.mode).toBe(TIMER_MODE_CHRONO);
    expect(session?.plannedSeconds).toBeNull();
    expect(session?.endedAt).toBeNull();
  });

  it("démarre un minuteur avec la durée convertie en secondes", async () => {
    await ensureTestDevoir();

    const result = await startHomeworkTimerAction({
      devoirId,
      mode: TIMER_MODE_MINUTEUR,
      plannedMinutes: 45,
    });
    expect(result.ok).toBe(true);

    const session = await prisma.homeworkTimeSession.findFirst({ where: { devoirId } });
    expect(session?.mode).toBe(TIMER_MODE_MINUTEUR);
    expect(session?.plannedSeconds).toBe(45 * 60);
  });

  it("rejette un minuteur sans durée", async () => {
    await ensureTestDevoir();

    const result = await startHomeworkTimerAction({ devoirId, mode: TIMER_MODE_MINUTEUR });
    expect(result.ok).toBe(false);
  });

  it("rejette une durée de minuteur invalide (négative, décimale, ou hors bornes)", async () => {
    await ensureTestDevoir();

    for (const plannedMinutes of [-5, 0, 1.5, 481]) {
      const result = await startHomeworkTimerAction({
        devoirId,
        mode: TIMER_MODE_MINUTEUR,
        plannedMinutes,
      });
      expect(result.ok).toBe(false);
    }
  });

  it("rejette un mode invalide", async () => {
    await ensureTestDevoir();

    const result = await startHomeworkTimerAction({ devoirId, mode: "PAUSE" });
    expect(result.ok).toBe(false);
  });

  it("rejette un devoir vide", async () => {
    const result = await startHomeworkTimerAction({ devoirId: "", mode: TIMER_MODE_CHRONO });
    expect(result.ok).toBe(false);
  });

  it("refuse de démarrer une 2e session tant que la précédente est active (jamais un empilement silencieux)", async () => {
    await ensureTestDevoir();
    await startHomeworkTimerAction({ devoirId, mode: TIMER_MODE_CHRONO });

    const second = await startHomeworkTimerAction({ devoirId, mode: TIMER_MODE_CHRONO });
    expect(second.ok).toBe(false);

    const sessions = await prisma.homeworkTimeSession.findMany({ where: { devoirId } });
    expect(sessions).toHaveLength(1);
  });

  it("permet de redémarrer une nouvelle session une fois la précédente arrêtée", async () => {
    await ensureTestDevoir();
    await startHomeworkTimerAction({ devoirId, mode: TIMER_MODE_CHRONO });
    await stopHomeworkTimerAction({ devoirId });

    const second = await startHomeworkTimerAction({ devoirId, mode: TIMER_MODE_CHRONO });
    expect(second.ok).toBe(true);

    const sessions = await prisma.homeworkTimeSession.findMany({ where: { devoirId } });
    expect(sessions).toHaveLength(2);
  });
});

describe("stopHomeworkTimerAction", () => {
  it("arrête la session active sans marquer le devoir fait", async () => {
    await ensureTestDevoir();
    await startHomeworkTimerAction({ devoirId, mode: TIMER_MODE_CHRONO });

    const result = await stopHomeworkTimerAction({ devoirId });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.stopped).toBe(true);

    const devoir = await prisma.devoir.findUnique({ where: { id: devoirId } });
    expect(devoir?.done).toBe(false);
    expect(devoir?.status).toBe(DEVOIR_STATUS_IN_PROGRESS);
  });

  it("rejette un devoir vide", async () => {
    const result = await stopHomeworkTimerAction({ devoirId: "" });
    expect(result.ok).toBe(false);
  });
});
