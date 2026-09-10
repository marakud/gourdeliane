// CartableFlow -- domain/school-day.ts (Story 1.3)
//
// Calcul pur d'"aujourd'hui" et "demain" en fuseau America/Guadeloupe fixe
// (AD-4 -- corrigé après la Story 1.4 : le fuseau était codé Europe/Paris,
// erroné pour une famille basée en Guadeloupe -- l'app pensait déjà être le
// lendemain alors qu'il ne l'était pas encore localement). America/Guadeloupe
// est un fuseau à décalage fixe (UTC-4, jamais d'heure d'été/hiver),
// contrairement à Europe/Paris.
// Aucune dépendance vers Next.js ou Prisma (AD-1 / domain/README.md) ; aucune
// fonction ici ne lit l'horloge système -- `now: Date` est toujours reçu en
// paramètre explicite par l'appelant (app/edt/page.tsx), pour rester
// testable sans dépendre de l'heure de la machine qui exécute les tests.

import { WEEKDAYS, type Weekday } from "./schedule";

// Exporté pour les formatages d'affichage ponctuels qui ont besoin du même
// fuseau sans dupliquer la chaîne littérale (ex. app/(accueil)/page.tsx --
// message d'accueil avec date/heure).
export const SCHOOL_TIME_ZONE = "America/Guadeloupe";

/** Jour calendaire (pas d'heure, pas de fuseau) -- ex. 7 septembre 2026. */
export interface SchoolDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

// `en-CA` formate en "yyyy-MM-dd", pratique à parser -- seule la locale sert
// de format, `timeZone` fait tout le travail de conversion depuis l'instant
// UTC de `now` vers le jour calendaire réellement vécu dans SCHOOL_TIME_ZONE
// (géré par le moteur ICU sans jamais calculer un décalage à la main ici).
function schoolDateParts(now: Date): SchoolDate {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
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

/** Jour scolaire "aujourd'hui" dans SCHOOL_TIME_ZONE pour l'instant `now` donné. */
export function getTodaySchoolDate(now: Date): SchoolDate {
  return schoolDateParts(now);
}

/**
 * Jour calendaire suivant immédiat (pas le prochain jour avec cours, cf.
 * Design Notes de la spec 1.3). L'arithmétique se fait sur le triplet
 * année/mois/jour déjà résolu dans SCHOOL_TIME_ZONE, via un instant UTC à
 * midi (jamais minuit, pour rester loin de toute frontière de fuseau) -- ce
 * n'est donc jamais un "+24h" sur l'instant d'origine, qui se tromperait de
 * jour calendaire près d'une frontière de fuseau.
 */
export function getTomorrowSchoolDate(now: Date): SchoolDate {
  const today = schoolDateParts(now);
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

// Retour utilisateur -- Accueil affichait "Ce soir"/"Ce matin"/"Retour"
// empilés et dépliés en permanence ("beaucoup d'information" pour un
// enfant), alors que l'intention UX d'origine (EXPERIENCE.md) était un
// écran contextuel montrant UN SEUL moment à la fois. `getCurrentMoment`
// détermine lequel, selon l'heure -- fenêtres fixes, non configurables pour
// l'instant (même "choix assumé, personnalisable plus tard" que
// `DEFAULT_MATIN_ITEMS`, Epic 3 story 3.4 permettra un jour de régler ces
// heures).
export type DayMoment = "MATIN" | "RETOUR" | "SOIR";

// Libellés affichés à l'enfant pour chaque moment -- source unique
// réutilisée à l'identique par `components/moment/moment-tabs.tsx` (onglets)
// ET `app/(accueil)/page.tsx` (repli visuel, Story 3.2), jamais dupliquée.
// Vit ici (module pur, sans "use client") plutôt que dans moment-tabs.tsx :
// un Server Component qui importerait une valeur non-composant depuis un
// module "use client" ne reçoit qu'une référence client, pas l'objet réel
// (cf. node_modules/next/dist/docs/01-app/03-api-reference/01-directives --
// "use client" marque TOUS ses exports comme frontière serveur/client, pas
// seulement les composants) -- constaté en vérification manuelle : la
// bannière de la Story 3.2 s'affichait vide sans ce déplacement.
export const MOMENT_LABELS: Record<DayMoment, string> = {
  MATIN: "Ce matin",
  RETOUR: "Retour",
  SOIR: "Ce soir",
};

/** Heure (0-23) dans SCHOOL_TIME_ZONE pour l'instant `now` donné.
 * `hourCycle: "h23"` + lecture via `formatToParts` (jamais `Number(format())`
 * directement) : certains moteurs ICU renvoient "24" plutôt que "00" pour
 * minuit avec `hour12: false` seul -- le modulo 24 s'en protège même si ce
 * cas ne s'est jamais présenté en pratique. */
function currentHour(now: Date): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  });
  const hour = Number(
    formatter.formatToParts(now).find((part) => part.type === "hour")?.value
  );
  return hour % 24;
}

/**
 * Moment de la journée actif "maintenant" (retour utilisateur -- Accueil
 * contextuel) : Matin [04h, 12h), Retour [12h, 18h), Soir [18h, 04h)
 * -- cette dernière fenêtre chevauche minuit (une soirée commencée avant
 * minuit reste "Ce soir" après minuit, jusqu'au réveil).
 */
export function getCurrentMoment(now: Date): DayMoment {
  const hour = currentHour(now);
  if (hour >= 4 && hour < 12) return "MATIN";
  if (hour >= 12 && hour < 18) return "RETOUR";
  return "SOIR";
}
