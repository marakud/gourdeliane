// CartableFlow -- domain/homework.ts (Story 2.4)
//
// Dérivation pure liée aux devoirs. Aucune dépendance vers Next.js ou Prisma
// (AD-1 / domain/README.md) ; aucune fonction ici ne lit l'horloge système --
// les dates "aujourd'hui" sont toujours reçues en `todayIso` explicite par
// l'appelant (app/(accueil)/page.tsx, calculé via domain/school-day.ts).

import type { Weekday } from "./schedule";

/**
 * Nombre de jours calendaires entre `todayIso` et `echeanceIso` (positif si
 * l'échéance est à venir, 0 si aujourd'hui, négatif si dépassée). Les deux
 * dates sont des chaînes "yyyy-MM-dd" (même format que
 * domain/school-day.ts::schoolDateToIso) -- comparées via `Date.UTC` à minuit
 * (jamais l'heure locale du serveur), les deux opérandes ancrés de façon
 * identique donc sans risque de frontière DST malgré l'absence d'ancrage
 * midi (contrairement à getTomorrowSchoolDate, qui ancre à midi car il fait
 * de l'arithmétique de jour ; ici on ne fait qu'une soustraction entre deux
 * instants déjà résolus).
 */
export function computeDaysRemaining(
  echeanceIso: string,
  todayIso: string
): number {
  const echeance = Date.UTC(
    ...(parseIsoDate(echeanceIso) as [number, number, number])
  );
  const today = Date.UTC(...(parseIsoDate(todayIso) as [number, number, number]));
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((echeance - today) / msPerDay);
}

function parseIsoDate(iso: string): [number, number, number] {
  const [year, month, day] = iso.split("-").map(Number);
  return [year, month - 1, day];
}

/** Un devoir programmé pour un jour donné (Story 2.4, retour utilisateur
 * "programmer le devoir dans l'EDT" -- placé dans un trou libre, pas
 * rattaché à un créneau/cours existant, cf. `computeWeeklyFreeGaps`,
 * domain/schedule.ts) -- projection minimale affichée en lecture seule dans
 * la vue EDT du jour concerné (components/schedule/day-view.tsx).
 */
export interface PlannedDevoirView {
  id: string;
  description: string;
  done: boolean;
  subject: { name: string; colorIndex: number };
  plannedStartTime: string;
}

/**
 * Filtre les devoirs programmés pour `weekday`, triés par heure. Pure : ne
 * fait aucune requête, reçoit `devoirs` déjà chargés par l'appelant
 * (app/edt/page.tsx). Un devoir sans `plannedWeekday`/`plannedStartTime`
 * (non programmé) n'apparaît jamais ici, quel que soit `weekday`.
 */
export function filterDevoirsForWeekday(
  devoirs: readonly {
    id: string;
    description: string;
    done: boolean;
    plannedWeekday: string | null;
    plannedStartTime: string | null;
    subject: { name: string; colorIndex: number };
  }[],
  weekday: Weekday
): PlannedDevoirView[] {
  return devoirs
    .filter(
      (devoir): devoir is typeof devoir & { plannedStartTime: string } =>
        devoir.plannedWeekday === weekday && devoir.plannedStartTime !== null
    )
    .map((devoir) => ({
      id: devoir.id,
      description: devoir.description,
      done: devoir.done,
      subject: devoir.subject,
      plannedStartTime: devoir.plannedStartTime,
    }))
    .sort((a, b) => a.plannedStartTime.localeCompare(b.plannedStartTime));
}
