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
// correcte. Exportée : actions/homework.ts valide `plannedStartTime` avec ce
// même motif plutôt que d'en dupliquer une copie (corrigé en revue).
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

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

export interface DaySlot {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  subject: { name: string; colorIndex: number };
}

/**
 * Dérive les créneaux d'un jour donné (Story 1.3, vues "Aujourd'hui"/"Demain") :
 * filtre par `weekday` et trie par heure, sauf si `dateIso` est marqué "sans
 * cours" -- auquel cas la liste est vide même si des créneaux récurrents
 * existent normalement ce jour de la semaine (un jour férié/de vacances
 * annule les cours de ce jour-là, cf. spec 1.3 I/O matrix). Pure : ne
 * distingue pas "sans cours explicite" de "aucun créneau saisi ce jour-là" --
 * les deux produisent une liste vide, à l'appelant de choisir le message.
 */
export function deriveDaySlots(
  allSlots: readonly DaySlot[],
  weekday: Weekday,
  dateIso: string,
  noSchoolDayIsoSet: ReadonlySet<string>
): DaySlot[] {
  if (noSchoolDayIsoSet.has(dateIso)) {
    return [];
  }

  return allSlots
    .filter((slot) => slot.weekday === weekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export interface SubjectRef {
  id: string;
  name: string;
  colorIndex: number;
}

/**
 * Déduit la liste ordonnée (sans doublon) des matières présentes dans une
 * liste de créneaux (ex. les créneaux de demain, Story 2.1 -- une matière
 * peut avoir plusieurs créneaux le même jour). Garde l'ordre du premier
 * créneau où chaque matière apparaît. Résout chaque créneau (qui ne porte que
 * le nom de la matière) vers l'enregistrement `Subject` complet (id inclus)
 * via `subjects` -- une matière du créneau introuvable dans `subjects` est
 * silencieusement ignorée plutôt que de produire une entrée invalide.
 */
export function dedupeSubjectsFromSlots<S extends { subject: { name: string } }>(
  slots: readonly S[],
  subjects: readonly SubjectRef[]
): SubjectRef[] {
  const subjectByName = new Map(subjects.map((subject) => [subject.name, subject]));
  const seenNames = new Set<string>();
  const result: SubjectRef[] = [];

  for (const slot of slots) {
    if (seenNames.has(slot.subject.name)) continue;
    seenNames.add(slot.subject.name);
    const subject = subjectByName.get(slot.subject.name);
    if (subject) {
      result.push(subject);
    }
  }

  return result;
}

// Fenêtre par défaut dans laquelle chercher des trous libres (retour
// utilisateur Story 2.4 : "tous les trous possibles de la semaine de lundi
// à dimanche de 8h à 22h").
export const DEFAULT_FREE_WINDOW_START = "08:00";
export const DEFAULT_FREE_WINDOW_END = "22:00";

export interface FreeGap {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

/**
 * Calcule les trous libres d'UN jour (aucun créneau) à l'intérieur d'une
 * fenêtre horaire (08:00-22:00 par défaut) -- retour utilisateur Story 2.4 :
 * "programmer le devoir dans l'EDT" doit proposer de la disponibilité
 * réelle, pas les créneaux (cours) eux-mêmes. Pure -- trie `daySlots`
 * elle-même par `startTime` avant de soustraire, l'appelant n'a pas besoin
 * de les pré-trier. Plusieurs créneaux qui se chevauchent ne produisent
 * jamais de trou négatif : le curseur ne recule jamais. Un créneau
 * entièrement hors fenêtre est ignoré ; un créneau qui déborde la fenêtre
 * (avant `windowStart` ou après `windowEnd`) est rogné à ses bornes avant
 * d'être soustrait -- sans ce rognage, un trou pourrait s'étendre au-delà
 * de `windowEnd` (bug de revue : un créneau à 23h avec une fenêtre finissant
 * à 22h produisait un trou "...-23:00" au lieu de "...-22:00").
 */
export function computeFreeGaps(
  daySlots: readonly { startTime: string; endTime: string }[],
  windowStart: string = DEFAULT_FREE_WINDOW_START,
  windowEnd: string = DEFAULT_FREE_WINDOW_END
): FreeGap[] {
  const sorted = daySlots
    .filter((slot) => slot.endTime > windowStart && slot.startTime < windowEnd)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const gaps: FreeGap[] = [];
  let cursor = windowStart;

  for (const slot of sorted) {
    const clippedStart = slot.startTime > windowStart ? slot.startTime : windowStart;
    const clippedEnd = slot.endTime < windowEnd ? slot.endTime : windowEnd;
    if (clippedStart > cursor) {
      gaps.push({ start: cursor, end: clippedStart });
    }
    if (clippedEnd > cursor) {
      cursor = clippedEnd;
    }
  }

  if (cursor < windowEnd) {
    gaps.push({ start: cursor, end: windowEnd });
  }

  return gaps;
}

/**
 * Même calcul que `computeFreeGaps`, mais pour les 7 jours de la semaine
 * d'un coup (lundi à dimanche, retour utilisateur Story 2.4) -- regroupe
 * `allSlots` par `weekday` puis délègue à `computeFreeGaps` pour chacun.
 */
export function computeWeeklyFreeGaps(
  allSlots: readonly { weekday: Weekday; startTime: string; endTime: string }[],
  windowStart: string = DEFAULT_FREE_WINDOW_START,
  windowEnd: string = DEFAULT_FREE_WINDOW_END
): Record<Weekday, FreeGap[]> {
  const byDay = new Map<Weekday, { startTime: string; endTime: string }[]>(
    WEEKDAYS.map((day) => [day, []])
  );
  for (const slot of allSlots) {
    byDay.get(slot.weekday)?.push(slot);
  }

  const result = {} as Record<Weekday, FreeGap[]>;
  for (const day of WEEKDAYS) {
    result[day] = computeFreeGaps(byDay.get(day) ?? [], windowStart, windowEnd);
  }
  return result;
}
