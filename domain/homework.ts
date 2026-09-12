// CartableFlow -- domain/homework.ts (Story 2.4)
//
// Dérivation pure liée aux devoirs. Aucune dépendance vers Next.js ou Prisma
// (AD-1 / domain/README.md) ; aucune fonction ici ne lit l'horloge système --
// les dates "aujourd'hui" sont toujours reçues en `todayIso` explicite par
// l'appelant (app/(accueil)/page.tsx, calculé via domain/school-day.ts).

import type { Weekday } from "./schedule";

// Évolution CartableFlow (modèle de tâches enrichi) -- statut à 3 valeurs,
// coexiste avec `done` (AD-7) plutôt que de le remplacer : `done` reste la
// seule source de vérité pour le Sac du soir/streak/DevoirsList, `status`
// est maintenu synchronisé à chaque écriture (actions/homework.ts,
// data/homework.ts) et n'ajoute que l'état intermédiaire "En cours"
// qu'aucun booléen ne peut représenter.
export const DEVOIR_STATUS_TODO = "TODO" as const;
export const DEVOIR_STATUS_IN_PROGRESS = "IN_PROGRESS" as const;
export const DEVOIR_STATUS_DONE = "DONE" as const;

export type DevoirStatus =
  | typeof DEVOIR_STATUS_TODO
  | typeof DEVOIR_STATUS_IN_PROGRESS
  | typeof DEVOIR_STATUS_DONE;

/** Durée estimée maximale acceptée (8h) -- garde-fou générique contre une
 * saisie aberrante, pas une règle produit précise (aucune spec ne fixe ce
 * chiffre ; repris comme ordre de grandeur raisonnable pour un devoir). */
export const MAX_ESTIMATED_MINUTES = 480;

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

/** Un devoir pris en compte pour la charge estimée du jour (évolution
 * CartableFlow) -- seuls les devoirs pas encore faits comptent (un devoir
 * déjà fait n'est plus "du travail à faire"). */
export interface DevoirWorkloadInput {
  done: boolean;
  estimatedMinutes: number | null;
}

export interface EstimatedWorkload {
  totalMinutes: number;
  /** Au moins un devoir restant a une durée estimée -- si `false`,
   * l'appelant ne doit rien afficher : un total à 0 ne distinguerait sinon
   * pas "rien à faire" de "aucune durée saisie sur les devoirs restants". */
  hasEstimate: boolean;
}

/**
 * Additionne la durée estimée des devoirs restants (pas encore faits, avec
 * une estimation saisie). Ne présume jamais une durée pour un devoir sans
 * estimation -- ni 0, ni une moyenne : ce devoir est simplement exclu du
 * total (`hasEstimate` reste `true` tant qu'au moins un autre en a une).
 */
export function computeEstimatedWorkload(
  devoirs: readonly DevoirWorkloadInput[]
): EstimatedWorkload {
  const remaining = devoirs.filter(
    (devoir) => !devoir.done && devoir.estimatedMinutes !== null
  );
  const totalMinutes = remaining.reduce(
    (sum, devoir) => sum + (devoir.estimatedMinutes ?? 0),
    0
  );
  return { totalMinutes, hasEstimate: remaining.length > 0 };
}

/** Formate une durée en minutes pour l'affichage ("30 min", "1 h", "1 h 10")
 * -- jamais de décimal, toujours arrondi à la minute (l'unité déjà saisie). */
export function formatEstimatedDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours} h`;
  return `${hours} h ${String(remainder).padStart(2, "0")}`;
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
