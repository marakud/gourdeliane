// CartableFlow -- domain/streak.ts (refonte visuelle, étape 8, FR-13/FR-15)
//
// Calcul pur du streak (jours scolaires consécutifs où "Ce soir" a été
// entièrement coché) à partir des lignes `DayCompletion(moment=SOIR)` déjà
// persistées (Story 2.7) -- aucune nouvelle table, aucune donnée inventée
// (décision actée, spec-refonte-visuelle.md). Aucune dépendance vers Next.js
// ou Prisma (AD-1) : reçoit déjà les enregistrements et l'ensemble des jours
// scolaires en paramètres, ne lit jamais l'horloge ni la base lui-même
// (data/streak.ts s'en charge).
//
// Limite connue, assumée (pas de récupération rétroactive prévue) : une
// ligne `DayCompletion` n'est écrite que lorsque l'enfant interagit avec une
// checklist ce soir-là (actions/checklist.ts, actions/homework.ts) -- un
// soir sans rien à cocher (Sac/Révisions vides ce jour-là) qui n'a jamais été
// ouvert n'a donc aucune ligne, et compte ici comme une absence (streak
// interrompu), même si `computeSoirCompletion` l'aurait trivialement jugé
// complet s'il avait été recalculé. Documenté plutôt que corrigé : le
// corriger demanderait de rejouer rétroactivement la dérivation Sac/
// Révisions pour chaque jour passé, hors périmètre d'une refonte visuelle.

export interface DayCompletionRecord {
  /** ISO "yyyy-MM-dd". */
  dateIso: string;
  complete: boolean;
}

export interface StreakResult {
  current: number;
  best: number;
}

/**
 * `records` peut être en désordre ou partiel (seuls les jours où l'enfant a
 * interagi ont une ligne) -- `schoolDayIsoSet` doit lister TOUS les jours
 * scolaires (hors "jours sans cours", déjà exclus par l'appelant, cf.
 * data/streak.ts) entre le plus ancien enregistrement et `todayIso` inclus,
 * pour que l'absence d'enregistrement un jour scolaire soit bien traitée
 * comme une interruption plutôt qu'ignorée silencieusement.
 *
 * "Aujourd'hui" ne casse ni ne prolonge le streak tant que la soirée n'est
 * pas explicitement marquée complète (EXPERIENCE.md -- jamais un constat
 * d'échec avant l'heure) : `complete === true` aujourd'hui prolonge déjà le
 * streak affiché, `false`/absent laisse `current` refléter la série jusqu'à
 * hier.
 */
export function computeStreak(
  records: readonly DayCompletionRecord[],
  schoolDayIsoSet: ReadonlySet<string>,
  todayIso: string
): StreakResult {
  if (records.length === 0) {
    return { current: 0, best: 0 };
  }

  const completeByDate = new Map(
    records.map((record) => [record.dateIso, record.complete])
  );
  const orderedSchoolDays = [...schoolDayIsoSet].sort();

  let running = 0;
  let best = 0;
  let current = 0;

  for (const dateIso of orderedSchoolDays) {
    const complete = completeByDate.get(dateIso);

    if (dateIso === todayIso) {
      if (complete === true) {
        running += 1;
        best = Math.max(best, running);
      }
      current = running;
      continue;
    }

    if (complete === true) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
    current = running;
  }

  return { current, best };
}
