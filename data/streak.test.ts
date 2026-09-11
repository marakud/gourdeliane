import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { getStreakForUser } from "./streak";
import { DAY_COMPLETION_MOMENT_SOIR } from "@/domain/day-completion";

// Tests d'intégration contre la vraie base de dev (SQLite), même convention
// que data/day-completion.test.ts -- userId synthétique distinct.
//
// Lundi 7, mardi 8, mercredi 9 septembre 2026 : trois jours scolaires
// consécutifs connus (même semaine que data/day-completion.test.ts).
// `weekAReferenceMonday` volontairement non défini pour cet utilisateur de
// test -- `weekParity: null` sur le créneau (cf. domain/schedule.ts::
// deriveDaySlots) suffit à le faire matcher "toutes les semaines".
const TEST_USER_ID = "test-user-streak-integration";

async function upsertSoirCompletion(dateIso: string, complete: boolean) {
  await prisma.dayCompletion.upsert({
    where: {
      userId_date_moment: {
        userId: TEST_USER_ID,
        date: new Date(`${dateIso}T00:00:00.000Z`),
        moment: DAY_COMPLETION_MOMENT_SOIR,
      },
    },
    create: {
      userId: TEST_USER_ID,
      date: new Date(`${dateIso}T00:00:00.000Z`),
      moment: DAY_COMPLETION_MOMENT_SOIR,
      complete,
    },
    update: { complete },
  });
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
  const subject = await prisma.subject.create({
    data: { userId: TEST_USER_ID, name: "Test Streak Subject", colorIndex: 1 },
  });
  // Un créneau chaque jour scolaire lundi-jeudi (weekParity: null --
  // "toutes les semaines") : suffisant pour que `deriveDaySlots` reconnaisse
  // ces jours comme scolaires dans `getStreakForUser`.
  for (const weekday of ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"] as const) {
    await prisma.scheduleSlot.create({
      data: {
        userId: TEST_USER_ID,
        subjectId: subject.id,
        weekday,
        startTime: "08:00",
        endTime: "09:00",
      },
    });
  }
});

afterAll(async () => {
  // onDelete: Cascade sur Subject/ScheduleSlot/DayCompletion -- supprimer le
  // user nettoie tout le reste en une fois (même convention que
  // data/day-completion.test.ts).
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("getStreakForUser (refonte visuelle étape 8, contre la vraie base)", () => {
  it("returns zero/zero when no DayCompletion row exists yet", async () => {
    const result = await getStreakForUser(
      TEST_USER_ID,
      new Date("2026-09-01T18:00:00.000Z")
    );
    expect(result).toEqual({ current: 0, best: 0 });
  });

  it("counts three consecutive complete school days as current=best=3", async () => {
    await upsertSoirCompletion("2026-09-07", true); // lundi
    await upsertSoirCompletion("2026-09-08", true); // mardi
    await upsertSoirCompletion("2026-09-09", true); // mercredi

    const result = await getStreakForUser(
      TEST_USER_ID,
      new Date("2026-09-09T18:00:00.000Z")
    );
    expect(result).toEqual({ current: 3, best: 3 });
  });

  it("today (jeudi) without a row yet neither breaks nor extends the streak", async () => {
    const result = await getStreakForUser(
      TEST_USER_ID,
      new Date("2026-09-10T14:00:00.000Z")
    );
    expect(result).toEqual({ current: 3, best: 3 });
  });
});
