import { describe, expect, it } from "vitest";
import { computeDaysRemaining, filterDevoirsForWeekday } from "./homework";

describe("computeDaysRemaining (spec 2.4 amendment I/O matrix)", () => {
  it("returns 0 when the échéance is today", () => {
    expect(computeDaysRemaining("2026-12-20", "2026-12-20")).toBe(0);
  });

  it("returns a positive count when the échéance is in the future", () => {
    expect(computeDaysRemaining("2026-12-23", "2026-12-20")).toBe(3);
  });

  it("returns a negative count when the échéance is in the past", () => {
    expect(computeDaysRemaining("2026-12-17", "2026-12-20")).toBe(-3);
  });

  it("handles a month boundary correctly", () => {
    expect(computeDaysRemaining("2027-01-02", "2026-12-30")).toBe(3);
  });
});

describe("filterDevoirsForWeekday (spec 2.4 amendment -- retour utilisateur, disponibilité EDT)", () => {
  const maths = { name: "Maths", colorIndex: 1 };

  it("keeps only devoirs planned for the given weekday", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Lundi",
        done: false,
        plannedWeekday: "MONDAY",
        plannedStartTime: "16:00",
        subject: maths,
      },
      {
        id: "d2",
        description: "Mardi",
        done: false,
        plannedWeekday: "TUESDAY",
        plannedStartTime: "16:00",
        subject: maths,
      },
    ];

    const result = filterDevoirsForWeekday(devoirs, "MONDAY");

    expect(result.map((d) => d.id)).toEqual(["d1"]);
  });

  it("excludes an unplanned devoir (no plannedWeekday) regardless of weekday", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Pas programmé",
        done: false,
        plannedWeekday: null,
        plannedStartTime: null,
        subject: maths,
      },
    ];

    expect(filterDevoirsForWeekday(devoirs, "MONDAY")).toEqual([]);
  });

  it("sorts multiple devoirs planned the same day by start time", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Plus tard",
        done: false,
        plannedWeekday: "MONDAY",
        plannedStartTime: "18:00",
        subject: maths,
      },
      {
        id: "d2",
        description: "Plus tôt",
        done: false,
        plannedWeekday: "MONDAY",
        plannedStartTime: "09:00",
        subject: maths,
      },
    ];

    const result = filterDevoirsForWeekday(devoirs, "MONDAY");

    expect(result.map((d) => d.id)).toEqual(["d2", "d1"]);
  });

  it("returns an empty array when no devoir is planned for that day", () => {
    expect(filterDevoirsForWeekday([], "SUNDAY")).toEqual([]);
  });

  it("preserves each devoir's own done state and subject", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Fait",
        done: true,
        plannedWeekday: "MONDAY",
        plannedStartTime: "16:00",
        subject: maths,
      },
    ];

    const result = filterDevoirsForWeekday(devoirs, "MONDAY");

    expect(result[0]).toEqual({
      id: "d1",
      description: "Fait",
      done: true,
      subject: maths,
      plannedStartTime: "16:00",
    });
  });
});
