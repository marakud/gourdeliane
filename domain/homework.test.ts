import { describe, expect, it } from "vitest";
import {
  classifyTaskView,
  computeDaysRemaining,
  computeEstimatedWorkload,
  filterDevoirsForDate,
  formatEstimatedDuration,
  TASK_VIEW_DONE,
  TASK_VIEW_LATER,
  TASK_VIEW_OVERDUE,
  TASK_VIEW_THIS_WEEK,
  TASK_VIEW_TODAY,
  TASK_VIEW_TOMORROW,
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

describe("filterDevoirsForDate (évolution CartableFlow -- calendrier unifié)", () => {
  const maths = { name: "Maths", colorIndex: 1 };

  it("keeps only devoirs whose échéance is the given date, with a precise time", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Lundi",
        done: false,
        echeanceIso: "2026-09-14",
        echeanceTime: "16:00",
        subject: maths,
      },
      {
        id: "d2",
        description: "Mardi",
        done: false,
        echeanceIso: "2026-09-15",
        echeanceTime: "16:00",
        subject: maths,
      },
    ];

    const result = filterDevoirsForDate(devoirs, "2026-09-14");

    expect(result.map((d) => d.id)).toEqual(["d1"]);
  });

  it("excludes a devoir with no precise time (echeanceTime null), even on a matching date", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Échéance sans heure",
        done: false,
        echeanceIso: "2026-09-14",
        echeanceTime: null,
        subject: maths,
      },
    ];

    expect(filterDevoirsForDate(devoirs, "2026-09-14")).toEqual([]);
  });

  it("excludes a devoir with no échéance at all", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Pas d'échéance",
        done: false,
        echeanceIso: null,
        echeanceTime: null,
        subject: maths,
      },
    ];

    expect(filterDevoirsForDate(devoirs, "2026-09-14")).toEqual([]);
  });

  it("sorts multiple devoirs on the same date by start time", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Plus tard",
        done: false,
        echeanceIso: "2026-09-14",
        echeanceTime: "18:00",
        subject: maths,
      },
      {
        id: "d2",
        description: "Plus tôt",
        done: false,
        echeanceIso: "2026-09-14",
        echeanceTime: "09:00",
        subject: maths,
      },
    ];

    const result = filterDevoirsForDate(devoirs, "2026-09-14");

    expect(result.map((d) => d.id)).toEqual(["d2", "d1"]);
  });

  it("returns an empty array when no devoir matches that date", () => {
    expect(filterDevoirsForDate([], "2026-09-14")).toEqual([]);
  });

  it("preserves each devoir's own done state and subject", () => {
    const devoirs = [
      {
        id: "d1",
        description: "Fait",
        done: true,
        echeanceIso: "2026-09-14",
        echeanceTime: "16:00",
        subject: maths,
      },
    ];

    const result = filterDevoirsForDate(devoirs, "2026-09-14");

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

describe("classifyTaskView (évolution CartableFlow -- page Mes tâches)", () => {
  it("classifies a done devoir as DONE regardless of its échéance", () => {
    expect(classifyTaskView(true, -5)).toBe(TASK_VIEW_DONE);
    expect(classifyTaskView(true, 0)).toBe(TASK_VIEW_DONE);
    expect(classifyTaskView(true, null)).toBe(TASK_VIEW_DONE);
  });

  it("classifies a not-done devoir with no échéance as LATER", () => {
    expect(classifyTaskView(false, null)).toBe(TASK_VIEW_LATER);
  });

  it("classifies a negative daysRemaining as OVERDUE", () => {
    expect(classifyTaskView(false, -1)).toBe(TASK_VIEW_OVERDUE);
    expect(classifyTaskView(false, -30)).toBe(TASK_VIEW_OVERDUE);
  });

  it("classifies daysRemaining=0 as TODAY", () => {
    expect(classifyTaskView(false, 0)).toBe(TASK_VIEW_TODAY);
  });

  it("classifies daysRemaining=1 as TOMORROW", () => {
    expect(classifyTaskView(false, 1)).toBe(TASK_VIEW_TOMORROW);
  });

  it("classifies daysRemaining=2..7 as THIS_WEEK", () => {
    for (const daysRemaining of [2, 3, 4, 5, 6, 7]) {
      expect(classifyTaskView(false, daysRemaining)).toBe(TASK_VIEW_THIS_WEEK);
    }
  });

  it("classifies daysRemaining>7 as LATER", () => {
    expect(classifyTaskView(false, 8)).toBe(TASK_VIEW_LATER);
    expect(classifyTaskView(false, 100)).toBe(TASK_VIEW_LATER);
  });
});
