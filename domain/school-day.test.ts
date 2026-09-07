import { describe, expect, it } from "vitest";
import {
  getTodaySchoolDate,
  getTomorrowSchoolDate,
  schoolDateToIso,
  schoolDateToWeekday,
} from "./school-day";

describe("getTodaySchoolDate / getTomorrowSchoolDate (AD-4)", () => {
  it("crosses midnight in Paris while the server is still on the previous UTC day", () => {
    // 22:35 UTC un 6 septembre = 00:35 à Paris (UTC+2, heure d'été) le 7.
    const now = new Date("2026-09-06T22:35:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-09-07");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2026-09-08");
  });

  it("rolls over to the next month at the end of January", () => {
    // 22:00 UTC le 31 janvier = 23:00 à Paris (UTC+1, heure d'hiver).
    const now = new Date("2026-01-31T22:00:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-01-31");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2026-02-01");
  });

  it("rolls over to the next year at the end of December", () => {
    // 22:30 UTC le 31 décembre = 23:30 à Paris (UTC+1, heure d'hiver).
    const now = new Date("2026-12-31T22:30:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-12-31");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2027-01-01");
  });

  it("computes tomorrow correctly on the calendar day the clocks spring forward (Paris, 2026-03-29)", () => {
    const now = new Date("2026-03-29T10:00:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-03-29");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2026-03-30");
  });

  it("computes tomorrow correctly the evening before the spring-forward switch", () => {
    // 22:30 UTC le 28 mars = 23:30 à Paris (encore UTC+1 la veille du
    // changement) -- "demain" doit être le jour du changement d'heure lui-même.
    const now = new Date("2026-03-28T22:30:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-03-28");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2026-03-29");
  });

  it("computes tomorrow correctly just after midnight on the day the clocks fall back (Paris, 2026-10-25)", () => {
    // 22:15 UTC le 24 octobre = 00:15 à Paris (encore UTC+2 avant le
    // changement) le 25 -- jour même du passage à l'heure d'hiver.
    const now = new Date("2026-10-24T22:15:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-10-25");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2026-10-26");
  });

  it("computes tomorrow correctly the night after the fall-back switch", () => {
    // 23:15 UTC le 25 octobre = 00:15 à Paris (déjà UTC+1) le 26.
    const now = new Date("2026-10-25T23:15:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-10-26");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2026-10-27");
  });
});

describe("schoolDateToWeekday", () => {
  it("maps a Monday correctly", () => {
    expect(schoolDateToWeekday({ year: 2026, month: 9, day: 7 })).toBe(
      "MONDAY"
    );
  });

  it("maps a Sunday correctly", () => {
    expect(schoolDateToWeekday({ year: 2026, month: 2, day: 1 })).toBe(
      "SUNDAY"
    );
  });

  it("maps the Sunday DST spring-forward day correctly", () => {
    expect(schoolDateToWeekday({ year: 2026, month: 3, day: 29 })).toBe(
      "SUNDAY"
    );
  });

  it("maps the Sunday DST fall-back day correctly", () => {
    expect(schoolDateToWeekday({ year: 2026, month: 10, day: 25 })).toBe(
      "SUNDAY"
    );
  });

  it("maps January 1st correctly across a year boundary", () => {
    expect(schoolDateToWeekday({ year: 2027, month: 1, day: 1 })).toBe(
      "FRIDAY"
    );
  });
});
