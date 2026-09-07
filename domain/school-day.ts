// CartableFlow -- domain/school-day.ts (Story 1.3)
//
// Calcul pur d'"aujourd'hui" et "demain" en fuseau Europe/Paris fixe (AD-4).
// Aucune dépendance vers Next.js ou Prisma (AD-1 / domain/README.md) ; aucune
// fonction ici ne lit l'horloge système -- `now: Date` est toujours reçu en
// paramètre explicite par l'appelant (app/edt/page.tsx), pour rester
// testable sans dépendre de l'heure de la machine qui exécute les tests.

import { WEEKDAYS, type Weekday } from "./schedule";

const PARIS_TIME_ZONE = "Europe/Paris";

/** Jour calendaire (pas d'heure, pas de fuseau) -- ex. 7 septembre 2026. */
export interface SchoolDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

// `en-CA` formate en "yyyy-MM-dd", pratique à parser -- seule la locale sert
// de format, `timeZone` fait tout le travail de conversion depuis l'instant
// UTC de `now` vers le jour calendaire réellement vécu à Paris (DST inclus,
// géré par le moteur ICU sans jamais calculer un décalage à la main ici).
function parisDateParts(now: Date): SchoolDate {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

/** Jour scolaire "aujourd'hui" à Paris pour l'instant `now` donné. */
export function getTodaySchoolDate(now: Date): SchoolDate {
  return parisDateParts(now);
}

/**
 * Jour calendaire suivant immédiat (pas le prochain jour avec cours, cf.
 * Design Notes de la spec 1.3). L'arithmétique se fait sur le triplet
 * année/mois/jour déjà résolu à Paris, via un instant UTC à midi (jamais
 * minuit, pour rester loin de toute frontière DST) -- ce n'est donc jamais
 * un "+24h" sur l'instant d'origine, qui se tromperait de jour calendaire
 * lors d'un changement d'heure.
 */
export function getTomorrowSchoolDate(now: Date): SchoolDate {
  const today = parisDateParts(now);
  const nextDayUtcNoon = new Date(
    Date.UTC(today.year, today.month - 1, today.day, 12)
  );
  nextDayUtcNoon.setUTCDate(nextDayUtcNoon.getUTCDate() + 1);

  return {
    year: nextDayUtcNoon.getUTCFullYear(),
    month: nextDayUtcNoon.getUTCMonth() + 1,
    day: nextDayUtcNoon.getUTCDate(),
  };
}

/** Jour de la semaine (`Weekday`) correspondant à un `SchoolDate`. */
export function schoolDateToWeekday(date: SchoolDate): Weekday {
  // Midi UTC : le jour calendaire d'un triplet année/mois/jour ne dépend
  // d'aucun fuseau, on prend juste soin de rester loin de minuit.
  const utcNoon = new Date(Date.UTC(date.year, date.month - 1, date.day, 12));
  const jsWeekday = utcNoon.getUTCDay(); // 0=dimanche .. 6=samedi
  const mondayFirstIndex = (jsWeekday + 6) % 7; // 0=lundi .. 6=dimanche
  return WEEKDAYS[mondayFirstIndex];
}

/** Représentation ISO "yyyy-MM-dd" d'un `SchoolDate`, pour comparaison avec
 * les `NoSchoolDay.date` déjà normalisées par `data/schedule.ts`. */
export function schoolDateToIso(date: SchoolDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}
