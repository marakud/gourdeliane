// CartableFlow -- domain/homework.ts (Story 2.4)
//
// Dérivation pure liée aux devoirs. Aucune dépendance vers Next.js ou Prisma
// (AD-1 / domain/README.md) ; aucune fonction ici ne lit l'horloge système --
// les dates "aujourd'hui" sont toujours reçues en `todayIso` explicite par
// l'appelant (app/(accueil)/page.tsx, calculé via domain/school-day.ts).

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

// Évolution CartableFlow -- page "Mes tâches" : 6 vues demandées
// (Aujourd'hui/Demain/Cette semaine/Plus tard/En retard/Terminés). Un devoir
// fait est toujours "DONE", quelle que soit son échéance (même un devoir en
// retard mais fait n'est plus "en retard" -- Boundaries : "en retard" décrit
// un travail non fait, pas un fait historique sur la date). Un devoir sans
// échéance (`daysRemaining === null`) n'a sa place dans aucune des vues
// datées (Aujourd'hui/Demain/Cette semaine/En retard exigent toutes une
// date) -- rangé dans "Plus tard", la seule vue compatible avec "pas de date
// précise".
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
 * Classe un devoir dans l'une des 6 vues, à partir de son statut fait/pas
 * fait et du nombre de jours avant son échéance déjà calculé par
 * `computeDaysRemaining` (`null` si aucune échéance) -- ne recalcule jamais
 * une date lui-même (AD-1, todayIso reste la responsabilité de l'appelant).
 */
export function classifyTaskView(
  done: boolean,
  daysRemaining: number | null
): TaskViewCategory {
  if (done) return TASK_VIEW_DONE;
  if (daysRemaining === null) return TASK_VIEW_LATER;
  if (daysRemaining < 0) return TASK_VIEW_OVERDUE;
  if (daysRemaining === 0) return TASK_VIEW_TODAY;
  if (daysRemaining === 1) return TASK_VIEW_TOMORROW;
  if (daysRemaining <= THIS_WEEK_MAX_DAYS_REMAINING) return TASK_VIEW_THIS_WEEK;
  return TASK_VIEW_LATER;
}

/** Formate une échéance ISO "yyyy-MM-dd" en libellé court français (ex.
 * "20 déc.") -- ancrée à midi UTC pour éviter tout décalage de fuseau à
 * l'affichage, capitalisation manuelle de la seule première lettre (jamais
 * la classe Tailwind `capitalize`, qui capitaliserait chaque mot -- bug
 * corrigé en Story 1.3). Extraite de app/(accueil)/page.tsx (évolution
 * CartableFlow, page "Mes tâches") pour rester une seule définition,
 * partagée entre les deux écrans qui affichent une échéance. */
export function formatEcheanceLabel(echeanceIso: string): string {
  const date = new Date(`${echeanceIso}T12:00:00Z`);
  const formatted = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Devoir brut (déjà résolu par data/homework.ts::listDevoirs), échéance
 * déjà réduite à une chaîne ISO par l'appelant -- cette fonction ne touche
 * jamais un objet `Date` (AD-1). */
export interface DevoirTaskViewInput {
  id: string;
  description: string;
  done: boolean;
  aRendre: boolean;
  status: DevoirStatus;
  estimatedMinutes: number | null;
  echeanceIso: string | null;
  echeanceTime: string | null;
  subject: { id: string; name: string; colorIndex: number };
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
  echeanceTime: string | null;
  daysRemaining: number | null;
  echeanceIso: string | null;
  taskView: TaskViewCategory;
}

/**
 * Enrichit un devoir brut en vue prête à afficher -- échéance formatée,
 * jours restants, classification "Mes tâches". Fonction pure unique (AD-5) :
 * jamais dupliquée entre app/(app)/(accueil)/page.tsx et
 * app/(app)/mes-taches/page.tsx, qui affichent toutes deux des devoirs sous
 * cette même forme.
 */
export function toDevoirTaskView(
  devoir: DevoirTaskViewInput,
  todayIso: string
): DevoirTaskView {
  const daysRemaining = devoir.echeanceIso
    ? computeDaysRemaining(devoir.echeanceIso, todayIso)
    : null;

  return {
    id: devoir.id,
    description: devoir.description,
    done: devoir.done,
    aRendre: devoir.aRendre,
    status: devoir.status,
    estimatedMinutes: devoir.estimatedMinutes,
    subject: devoir.subject,
    echeanceLabel: devoir.echeanceIso
      ? formatEcheanceLabel(devoir.echeanceIso)
      : null,
    // Une heure sans échéance n'a pas de sens (actions/homework.ts le
    // rejette à l'écriture) -- au cas où une ligne historique en aurait
    // quand même une (ex. donnée migrée), on ne l'affiche jamais seule.
    echeanceTime: devoir.echeanceIso ? devoir.echeanceTime : null,
    daysRemaining,
    echeanceIso: devoir.echeanceIso,
    taskView: classifyTaskView(devoir.done, daysRemaining),
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

/** Un devoir dont l'échéance tombe le jour affiché ET porte une heure
 * précise (évolution CartableFlow, calendrier unifié -- remplace l'ancien
 * placement `plannedWeekday`/`plannedStartTime`, indépendant de l'échéance)
 * -- projection minimale affichée en lecture seule dans la vue EDT du jour
 * concerné (components/schedule/day-view.tsx). Le nom du champ
 * `plannedStartTime` (plutôt que `echeanceTime`) est conservé tel quel : ce
 * type alimente `DayViewPlannedDevoir`, qui n'a pas besoin de changer.
 */
export interface PlannedDevoirView {
  id: string;
  description: string;
  done: boolean;
  subject: { name: string; colorIndex: number };
  plannedStartTime: string;
}

/**
 * Filtre les devoirs dont l'échéance exacte est `dateIso` ET qui portent une
 * heure précise, triés par heure. Pure : ne fait aucune requête, reçoit
 * `devoirs` déjà chargés par l'appelant (app/edt/page.tsx). Un devoir sans
 * heure (échéance seule, sans `echeanceTime`) n'apparaît jamais ici -- il a
 * déjà sa place dans "Devoirs"/"Mes tâches", cette carte ne montre que ce qui
 * est ancré à un moment précis du jour. Contrairement à l'ancien
 * `filterDevoirsForWeekday` (jour de semaine récurrent, sans année/mois/jour),
 * une correspondance par date exacte ne re-fait plus surface la semaine
 * suivante une fois la date passée.
 */
export function filterDevoirsForDate(
  devoirs: readonly {
    id: string;
    description: string;
    done: boolean;
    echeanceIso: string | null;
    echeanceTime: string | null;
    subject: { name: string; colorIndex: number };
  }[],
  dateIso: string
): PlannedDevoirView[] {
  return devoirs
    .filter(
      (devoir): devoir is typeof devoir & { echeanceTime: string } =>
        devoir.echeanceIso === dateIso && devoir.echeanceTime !== null
    )
    .map((devoir) => ({
      id: devoir.id,
      description: devoir.description,
      done: devoir.done,
      subject: devoir.subject,
      plannedStartTime: devoir.echeanceTime,
    }))
    .sort((a, b) => a.plannedStartTime.localeCompare(b.plannedStartTime));
}
