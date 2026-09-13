import { describe, expect, it } from "vitest";
import {
  filterLessonLogsByPeriod,
  formatLessonLogDateLabel,
  groupLessonLogsByDate,
  LESSON_LOG_PERIOD_ALL,
  LESSON_LOG_PERIOD_MONTH,
  LESSON_LOG_PERIOD_WEEK,
  type LessonLogView,
} from "./lesson-log";

describe("filterLessonLogsByPeriod (évolution CartableFlow -- cahier de texte)", () => {
  const TODAY = "2026-09-13"; // dimanche

  it("keeps only entries within the last 7 days (inclusive) for WEEK", () => {
    const entries = [
      { id: "today", dateIso: "2026-09-13" },
      { id: "6-days-ago", dateIso: "2026-09-07" },
      { id: "7-days-ago", dateIso: "2026-09-06" },
    ];

    const result = filterLessonLogsByPeriod(entries, LESSON_LOG_PERIOD_WEEK, TODAY);

    expect(result.map((e) => e.id)).toEqual(["today", "6-days-ago"]);
  });

  it("keeps a 30-day window ending today (today + the 29 preceding days) for MONTH", () => {
    const entries = [
      { id: "29-days-ago", dateIso: "2026-08-15" },
      { id: "30-days-ago", dateIso: "2026-08-14" },
    ];

    const result = filterLessonLogsByPeriod(entries, LESSON_LOG_PERIOD_MONTH, TODAY);

    expect(result.map((e) => e.id)).toEqual(["29-days-ago"]);
  });

  it("excludes a future-dated entry even for ALL (a typo shouldn't surface as 'upcoming')", () => {
    const entries = [
      { id: "future", dateIso: "2026-09-14" },
      { id: "past", dateIso: "2020-01-01" },
    ];

    const result = filterLessonLogsByPeriod(entries, LESSON_LOG_PERIOD_ALL, TODAY);

    expect(result.map((e) => e.id)).toEqual(["past"]);
  });

  it("ALL keeps an arbitrarily old entry, unlike WEEK/MONTH", () => {
    const entries = [{ id: "old", dateIso: "2020-01-01" }];

    expect(filterLessonLogsByPeriod(entries, LESSON_LOG_PERIOD_ALL, TODAY)).toHaveLength(1);
    expect(filterLessonLogsByPeriod(entries, LESSON_LOG_PERIOD_MONTH, TODAY)).toHaveLength(0);
  });

  it("returns an empty array for an empty input", () => {
    expect(filterLessonLogsByPeriod([], LESSON_LOG_PERIOD_WEEK, TODAY)).toEqual([]);
  });
});

describe("formatLessonLogDateLabel (évolution CartableFlow -- cahier de texte)", () => {
  it("formats an ISO date with weekday, day and short month, capitalized", () => {
    // 2026-09-14 est un lundi.
    expect(formatLessonLogDateLabel("2026-09-14")).toBe("Lun. 14 sept.");
  });
});

describe("groupLessonLogsByDate (évolution CartableFlow -- cahier de texte)", () => {
  const maths = { id: "s1", name: "Maths", colorIndex: 1 };
  const francais = { id: "s2", name: "Français", colorIndex: 2 };

  function log(overrides: Partial<LessonLogView>): LessonLogView {
    return {
      id: "l1",
      dateIso: "2026-09-14",
      dateLabel: formatLessonLogDateLabel("2026-09-14"),
      content: "Contenu",
      subject: maths,
      ...overrides,
    };
  }

  it("groups multiple entries of the same date under one group", () => {
    const logs = [
      log({ id: "l1", subject: maths }),
      log({ id: "l2", subject: francais }),
    ];

    const groups = groupLessonLogsByDate(logs);

    expect(groups).toHaveLength(1);
    expect(groups[0].dateIso).toBe("2026-09-14");
    expect(groups[0].logs.map((l) => l.id)).toEqual(["l1", "l2"]);
  });

  it("orders groups by date descending (most recent first)", () => {
    const logs = [
      log({ id: "old", dateIso: "2026-09-07", dateLabel: formatLessonLogDateLabel("2026-09-07") }),
      log({ id: "recent", dateIso: "2026-09-14", dateLabel: formatLessonLogDateLabel("2026-09-14") }),
    ];

    const groups = groupLessonLogsByDate(logs);

    expect(groups.map((g) => g.dateIso)).toEqual(["2026-09-14", "2026-09-07"]);
  });

  it("preserves the received order of entries within a group", () => {
    const logs = [log({ id: "second" }), log({ id: "first" })];

    const groups = groupLessonLogsByDate(logs);

    expect(groups[0].logs.map((l) => l.id)).toEqual(["second", "first"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupLessonLogsByDate([])).toEqual([]);
  });
});
