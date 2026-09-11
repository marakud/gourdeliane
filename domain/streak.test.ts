import { describe, expect, it } from "vitest";
import { computeStreak, type DayCompletionRecord } from "./streak";

function schoolDays(...isoDates: string[]): Set<string> {
  return new Set(isoDates);
}

describe("computeStreak (refonte visuelle étape 8, FR-13/FR-15)", () => {
  it("returns zero/zero with no records", () => {
    expect(computeStreak([], schoolDays("2026-09-10"), "2026-09-10")).toEqual({
      current: 0,
      best: 0,
    });
  });

  it("counts a run of consecutive complete school days as both current and best", () => {
    const records: DayCompletionRecord[] = [
      { dateIso: "2026-09-08", complete: true },
      { dateIso: "2026-09-09", complete: true },
      { dateIso: "2026-09-10", complete: true },
    ];
    const days = schoolDays("2026-09-08", "2026-09-09", "2026-09-10");
    expect(computeStreak(records, days, "2026-09-10")).toEqual({
      current: 3,
      best: 3,
    });
  });

  it("a school day with no record breaks the streak (no retroactive recompute, documented limitation)", () => {
    const records: DayCompletionRecord[] = [
      { dateIso: "2026-09-08", complete: true },
      // 2026-09-09 : jour scolaire, aucune ligne -- traité comme une absence.
      { dateIso: "2026-09-10", complete: true },
    ];
    const days = schoolDays("2026-09-08", "2026-09-09", "2026-09-10");
    expect(computeStreak(records, days, "2026-09-10")).toEqual({
      current: 1,
      best: 1,
    });
  });

  it("a school day explicitly incomplete breaks the streak", () => {
    const records: DayCompletionRecord[] = [
      { dateIso: "2026-09-08", complete: true },
      { dateIso: "2026-09-09", complete: false },
      { dateIso: "2026-09-10", complete: true },
    ];
    const days = schoolDays("2026-09-08", "2026-09-09", "2026-09-10");
    expect(computeStreak(records, days, "2026-09-10")).toEqual({
      current: 1,
      best: 1,
    });
  });

  it("a non-school day (weekend/jour sans cours) is neutral -- neither breaks nor extends", () => {
    const records: DayCompletionRecord[] = [
      { dateIso: "2026-09-08", complete: true },
      { dateIso: "2026-09-10", complete: true },
    ];
    // 2026-09-09 volontairement absent de schoolDayIsoSet (jour sans cours).
    const days = schoolDays("2026-09-08", "2026-09-10");
    expect(computeStreak(records, days, "2026-09-10")).toEqual({
      current: 2,
      best: 2,
    });
  });

  it("best can exceed current after a broken streak", () => {
    const records: DayCompletionRecord[] = [
      { dateIso: "2026-09-01", complete: true },
      { dateIso: "2026-09-02", complete: true },
      { dateIso: "2026-09-03", complete: true },
      { dateIso: "2026-09-04", complete: true },
      { dateIso: "2026-09-05", complete: false },
      { dateIso: "2026-09-08", complete: true },
    ];
    const days = schoolDays(
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-08"
    );
    expect(computeStreak(records, days, "2026-09-08")).toEqual({
      current: 1,
      best: 4,
    });
  });

  it("today not yet decided (no record) neither breaks nor extends -- current reflects up to yesterday", () => {
    const records: DayCompletionRecord[] = [
      { dateIso: "2026-09-08", complete: true },
      { dateIso: "2026-09-09", complete: true },
      // 2026-09-10 (aujourd'hui) : pas encore de ligne, soirée pas terminée.
    ];
    const days = schoolDays("2026-09-08", "2026-09-09", "2026-09-10");
    expect(computeStreak(records, days, "2026-09-10")).toEqual({
      current: 2,
      best: 2,
    });
  });

  it("today explicitly incomplete (checklist started but not finished) neither breaks nor extends", () => {
    const records: DayCompletionRecord[] = [
      { dateIso: "2026-09-08", complete: true },
      { dateIso: "2026-09-09", complete: true },
      { dateIso: "2026-09-10", complete: false },
    ];
    const days = schoolDays("2026-09-08", "2026-09-09", "2026-09-10");
    expect(computeStreak(records, days, "2026-09-10")).toEqual({
      current: 2,
      best: 2,
    });
  });

  it("today complete extends the current streak", () => {
    const records: DayCompletionRecord[] = [
      { dateIso: "2026-09-08", complete: true },
      { dateIso: "2026-09-09", complete: true },
      { dateIso: "2026-09-10", complete: true },
    ];
    const days = schoolDays("2026-09-08", "2026-09-09", "2026-09-10");
    expect(computeStreak(records, days, "2026-09-10")).toEqual({
      current: 3,
      best: 3,
    });
  });
});
