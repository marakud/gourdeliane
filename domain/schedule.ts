// CartableFlow -- domain/schedule.ts (Story 1.2)
//
// Logique métier pure de l'emploi du temps : assignation de couleur de
// matière (AD-6) et validation d'un créneau. Aucune dépendance vers Next.js
// ou Prisma (AD-1 / domain/README.md) -- tout ce dont ces fonctions ont
// besoin leur est passé en argument par l'appelant (data/schedule.ts,
// actions/schedule.ts).

export const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

// Libellés affichés à l'enfant (français) -- les identifiants de code
// restent en anglais/majuscules par convention (cf. ARCHITECTURE-SPINE.md).
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

export function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
}

// Palette catégorielle subject-1 à subject-8 (DESIGN.md), cyclique au-delà.
const SUBJECT_COLOR_COUNT = 8;

/**
 * Assigne le prochain index de couleur (1..8) pour une nouvelle `Subject`
 * (AD-6). Pure : reçoit la liste des matières déjà existantes pour cet
 * utilisateur (déjà chargée par data/schedule.ts) et ne calcule le résultat
 * qu'à partir de leur `colorIndex` actuel -- jamais à partir de leur nombre
 * ou de leur position, pour ne jamais réutiliser immédiatement l'index
 * libéré par une matière supprimée pendant qu'un index supérieur est encore
 * pris par une matière active.
 *
 * Le résultat doit être écrit une fois pour toutes à la création de la
 * `Subject` et ne plus jamais être recalculé (AD-6) : cette fonction ne doit
 * donc être appelée qu'au moment de la création, jamais pour "corriger" une
 * matière existante.
 */
export function assignNextColorIndex(
  existingSubjects: readonly { colorIndex: number }[]
): number {
  const highest = existingSubjects.reduce(
    (max, subject) => Math.max(max, subject.colorIndex),
    0
  );
  return (highest % SUBJECT_COLOR_COUNT) + 1;
}

export interface ScheduleSlotInput {
  weekday: string;
  startTime: string;
  endTime: string;
  subjectName: string;
}

export type SlotValidationResult =
  | { valid: true }
  | { valid: false; error: string };

// "HH:mm", heures 00-23, minutes 00-59 -- zéro-paddé pour que la comparaison
// lexicographique (utilisée pour le tri et la comparaison fin > début) soit
// correcte.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Valide la saisie d'un créneau d'emploi du temps. Pure -- aucune dépendance
 * à la base ou à l'framework ; ne connaît rien des matières déjà en base
 * (la déduplication/création de `Subject` est gérée par data/schedule.ts).
 */
export function validateSlot(input: ScheduleSlotInput): SlotValidationResult {
  if (!isWeekday(input.weekday)) {
    return { valid: false, error: "Jour de la semaine invalide." };
  }

  if (input.subjectName.trim().length === 0) {
    return { valid: false, error: "Le nom de la matière est requis." };
  }

  if (!TIME_PATTERN.test(input.startTime) || !TIME_PATTERN.test(input.endTime)) {
    return {
      valid: false,
      error: "Horaire invalide (format attendu HH:mm).",
    };
  }

  if (input.endTime <= input.startTime) {
    return {
      valid: false,
      error: "L'heure de fin doit être après l'heure de début.",
    };
  }

  return { valid: true };
}
