// CartableFlow -- domain/lesson-log.ts (évolution CartableFlow, "Cahier de
// texte", retour utilisateur)
//
// Dérivation pure liée au cahier de texte : filtrage par période, groupement
// par date, formatage. Aucune dépendance vers Next.js ou Prisma (AD-1 /
// domain/README.md) ; aucune fonction ici ne lit l'horloge système -- `todayIso`
// est toujours reçu en paramètre explicite par l'appelant (calculé via
// domain/school-day.ts).

import { shiftIsoDays } from "./schedule";

// Trois fenêtres de lecture (retour utilisateur -- "pour le prochain cours",
// "préparer une évaluation" veulent souvent revoir plus qu'une semaine ;
// "préparer la semaine" le week-end ne veut voir que les 7 derniers jours).
// "ALL" reste nécessaire : un trimestre entier pour réviser un contrôle plus
// large que MONTH ne doit jamais être hors d'atteinte.
export const LESSON_LOG_PERIOD_WEEK = "WEEK" as const;
export const LESSON_LOG_PERIOD_MONTH = "MONTH" as const;
export const LESSON_LOG_PERIOD_ALL = "ALL" as const;

export type LessonLogPeriod =
  | typeof LESSON_LOG_PERIOD_WEEK
  | typeof LESSON_LOG_PERIOD_MONTH
  | typeof LESSON_LOG_PERIOD_ALL;

// Fenêtre glissante (aujourd'hui + les N-1 jours précédents), pas un mois/une
// semaine calendaire -- même choix simple et prévisible que
// domain/homework.ts::THIS_WEEK_MAX_DAYS_REMAINING, pas une règle produit
// figée.
const WEEK_WINDOW_DAYS = 7;
const MONTH_WINDOW_DAYS = 30;

/**
 * Filtre des entrées par période, sur une fenêtre glissante se terminant
 * aujourd'hui (une entrée future -- date saisie par erreur -- reste
 * volontairement exclue, une période de lecture n'a de sens que dans le
 * passé/présent). Générique sur le type d'entrée (seul `dateIso` compte ici) :
 * réutilisable aussi bien pour la vue brute que pour une vue déjà enrichie.
 */
export function filterLessonLogsByPeriod<T extends { dateIso: string }>(
  entries: readonly T[],
  period: LessonLogPeriod,
  todayIso: string
): T[] {
  if (period === LESSON_LOG_PERIOD_ALL) {
    return entries.filter((entry) => entry.dateIso <= todayIso);
  }
  const windowDays = period === LESSON_LOG_PERIOD_WEEK ? WEEK_WINDOW_DAYS : MONTH_WINDOW_DAYS;
  const cutoffIso = shiftIsoDays(todayIso, -(windowDays - 1));
  return entries.filter(
    (entry) => entry.dateIso >= cutoffIso && entry.dateIso <= todayIso
  );
}

/** Formate une date ISO "yyyy-MM-dd" en libellé court français AVEC jour de
 * semaine (ex. "Lun. 14 sept.") -- contrairement à
 * domain/homework.ts::formatDateLabel (sans jour de semaine, adapté à une
 * échéance isolée), la relecture du cahier de texte se fait jour par jour
 * (retour utilisateur -- "revoir ce qui a été fait durant la semaine") : le
 * jour de semaine est l'information la plus utile ici. Même ancrage midi UTC
 * et capitalisation manuelle de la première lettre que le reste du fichier
 * (AD-5 -- pas un second formateur qui recalculerait un fuseau autrement).
 */
export function formatLessonLogDateLabel(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00Z`);
  const formatted = date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export interface LessonLogView {
  id: string;
  dateIso: string;
  dateLabel: string;
  content: string;
  subject: { id: string; name: string; colorIndex: number };
}

export interface LessonLogDateGroup {
  dateIso: string;
  dateLabel: string;
  logs: LessonLogView[];
}

/**
 * Groupe des entrées déjà filtrées par date (ordre décroissant -- le jour le
 * plus récent en premier, cohérent avec une relecture qui part du plus
 * proche). Chaque groupe garde l'ordre reçu pour ses entrées (celui de
 * `listLessonLogs`, trié par date puis createdAt) -- ne retrie jamais un
 * deuxième niveau lui-même.
 */
export function groupLessonLogsByDate(
  logs: readonly LessonLogView[]
): LessonLogDateGroup[] {
  const byDate = new Map<string, LessonLogView[]>();
  for (const log of logs) {
    const list = byDate.get(log.dateIso) ?? [];
    list.push(log);
    byDate.set(log.dateIso, list);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([dateIso, dateLogs]) => ({
      dateIso,
      dateLabel: formatLessonLogDateLabel(dateIso),
      logs: dateLogs,
    }));
}
