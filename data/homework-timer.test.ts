import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createDevoir } from "./homework";
import {
  endActiveHomeworkTimeSession,
  listHomeworkTimeSessions,
  startHomeworkTimeSession,
} from "./homework-timer";
import { TIMER_MODE_CHRONO, TIMER_MODE_MINUTEUR } from "@/domain/homework-timer";

// Tests d'intégration contre la vraie base de dev (SQLite), même convention
// que data/homework.test.ts -- userId synthétique distinct.
const TEST_USER_ID = "test-user-homework-timer-integration";
let subjectId: string;
let devoirId: string;

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
  const subject = await prisma.subject.create({
    data: { userId: TEST_USER_ID, name: "Test Timer Subject", colorIndex: 1 },
  });
  subjectId = subject.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

async function ensureTestDevoir() {
  const devoir = await createDevoir(TEST_USER_ID, subjectId, "Devoir pour minuteur");
  devoirId = devoir.id;
  return devoir;
}

describe("startHomeworkTimeSession", () => {
  it("crée une session CHRONO sans durée prévue", async () => {
    await ensureTestDevoir();

    const session = await startHomeworkTimeSession(
      TEST_USER_ID,
      devoirId,
      TIMER_MODE_CHRONO,
      null
    );

    expect(session.mode).toBe(TIMER_MODE_CHRONO);
    expect(session.plannedSeconds).toBeNull();
    expect(session.endedAt).toBeNull();
  });

  it("crée une session MINUTEUR avec durée prévue", async () => {
    await ensureTestDevoir();

    const session = await startHomeworkTimeSession(
      TEST_USER_ID,
      devoirId,
      TIMER_MODE_MINUTEUR,
      3600
    );

    expect(session.mode).toBe(TIMER_MODE_MINUTEUR);
    expect(session.plannedSeconds).toBe(3600);
  });
});

describe("endActiveHomeworkTimeSession", () => {
  it("termine la session active d'un devoir", async () => {
    await ensureTestDevoir();
    await startHomeworkTimeSession(TEST_USER_ID, devoirId, TIMER_MODE_CHRONO, null);

    const result = await endActiveHomeworkTimeSession(TEST_USER_ID, devoirId);
    expect(result.stopped).toBe(true);

    const sessions = await prisma.homeworkTimeSession.findMany({ where: { devoirId } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].endedAt).not.toBeNull();
  });

  it("est idempotent -- aucune session active ne produit stopped=false, pas une erreur", async () => {
    await ensureTestDevoir();

    const result = await endActiveHomeworkTimeSession(TEST_USER_ID, devoirId);
    expect(result.stopped).toBe(false);
  });

  it("ne touche jamais la session d'un autre devoir", async () => {
    await ensureTestDevoir();
    const otherDevoir = await createDevoir(TEST_USER_ID, subjectId, "Autre devoir");
    await startHomeworkTimeSession(TEST_USER_ID, otherDevoir.id, TIMER_MODE_CHRONO, null);

    await endActiveHomeworkTimeSession(TEST_USER_ID, devoirId);

    const otherSessions = await prisma.homeworkTimeSession.findMany({
      where: { devoirId: otherDevoir.id },
    });
    expect(otherSessions[0].endedAt).toBeNull();
  });
});

describe("listHomeworkTimeSessions", () => {
  it("renvoie toutes les sessions d'un utilisateur, tous devoirs confondus", async () => {
    const userId = `${TEST_USER_ID}-list`;
    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId } });
    const subject = await prisma.subject.create({
      data: { userId, name: "Subject list test", colorIndex: 2 },
    });
    const devoirA = await createDevoir(userId, subject.id, "Devoir A");
    const devoirB = await createDevoir(userId, subject.id, "Devoir B");

    await startHomeworkTimeSession(userId, devoirA.id, TIMER_MODE_CHRONO, null);
    await startHomeworkTimeSession(userId, devoirB.id, TIMER_MODE_MINUTEUR, 900);

    const sessions = await listHomeworkTimeSessions(userId);
    expect(sessions.map((s) => s.devoirId).sort()).toEqual(
      [devoirA.id, devoirB.id].sort()
    );

    await prisma.user.delete({ where: { id: userId } });
  });
});
