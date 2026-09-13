// CartableFlow -- domain/homework-timer.ts (évolution CartableFlow, retour
// utilisateur -- minuteur de devoirs)
//
// Dérivation pure liée aux sessions de travail chronométrées : agrégation
// des sessions passées/en cours, calcul de progression d'un minuteur,
// formatage. Aucune dépendance vers Next.js ou Prisma (AD-1 / domain/README.md).
// Contrairement au reste du domaine, ce fichier manipule ponctuellement des
// instants complets (pas seulement des dates calendaires) -- nécessaire pour
// une durée en secondes, jamais arrondie au jour comme ailleurs.

export const TIMER_MODE_CHRONO = "CHRONO" as const;
export const TIMER_MODE_MINUTEUR = "MINUTEUR" as const;

export type TimerMode = typeof TIMER_MODE_CHRONO | typeof TIMER_MODE_MINUTEUR;

export function isTimerMode(value: string): value is TimerMode {
  return value === TIMER_MODE_CHRONO || value === TIMER_MODE_MINUTEUR;
}

/** Formate un nombre de secondes en affichage horloge -- "MM:SS" en dessous
 * d'une heure, "H:MM:SS" au-delà (jamais de forme textuelle "1 h 10" ici,
 * réservée à `formatEstimatedDuration`, domain/homework.ts -- ce format-ci
 * sert un compteur qui défile en direct, pas un total ponctuel). Négatif ou
 * non-fini est ramené à 0 -- un compteur affiché ne doit jamais reculer sous
 * zéro ni afficher "NaN" lors d'un calcul transitoire côté client. */
export function formatClockDuration(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export interface TimerProgress {
  elapsedSeconds: number;
  /** `null` pour un chronomètre libre (CHRONO) -- pas de durée prévue à
   * comparer. */
  remainingSeconds: number | null;
  /** Toujours 0 pour CHRONO ou tant que le minuteur n'est pas dépassé. */
  overtimeSeconds: number;
  /** `true` une fois le minuteur dépassé (jamais pour CHRONO) -- retour
   * utilisateur : à ce stade l'affichage bascule en "Temps écoulé", sans
   * rien verrouiller (ton non punitif, DESIGN.md). */
  isOvertime: boolean;
}

/**
 * Calcule la progression d'une session à partir du temps déjà écoulé
 * (calculé côté appelant depuis `startedAt` et l'horloge réelle -- cette
 * fonction ne lit jamais l'heure elle-même, AD-1). Pure et testable
 * indépendamment du ticking réel (composant client).
 */
export function computeTimerProgress(
  mode: TimerMode,
  plannedSeconds: number | null,
  elapsedSeconds: number
): TimerProgress {
  const safeElapsed = Math.max(0, elapsedSeconds);
  if (mode === TIMER_MODE_CHRONO || plannedSeconds === null) {
    return {
      elapsedSeconds: safeElapsed,
      remainingSeconds: null,
      overtimeSeconds: 0,
      isOvertime: false,
    };
  }
  const remaining = plannedSeconds - safeElapsed;
  return {
    elapsedSeconds: safeElapsed,
    remainingSeconds: Math.max(0, remaining),
    overtimeSeconds: Math.max(0, -remaining),
    isOvertime: remaining < 0,
  };
}

/** Une session telle que chargée par data/homework-timer.ts -- instants déjà
 * réduits à des chaînes ISO complètes (pas seulement une date calendaire,
 * contrairement au reste du domaine) par l'appelant (AD-1). */
export interface HomeworkTimeSessionInput {
  devoirId: string;
  mode: TimerMode;
  plannedSeconds: number | null;
  startedAtIso: string;
  endedAtIso: string | null;
}

export interface ActiveHomeworkSession {
  mode: TimerMode;
  plannedSeconds: number | null;
  startedAtIso: string;
}

export interface HomeworkTimeSessionsSummary {
  /** Au plus une entrée par devoir en pratique (l'UI n'en démarre jamais une
   * 2e tant qu'une est active) -- une Map, pas un tableau, pour un accès
   * direct par devoirId depuis les pages qui enrichissent chaque devoir. */
  activeSessionByDevoirId: Map<string, ActiveHomeworkSession>;
  /** Somme des sessions TERMINÉES (secondes) par devoir -- une session encore
   * active n'est jamais comptée ici (son temps n'est pas encore "réel" tant
   * qu'elle n'est pas arrêtée), affiché séparément via la carte de session
   * active. */
  totalEndedSecondsByDevoirId: Map<string, number>;
}

/**
 * Résume une liste de sessions (tous devoirs confondus, chargée une seule
 * fois par la page) en deux Maps -- jamais un second calcul divergent par
 * devoir (AD-5). Une session sans `endedAtIso` est active ; toutes les
 * autres contribuent à leur total par devoir. Une durée négative (horloge
 * serveur incohérente, cas théorique) est ramenée à 0 plutôt que de
 * soustraire du total.
 */
export function summarizeHomeworkTimeSessions(
  sessions: readonly HomeworkTimeSessionInput[]
): HomeworkTimeSessionsSummary {
  const activeSessionByDevoirId = new Map<string, ActiveHomeworkSession>();
  const totalEndedSecondsByDevoirId = new Map<string, number>();

  for (const session of sessions) {
    if (session.endedAtIso === null) {
      activeSessionByDevoirId.set(session.devoirId, {
        mode: session.mode,
        plannedSeconds: session.plannedSeconds,
        startedAtIso: session.startedAtIso,
      });
      continue;
    }
    const durationSeconds = Math.max(
      0,
      Math.round(
        (Date.parse(session.endedAtIso) - Date.parse(session.startedAtIso)) / 1000
      )
    );
    totalEndedSecondsByDevoirId.set(
      session.devoirId,
      (totalEndedSecondsByDevoirId.get(session.devoirId) ?? 0) + durationSeconds
    );
  }

  return { activeSessionByDevoirId, totalEndedSecondsByDevoirId };
}
