import { describe, expect, it } from "vitest";
import { NOTIFICATION_CONTENT, shouldSkipReminderToday } from "./notifications";

describe("shouldSkipReminderToday (Story 3.1, I/O matrix spec 3.1)", () => {
  it("does not skip a normal school weekday with no NoSchoolDay marker", () => {
    expect(shouldSkipReminderToday("WEDNESDAY", "2026-09-09", new Set())).toBe(false);
  });

  it("skips Saturday", () => {
    expect(shouldSkipReminderToday("SATURDAY", "2026-09-12", new Set())).toBe(true);
  });

  it("skips Sunday", () => {
    expect(shouldSkipReminderToday("SUNDAY", "2026-09-13", new Set())).toBe(true);
  });

  it("skips a weekday explicitly marked as a NoSchoolDay", () => {
    const noSchoolDayIsoSet = new Set(["2026-09-09"]);
    expect(shouldSkipReminderToday("WEDNESDAY", "2026-09-09", noSchoolDayIsoSet)).toBe(true);
  });

  it("does not skip a weekday when a different date is marked NoSchoolDay", () => {
    const noSchoolDayIsoSet = new Set(["2026-12-25"]);
    expect(shouldSkipReminderToday("WEDNESDAY", "2026-09-09", noSchoolDayIsoSet)).toBe(false);
  });
});

describe("NOTIFICATION_CONTENT (Story 3.1)", () => {
  it("defines a title and non-empty body for each of the three moments", () => {
    for (const moment of ["SOIR", "MATIN", "RETOUR"] as const) {
      expect(NOTIFICATION_CONTENT[moment].title.length).toBeGreaterThan(0);
      expect(NOTIFICATION_CONTENT[moment].body.length).toBeGreaterThan(0);
    }
  });
});
