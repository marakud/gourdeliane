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

// Alternance semaine A/B (Story 1.4) : un ScheduleSlot avec weekParity =
// null vaut pour toutes les semaines (comportement historique, Story 1.2) ;
// "A"/"B" ne vaut que les semaines de cette parité.
export type WeekParity = "A" | "B";

export function isWeekParity(value: string): value is WeekParity {
  return value === "A" || value === "B";
}

export const WEEK_PARITY_LABELS: Record<WeekParity, string> = {
  A: "Sem. A",
  B: "Sem. B",
};

// Expansion accessible de WEEK_PARITY_LABELS (badge abrégé) -- lue par les
// lecteurs d'écran et affichée en `title` au survol (components/schedule/slot-row.tsx).
export const WEEK_PARITY_FULL_LABELS: Record<WeekParity, string> = {
  A: "Semaine A",
  B: "Semaine B",
};

function isoToUtcNoonMs(dateIso: string): number {
  const [year, month, day] = dateIso.split("-").map(Number);
  return Date.UTC(year, month - 1, day, 12);
}

function utcNoonMsToIso(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Lundi (ISO "yyyy-MM-dd") de la semaine calendaire contenant `dateIso`.
 * Ancrage midi UTC (même technique que domain/school-day.ts) pour rester
 * loin de toute frontière de fuseau -- exportée pour actions/settings.ts
 * (Story 1.4).
 */
export function mondayOfIso(dateIso: string): string {
  const noonMs = isoToUtcNoonMs(dateIso);
  const jsWeekday = new Date(noonMs).getUTCDay(); // 0=dimanche..6=samedi
  const mondayOffsetDays = (jsWeekday + 6) % 7; // 0=lundi..6=dimanche
  return utcNoonMsToIso(noonMs - mondayOffsetDays * 86_400_000);
}

/** Décale `dateIso` de `days` jours calendaires (peut être négatif). */
export function shiftIsoDays(dateIso: string, days: number): string {
  return utcNoonMsToIso(isoToUtcNoonMs(dateIso) + days * 86_400_000);
}

/**
 * Calcule si `dateIso` tombe en semaine A ou B, à partir d'un lundi connu
 * appartenant à la semaine A (`weekAReferenceMondayIso`, User.weekAReferenceMonday)
 * -- Story 1.4. Pure, ancrée sur le lundi de chaque semaine (jamais la date
 * brute) pour que toute date de la même semaine calendaire renvoie la même
 * parité. Le nombre de semaines d'écart peut être négatif (date antérieure à
 * la référence) -- le modulo est ramené dans [0, 2) pour rester correct.
 */
export function computeWeekParity(
  dateIso: string,
  weekAReferenceMondayIso: string
): WeekParity {
  const targetMondayMs = isoToUtcNoonMs(mondayOfIso(dateIso));
  const refMondayMs = isoToUtcNoonMs(mondayOfIso(weekAReferenceMondayIso));
  const diffWeeks = Math.round((targetMondayMs - refMondayMs) / (7 * 86_400_000));
  const mod = ((diffWeeks % 2) + 2) % 2;
  return mod === 0 ? "A" : "B";
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

/**
 * Ramène un `colorIndex` dans [1, 8] (palette cyclique au-delà de 8, AD-6) --
 * partagée entre `components/schedule/subject-tag.tsx` et
 * `components/schedule/week-grid.tsx` (correctif de revue : les deux
 * dupliquaient la même formule indépendamment).
 */
export function normalizeSubjectColorIndex(colorIndex: number): number {
  return ((((colorIndex - 1) % SUBJECT_COLOR_COUNT) + SUBJECT_COLOR_COUNT) % SUBJECT_COLOR_COUNT) + 1;
}

export interface ScheduleSlotInput {
  weekday: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  // Story 1.4 -- "" ou absent = toutes les semaines, sinon "A"/"B".
  weekParity?: string | null;
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

  if (input.weekParity && !isWeekParity(input.weekParity)) {
    return { valid: false, error: "Parité de semaine invalide." };
  }

  return { valid: true };
}

export interface DaySlot {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  // Story 1.4 -- absent/null = toutes les semaines. Optionnel pour rester
  // compatible avec les fixtures de test antérieures à cette story.
  weekParity?: WeekParity | null;
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
 *
 * `weekParity` (Story 1.4, 5e paramètre optionnel -- signature à 4
 * arguments inchangée pour rester rétrocompatible) : quand fourni (y
 * compris `null`, ex. référence non configurée), ne garde que les créneaux
 * "toutes les semaines" (weekParity absent/null) plus ceux de cette parité
 * exacte. Omis (`undefined`), aucun filtrage par parité n'est appliqué.
 * L'appelant doit calculer la parité de CETTE `dateIso` précisément (jamais
 * réutiliser une parité "du jour" pour "demain" -- cf. Boundaries spec 1.4,
 * un changement de semaine peut tomber entre les deux).
 */
export function deriveDaySlots(
  allSlots: readonly DaySlot[],
  weekday: Weekday,
  dateIso: string,
  noSchoolDayIsoSet: ReadonlySet<string>,
  weekParity?: WeekParity | null
): DaySlot[] {
  if (noSchoolDayIsoSet.has(dateIso)) {
    return [];
  }

  return allSlots
    .filter((slot) => slot.weekday === weekday)
    .filter((slot) =>
      weekParity === undefined
        ? true
        : slot.weekParity == null || slot.weekParity === weekParity
    )
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

// Positionnement d'une grille horaire réelle (Story 1.5, refonte visuelle de
// la vue Semaine ≥768px) : convertit "HH:mm" en minutes depuis minuit pour
// calculer où et sur quelle hauteur positionner chaque créneau.

/** "HH:mm" -> minutes depuis minuit. Suppose une chaîne déjà valide
 * (TIME_PATTERN) -- pas de garde ici, mêmes conventions que le reste de ce
 * fichier (appelants internes uniquement, jamais d'entrée utilisateur brute). */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export const DEFAULT_GRID_WINDOW_START = "08:00";
export const DEFAULT_GRID_WINDOW_END = "18:00";

export interface GridWindow {
  start: string;
  end: string;
}

/**
 * Calcule la fenêtre horaire de la grille (Story 1.5) : la plage par défaut
 * (8h-18h), élargie à l'heure pleine la plus proche si un créneau réel
 * déborde -- jamais figée, pour rester lisible avec peu de données tout en
 * s'adaptant à un emploi du temps réel qui commence plus tôt ou finit plus
 * tard.
 */
export function computeGridWindow(
  slots: readonly { startTime: string; endTime: string }[],
  defaultStart: string = DEFAULT_GRID_WINDOW_START,
  defaultEnd: string = DEFAULT_GRID_WINDOW_END
): GridWindow {
  let startMinutes = timeToMinutes(defaultStart);
  let endMinutes = timeToMinutes(defaultEnd);

  for (const slot of slots) {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    if (slotStart < startMinutes) {
      startMinutes = Math.floor(slotStart / 60) * 60;
    }
    if (slotEnd > endMinutes) {
      endMinutes = Math.ceil(slotEnd / 60) * 60;
    }
  }

  return { start: minutesToTime(startMinutes), end: minutesToTime(endMinutes) };
}

export interface SlotLayout {
  topPercent: number;
  heightPercent: number;
}

/**
 * Position/hauteur (en % de la fenêtre) d'un créneau dans la grille -- pure,
 * ne connaît rien du rendu (la hauteur minimale tapable d'une case très
 * courte se gère en CSS côté composant, pas ici). Rogné à [0, 100] : un
 * créneau qui déborderait malgré tout de la fenêtre fournie (ex. appelant
 * n'ayant pas élargi via `computeGridWindow` sur les mêmes créneaux) ne
 * produit jamais de position/hauteur négative ou hors bornes.
 */
export function computeSlotLayout(
  slot: { startTime: string; endTime: string },
  windowStart: string,
  windowEnd: string
): SlotLayout {
  const windowStartMinutes = timeToMinutes(windowStart);
  const windowEndMinutes = timeToMinutes(windowEnd);
  const totalMinutes = windowEndMinutes - windowStartMinutes;

  const rawTop =
    ((timeToMinutes(slot.startTime) - windowStartMinutes) / totalMinutes) * 100;
  const rawBottom =
    ((timeToMinutes(slot.endTime) - windowStartMinutes) / totalMinutes) * 100;

  const topPercent = Math.max(0, Math.min(100, rawTop));
  const bottomPercent = Math.max(0, Math.min(100, rawBottom));

  return { topPercent, heightPercent: bottomPercent - topPercent };
}
