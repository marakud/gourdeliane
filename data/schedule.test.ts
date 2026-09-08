import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createScheduleSlot, setNoSchoolDay } from "./schedule";

// Tests d'intégration contre la vraie base de dev (SQLite) -- le projet n'a
// pas d'infra de base de test dédiée (Deferred par l'architecture), donc ces
// tests créent/nettoient leurs propres lignes sous un userId synthétique
// plutôt que d'inventer un environnement séparé.
const TEST_USER_ID = "test-user-schedule-integration";

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID },
  });
});

afterAll(async () => {
  // onDelete: Cascade sur Subject/ScheduleSlot/NoSchoolDay -- supprimer le
  // user nettoie tout le reste en une fois.
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("findOrCreateSubject (via createScheduleSlot) -- reuse insensible à la casse", () => {
  it("reuse la même Subject pour des noms qui ne diffèrent que par la casse", async () => {
    const first = await createScheduleSlot({
      userId: TEST_USER_ID,
      weekday: "MONDAY",
      startTime: "08:00",
      endTime: "09:00",
      subjectName: "Maths",
      weekParity: null,
    });

    const second = await createScheduleSlot({
      userId: TEST_USER_ID,
      weekday: "TUESDAY",
      startTime: "10:00",
      endTime: "11:00",
      subjectName: "maths",
      weekParity: null,
    });

    expect(second.subject.id).toBe(first.subject.id);
    expect(second.subject.colorIndex).toBe(first.subject.colorIndex);

    const subjects = await prisma.subject.findMany({
      where: { userId: TEST_USER_ID, name: { in: ["Maths", "maths"] } },
    });
    expect(subjects).toHaveLength(1);
  });
});

describe("setNoSchoolDay -- idempotence (I/O matrix spec 1.2)", () => {
  it("ne crée pas de doublon quand la même date est marquée deux fois", async () => {
    const date = new Date("2026-12-15T00:00:00Z");

    const firstCall = await setNoSchoolDay(TEST_USER_ID, date);
    const secondCall = await setNoSchoolDay(TEST_USER_ID, date);

    expect(secondCall.id).toBe(firstCall.id);

    const rows = await prisma.noSchoolDay.findMany({
      where: { userId: TEST_USER_ID, date: new Date("2026-12-15T00:00:00Z") },
    });
    expect(rows).toHaveLength(1);
  });
});
