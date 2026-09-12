import { describe, expect, it } from "vitest";
import {
  computeDaysRemaining,
  computeEstimatedWorkload,
  filterDevoirsForWeekday,
  formatEstimatedDuration,
} from "./homework";

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

describe("computeEstimatedWorkload (évolution CartableFlow)", () => {
  it("returns hasEstimate=false and total=0 when no devoir has an estimate", () => {
    const result = computeEstimatedWorkload([
      { done: false, estimatedMinutes: null },
      { done: false, estimatedMinutes: null },
    ]);
    expect(result).toEqual({ totalMinutes: 0, hasEstimate: false });
  });

  it("sums only the estimates of devoirs not yet done", () => {
    const result = computeEstimatedWorkload([
      { done: false, estimatedMinutes: 30 },
      { done: true, estimatedMinutes: 45 }, // déjà fait -- exclu du total
      { done: false, estimatedMinutes: 10 },
    ]);
    expect(result).toEqual({ totalMinutes: 40, hasEstimate: true });
  });

  it("ignores a done devoir with no estimate the same way as one without an estimate", () => {
    const result = computeEstimatedWorkload([
      { done: false, estimatedMinutes: 20 },
      { done: false, estimatedMinutes: null },
    ]);
    expect(result).toEqual({ totalMinutes: 20, hasEstimate: true });
  });

  it("returns hasEstimate=false for an empty list", () => {
    expect(computeEstimatedWorkload([])).toEqual({
      totalMinutes: 0,
      hasEstimate: false,
    });
  });
});

describe("formatEstimatedDuration (évolution CartableFlow)", () => {
  it("formats minutes under an hour as 'X min'", () => {
    expect(formatEstimatedDuration(30)).toBe("30 min");
    expect(formatEstimatedDuration(5)).toBe("5 min");
  });

  it("formats an exact hour as 'X h'", () => {
    expect(formatEstimatedDuration(60)).toBe("1 h");
    expect(formatEstimatedDuration(120)).toBe("2 h");
  });

  it("formats hours with a remainder as 'X h YY'", () => {
    expect(formatEstimatedDuration(70)).toBe("1 h 10");
    expect(formatEstimatedDuration(125)).toBe("2 h 05");
  });
});
