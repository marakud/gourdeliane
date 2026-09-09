import { describe, expect, it } from "vitest";
import {
  getCurrentMoment,
  getTodaySchoolDate,
  getTomorrowSchoolDate,
  schoolDateToIso,
  schoolDateToWeekday,
} from "./school-day";

describe("getTodaySchoolDate / getTomorrowSchoolDate (AD-4, America/Guadeloupe fixe UTC-4)", () => {
  it("stays on the previous calendar day in Guadeloupe while the server (UTC) is already on the next day", () => {
    // 02:00 UTC le 7 septembre = 22:00 en Guadeloupe (UTC-4) le 6 -- l'UTC a
    // déjà basculé au jour suivant alors qu'il ne l'est pas encore localement
    // (c'est exactement le bug corrigé ici : Europe/Paris, à l'est de l'UTC,
    // bascule AVANT l'UTC ; America/Guadeloupe, à l'ouest, bascule APRÈS).
    const now = new Date("2026-09-07T02:00:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-09-06");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2026-09-07");
  });

  it("crosses midnight in Guadeloupe right at the UTC-4 boundary", () => {
    // 03:59 UTC = 23:59 en Guadeloupe la veille ; 04:00 UTC = 00:00 en
    // Guadeloupe le jour même -- la bascule se fait exactement à 04:00 UTC.
    const beforeMidnight = new Date("2026-09-07T03:59:00Z");
    const atMidnight = new Date("2026-09-07T04:00:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(beforeMidnight))).toBe("2026-09-06");
    expect(schoolDateToIso(getTodaySchoolDate(atMidnight))).toBe("2026-09-07");
  });

  it("rolls over to the next month at the end of January", () => {
    // 02:00 UTC le 1er février = 22:00 en Guadeloupe le 31 janvier.
    const now = new Date("2026-02-01T02:00:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-01-31");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2026-02-01");
  });

  it("rolls over to the next year at the end of December", () => {
    // 02:00 UTC le 1er janvier 2027 = 22:00 en Guadeloupe le 31 décembre 2026.
    const now = new Date("2027-01-01T02:00:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(now))).toBe("2026-12-31");
    expect(schoolDateToIso(getTomorrowSchoolDate(now))).toBe("2027-01-01");
  });

  it("keeps the same fixed -4h boundary right at the UTC/local-day split on the dates that would be Europe's DST transitions", () => {
    // Si le fuseau redevenait par erreur sensible à l'heure d'été/hiver
    // (comme Europe/Paris avant ce correctif), la bascule de jour autour de
    // ces deux dates précises (29 mars, 25 octobre) se comporterait
    // différemment. Ici, à 02:00 UTC -- dans la fenêtre 00:00-03:59 UTC où
    // l'UTC a basculé mais pas encore la Guadeloupe -- le jour local reste la
    // veille des deux côtés, sans discontinuité.
    const springBoundary = new Date("2026-03-29T02:00:00Z");
    const fallBoundary = new Date("2026-10-25T02:00:00Z");
    expect(schoolDateToIso(getTodaySchoolDate(springBoundary))).toBe("2026-03-28");
    expect(schoolDateToIso(getTomorrowSchoolDate(springBoundary))).toBe("2026-03-29");
    expect(schoolDateToIso(getTodaySchoolDate(fallBoundary))).toBe("2026-10-24");
    expect(schoolDateToIso(getTomorrowSchoolDate(fallBoundary))).toBe("2026-10-25");
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

describe("getCurrentMoment (retour utilisateur -- Accueil contextuel, America/Guadeloupe fixe UTC-4)", () => {
  it("returns MATIN in the middle of the morning window (07:30 local = 11:30 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T11:30:00Z"))).toBe("MATIN");
  });

  it("returns RETOUR in the middle of the afternoon window (13:00 local = 17:00 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T17:00:00Z"))).toBe("RETOUR");
  });

  it("returns SOIR in the evening (20:00 local = 00:00 UTC next day)", () => {
    expect(getCurrentMoment(new Date("2026-09-10T00:00:00Z"))).toBe("SOIR");
  });

  it("returns SOIR right at local midnight, the wrap-point of the evening window (00:00 local = 04:00 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T04:00:00Z"))).toBe("SOIR");
  });

  it("returns SOIR after midnight, before the morning window starts (01:00 local = 05:00 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T05:00:00Z"))).toBe("SOIR");
  });

  it("stays SOIR right up to the 04:00 local boundary (03:59 local = 07:59 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T07:59:00Z"))).toBe("SOIR");
  });

  it("switches to MATIN exactly at the 04:00 local boundary (04:00 local = 08:00 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T08:00:00Z"))).toBe("MATIN");
  });

  it("stays MATIN right up to the 12:00 local boundary (11:59 local = 15:59 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T15:59:00Z"))).toBe("MATIN");
  });

  it("switches to RETOUR exactly at the 12:00 local boundary (12:00 local = 16:00 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T16:00:00Z"))).toBe("RETOUR");
  });

  it("stays RETOUR right up to the 18:00 local boundary (17:59 local = 21:59 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T21:59:00Z"))).toBe("RETOUR");
  });

  it("switches to SOIR exactly at the 18:00 local boundary (18:00 local = 22:00 UTC)", () => {
    expect(getCurrentMoment(new Date("2026-09-09T22:00:00Z"))).toBe("SOIR");
  });
});
