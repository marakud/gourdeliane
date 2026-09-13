// CartableFlow -- domain/homework.ts (Story 2.4)
//
// Dérivation pure liée aux devoirs. Aucune dépendance vers Next.js ou Prisma
// (AD-1 / domain/README.md) ; aucune fonction ici ne lit l'horloge système --
// les dates "aujourd'hui" sont toujours reçues en `todayIso` explicite par
// l'appelant (app/(accueil)/page.tsx, calculé via domain/school-day.ts).

import type { ActiveHomeworkSession } from "./homework-timer";

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
 * Nombre de jours calendaires entre `todayIso` et `dateIso` (positif si la
 * date est à venir, 0 si aujourd'hui, négatif si dépassée). Générique --
 * utilisée aussi bien pour l'échéance (date de rendu fixée par l'école) que
 * pour la date de planification (retour utilisateur : quand l'élève prévoit
 * de faire le devoir, distincte de l'échéance -- domain/homework.ts::toDevoirTaskView).
 * Les deux dates sont des chaînes "yyyy-MM-dd" (même format que
 * domain/school-day.ts::schoolDateToIso) -- comparées via `Date.UTC` à minuit
 * (jamais l'heure locale du serveur), les deux opérandes ancrés de façon
 * identique donc sans risque de frontière DST malgré l'absence d'ancrage
 * midi (contrairement à getTomorrowSchoolDate, qui ancre à midi car il fait
 * de l'arithmétique de jour ; ici on ne fait qu'une soustraction entre deux
 * instants déjà résolus).
 */
export function computeDaysRemaining(dateIso: string, todayIso: string): number {
  const date = Date.UTC(...(parseIsoDate(dateIso) as [number, number, number]));
  const today = Date.UTC(...(parseIsoDate(todayIso) as [number, number, number]));
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date - today) / msPerDay);
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

// Évolution CartableFlow -- page "Mes tâches" : 6 vues demandées
// (Aujourd'hui/Demain/Cette semaine/Plus tard/En retard/Terminés). Un devoir
// fait est toujours "DONE", quelle que soit sa date -- même un devoir en
// retard mais fait n'est plus "en retard" (Boundaries : "en retard" décrit un
// travail non fait, pas un fait historique sur la date).
export const TASK_VIEW_TODAY = "TODAY" as const;
export const TASK_VIEW_TOMORROW = "TOMORROW" as const;
export const TASK_VIEW_THIS_WEEK = "THIS_WEEK" as const;
export const TASK_VIEW_LATER = "LATER" as const;
export const TASK_VIEW_OVERDUE = "OVERDUE" as const;
export const TASK_VIEW_DONE = "DONE" as const;

export type TaskViewCategory =
  | typeof TASK_VIEW_TODAY
  | typeof TASK_VIEW_TOMORROW
  | typeof TASK_VIEW_THIS_WEEK
  | typeof TASK_VIEW_LATER
  | typeof TASK_VIEW_OVERDUE
  | typeof TASK_VIEW_DONE;

/** "Cette semaine" = fenêtre glissante de 7 jours (jours 2 à 7 après
 * aujourd'hui, demain étant sa propre vue) -- pas la semaine calendaire ISO
 * (aucune autre notion de semaine calendaire n'existe ailleurs dans l'app
 * hors alternance A/B, sans rapport). Choix simple et prévisible, pas une
 * règle produit figée. */
const THIS_WEEK_MAX_DAYS_REMAINING = 7;

/**
 * Classe un devoir dans l'une des 6 vues de "Mes tâches" (évolution
 * CartableFlow, retour utilisateur). Un devoir porte potentiellement DEUX
 * dates distinctes et indépendantes (toDevoirTaskView, plus bas) :
 * - l'échéance (`echeanceDaysRemaining`) : date de RENDU fixée par l'école ;
 * - la planification (`planDaysRemaining`) : jour où l'ÉLÈVE prévoit de
 *   s'y mettre, éventuellement bien avant l'échéance.
 *
 * Règles (retour utilisateur -- l'ancienne version de cette fonction n'avait
 * qu'une seule date en entrée, fusionnant les deux à tort) :
 * 1. "En retard" ne dépend QUE de l'échéance (un rendu manqué) -- jamais
 *    d'une planification simplement non tenue (l'élève avait prévu de le
 *    faire hier et ne l'a pas fait : ce n'est pas "en retard" tant que
 *    l'échéance elle-même n'est pas dépassée), et prime sur tout le reste.
 * 2. Sinon, la planification prime pour placer le devoir dans
 *    Aujourd'hui/Demain/Cette semaine/Plus tard -- si l'élève a prévu de le
 *    faire aujourd'hui, il doit apparaître dans "Aujourd'hui" même si
 *    l'échéance réelle est plus lointaine. Sans planification, on retombe
 *    sur l'échéance (comportement historique).
 * 3. Une planification passée mais non "en retard" au sens de l'échéance
 *    (ex. prévu hier, échéance dans 3 jours) retombe dans "Aujourd'hui" --
 *    c'est un plan à rattraper, pas un rendu manqué.
 *
 * Ne recalcule jamais une date elle-même (AD-1, todayIso reste la
 * responsabilité de l'appelant, `computeDaysRemaining`).
 */
export function classifyTaskView(
  done: boolean,
  planDaysRemaining: number | null,
  echeanceDaysRemaining: number | null
): TaskViewCategory {
  if (done) return TASK_VIEW_DONE;
  if (echeanceDaysRemaining !== null && echeanceDaysRemaining < 0) {
    return TASK_VIEW_OVERDUE;
  }

  const effective = planDaysRemaining ?? echeanceDaysRemaining;
  if (effective === null) return TASK_VIEW_LATER;
  if (effective <= 0) return TASK_VIEW_TODAY;
  if (effective === 1) return TASK_VIEW_TOMORROW;
  if (effective <= THIS_WEEK_MAX_DAYS_REMAINING) return TASK_VIEW_THIS_WEEK;
  return TASK_VIEW_LATER;
}

/** Formate une date ISO "yyyy-MM-dd" en libellé court français (ex.
 * "20 déc.") -- ancrée à midi UTC pour éviter tout décalage de fuseau à
 * l'affichage, capitalisation manuelle de la seule première lettre (jamais
 * la classe Tailwind `capitalize`, qui capitaliserait chaque mot -- bug
 * corrigé en Story 1.3). Générique (malgré son origine sur l'échéance) :
 * réutilisée telle quelle pour la date de planification (évolution
 * CartableFlow), jamais un second formateur dupliqué (AD-5). */
export function formatDateLabel(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00Z`);
  const formatted = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Devoir brut (déjà résolu par data/homework.ts::listDevoirs), dates déjà
 * réduites à des chaînes ISO par l'appelant -- cette fonction ne touche
 * jamais un objet `Date` (AD-1). */
export interface DevoirTaskViewInput {
  id: string;
  description: string;
  done: boolean;
  aRendre: boolean;
  status: DevoirStatus;
  estimatedMinutes: number | null;
  // Date de rendu fixée par l'école (retour utilisateur -- distincte de la
  // planification ci-dessous).
  echeanceIso: string | null;
  // Jour + heure où l'élève prévoit de faire le devoir (retour utilisateur --
  // distinct de l'échéance : un devoir peut être prévu bien avant sa date de
  // rendu). `planTime` n'a de sens qu'accompagné de `planDateIso`, jamais
  // seul (validé par actions/homework.ts).
  planDateIso: string | null;
  planTime: string | null;
  subject: { id: string; name: string; colorIndex: number };
  // Minuteur de devoirs (évolution CartableFlow, retour utilisateur) -- déjà
  // résumés par domain/homework-timer.ts::summarizeHomeworkTimeSessions en
  // amont (l'appelant charge toutes les sessions une seule fois pour tous
  // les devoirs) : cette fonction ne fait jamais de second calcul divergent,
  // seulement un passage direct (AD-5).
  activeSession: ActiveHomeworkSession | null;
  totalRealSeconds: number;
}

/** Vue enrichie d'un devoir, prête à afficher -- même forme que
 * `components/homework/devoirs-list.tsx::DevoirView`, plus `taskView`
 * (classification pour la page "Mes tâches", inutile sur l'Accueil mais
 * sans coût à calculer). */
export interface DevoirTaskView {
  id: string;
  description: string;
  done: boolean;
  aRendre: boolean;
  status: DevoirStatus;
  estimatedMinutes: number | null;
  subject: { id: string; name: string; colorIndex: number };
  echeanceLabel: string | null;
  echeanceDaysRemaining: number | null;
  echeanceIso: string | null;
  planLabel: string | null;
  planDaysRemaining: number | null;
  planDateIso: string | null;
  planTime: string | null;
  activeSession: ActiveHomeworkSession | null;
  totalRealSeconds: number;
  taskView: TaskViewCategory;
}

/**
 * Enrichit un devoir brut en vue prête à afficher -- échéance ET
 * planification formatées séparément (jours restants, libellé), plus
 * classification "Mes tâches" (`classifyTaskView`, qui combine les deux).
 * Fonction pure unique (AD-5) : jamais dupliquée entre
 * app/(app)/(accueil)/page.tsx et app/(app)/mes-taches/page.tsx, qui
 * affichent toutes deux des devoirs sous cette même forme.
 */
export function toDevoirTaskView(
  devoir: DevoirTaskViewInput,
  todayIso: string
): DevoirTaskView {
  const echeanceDaysRemaining = devoir.echeanceIso
    ? computeDaysRemaining(devoir.echeanceIso, todayIso)
    : null;
  const planDaysRemaining = devoir.planDateIso
    ? computeDaysRemaining(devoir.planDateIso, todayIso)
    : null;

  return {
    id: devoir.id,
    description: devoir.description,
    done: devoir.done,
    aRendre: devoir.aRendre,
    status: devoir.status,
    estimatedMinutes: devoir.estimatedMinutes,
    subject: devoir.subject,
    echeanceLabel: devoir.echeanceIso ? formatDateLabel(devoir.echeanceIso) : null,
    echeanceDaysRemaining,
    echeanceIso: devoir.echeanceIso,
    planLabel: devoir.planDateIso ? formatDateLabel(devoir.planDateIso) : null,
    planDaysRemaining,
    planDateIso: devoir.planDateIso,
    // Une heure sans date de planification n'a pas de sens (actions/homework.ts
    // le rejette à l'écriture) -- au cas où une ligne historique en aurait
    // quand même une (ex. donnée migrée), on ne l'affiche jamais seule.
    planTime: devoir.planDateIso ? devoir.planTime : null,
    activeSession: devoir.activeSession,
    totalRealSeconds: devoir.totalRealSeconds,
    taskView: classifyTaskView(devoir.done, planDaysRemaining, echeanceDaysRemaining),
  };
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

/** Un devoir dont la planification (pas l'échéance -- retour utilisateur)
 * tombe le jour affiché ET porte une heure précise -- projection minimale
 * affichée en lecture seule dans la vue EDT du jour concerné
 * (components/schedule/day-view.tsx). Le nom du champ `plannedStartTime`
 * (plutôt que `planTime`) est conservé tel quel : ce type alimente
 * `DayViewPlannedDevoir`, qui n'a pas besoin de changer.
 */
export interface PlannedDevoirView {
  id: string;
  description: string;
  done: boolean;
  subject: { name: string; colorIndex: number };
  plannedStartTime: string;
}

/**
 * Filtre les devoirs dont la planification exacte est `dateIso` ET qui
 * portent une heure précise, triés par heure. Pure : ne fait aucune requête,
 * reçoit `devoirs` déjà chargés par l'appelant (app/edt/page.tsx). Regarde la
 * planification, jamais l'échéance -- cette carte répond à "qu'est-ce que
 * l'élève a prévu de faire aujourd'hui", pas "qu'est-ce qui est dû
 * aujourd'hui" (déjà visible ailleurs, Accueil/"Mes tâches"). Un devoir sans
 * heure (planifié un jour, sans heure précise) n'apparaît jamais ici.
 */
export function filterDevoirsForDate(
  devoirs: readonly {
    id: string;
    description: string;
    done: boolean;
    planDateIso: string | null;
    planTime: string | null;
    subject: { name: string; colorIndex: number };
  }[],
  dateIso: string
): PlannedDevoirView[] {
  return devoirs
    .filter(
      (devoir): devoir is typeof devoir & { planTime: string } =>
        devoir.planDateIso === dateIso && devoir.planTime !== null
    )
    .map((devoir) => ({
      id: devoir.id,
      description: devoir.description,
      done: devoir.done,
      subject: devoir.subject,
      plannedStartTime: devoir.planTime,
    }))
    .sort((a, b) => a.plannedStartTime.localeCompare(b.plannedStartTime));
}
