"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/current-user";
import {
  createDevoir,
  deleteDevoir,
  toggleDevoirDone,
  updateDevoir,
} from "@/data/homework";
import { recomputeAndPersistSoirCompletion } from "@/data/day-completion";
import {
  DEFAULT_FREE_WINDOW_END,
  DEFAULT_FREE_WINDOW_START,
  isWeekday,
  TIME_PATTERN,
  type Weekday,
} from "@/domain/schedule";

// Toute mutation des devoirs passe par ce fichier (AD-1). Chaque action
// rappelle domain/homework.ts pour toute règle métier avant d'écrire via
// data/homework.ts, et retourne un résultat typé
// { ok: true, data } | { ok: false, error } -- jamais d'exception non gérée
// remontée à l'UI (même convention que actions/checklist.ts et
// actions/schedule.ts, ARCHITECTURE-SPINE.md).

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// `revalidatePath` exige un contexte de requête Next.js valide -- appelé en
// dehors (ex. script, test direct de l'action) il lève "Invariant: static
// generation store missing" (confirmé pendant la revue de la story 2.2,
// même fonction dupliquée dans actions/checklist.ts et actions/schedule.ts).
// Toujours appelée après une mutation déjà réussie : une erreur ici ne doit
// jamais transformer un succès réel en { ok: false } côté appelant.
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error(`revalidatePath(${path}) failed:`, error);
  }
}

function revalidateAccueil() {
  // app/(accueil)/page.tsx vit dans un groupe de routes -- son URL réelle
  // est "/", pas "/(accueil)". Le bloc "Devoirs" ne vit que sur Accueil
  // (Code Map) : créer/cocher/supprimer un devoir depuis le FAB de l'EDT
  // doit quand même revalider Accueil pour que la ligne y apparaisse
  // immédiatement à la prochaine navigation.
  safeRevalidate("/");
}

function revalidateEdt() {
  // Un devoir peut être programmé dans un trou libre de l'EDT
  // (plannedWeekday/plannedStartTime, retour utilisateur Story 2.4) et s'y
  // afficher -- toute mutation doit donc aussi revalider "/edt", pas
  // seulement Accueil.
  safeRevalidate("/edt");
}

// Story 2.7 -- même raisonnement que `safeRevalidate` ci-dessus : le
// recalcul/persistance de la complétude "Ce soir" (AD-5) est un
// enregistrement de bord (le futur Streak, Epic 4, pas encore construit) qui
// ne doit jamais transformer une bascule "fait" déjà réussie en
// `{ ok: false }` côté UI.
async function safeRecomputeSoirCompletion(userId: string) {
  try {
    await recomputeAndPersistSoirCompletion(userId, new Date());
  } catch (error) {
    console.error("recomputeAndPersistSoirCompletion failed:", error);
  }
}

export interface DevoirFormInput {
  subjectId: string;
  description: string;
  // Optionnels (Boundaries spec 2.4) : aucune validation ne les rend requis.
  aRendre?: boolean;
  echeance?: string; // ISO "yyyy-MM-dd", saisie via <input type="date">
  // Placement optionnel dans un trou libre de l'EDT (retour utilisateur
  // Story 2.4, "programmer le devoir dans l'EDT") -- les deux ensemble ou
  // aucun des deux, jamais l'un sans l'autre.
  plannedWeekday?: string;
  plannedStartTime?: string; // "HH:mm"
}

/**
 * Parse une échéance optionnelle "yyyy-MM-dd" en `Date | null`. `undefined`
 * ou chaîne vide -> `null` (pas d'échéance saisie, cas normal -- Boundaries
 * spec 2.4). Une chaîne non vide mais mal formée est en revanche rejetée
 * plutôt que silencieusement ignorée.
 */
function parseEcheance(
  dateIso: string | undefined
): { ok: true; value: Date | null } | { ok: false } {
  if (!dateIso || dateIso.trim().length === 0) {
    return { ok: true, value: null };
  }
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateIso);
  if (!isValidFormat) {
    return { ok: false };
  }
  const parsed = new Date(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false };
  }
  // `Date` accepte silencieusement un jour calendaire inexistant en le
  // reportant au mois suivant (ex. "2026-02-30" -> 2 mars) -- on rejette
  // plutôt que de stocker une échéance décalée sans que l'appelant s'en
  // aperçoive (le format seul, ci-dessus, ne suffit pas à l'exclure).
  if (parsed.toISOString().slice(0, 10) !== dateIso) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}

interface ParsedDevoirInput {
  subjectId: string;
  description: string;
  aRendre: boolean;
  echeance: Date | null;
  plannedWeekday: Weekday | null;
  plannedStartTime: string | null;
}

/**
 * Valide/normalise un `DevoirFormInput`, partagé par `createDevoirAction` et
 * `updateDevoirAction` (retour utilisateur -- édition, même règles que la
 * création). Matière + description sont les seuls champs obligatoires
 * (Boundaries spec 2.4) -- "à rendre", échéance et placement EDT restent
 * optionnels. Le placement (jour+heure) n'est pas revérifié ici comme
 * "réellement dans un trou libre" (pas de requête sur `ScheduleSlot`) --
 * le sélecteur (`FreeTimePicker`, `domain/schedule.ts::computeWeeklyFreeGaps`)
 * ne propose déjà que des trous libres au moment de l'affichage. Seuls le
 * format et l'appartenance à la fenêtre 8h-22h sont vérifiés ici.
 */
function parseDevoirFormInput(
  input: DevoirFormInput
): { ok: true; value: ParsedDevoirInput } | { ok: false; error: string } {
  const description = input.description.trim();
  if (description.length === 0) {
    return { ok: false, error: "La description est requise." };
  }
  if (input.subjectId.trim().length === 0) {
    return { ok: false, error: "Choisis une matière." };
  }
  const echeance = parseEcheance(input.echeance);
  if (!echeance.ok) {
    return { ok: false, error: "Date d'échéance invalide." };
  }

  const rawWeekday = input.plannedWeekday?.trim() || "";
  const rawStartTime = input.plannedStartTime?.trim() || "";
  if ((rawWeekday.length > 0) !== (rawStartTime.length > 0)) {
    return { ok: false, error: "Créneau incomplet." };
  }
  if (rawWeekday.length > 0 && !isWeekday(rawWeekday)) {
    return { ok: false, error: "Jour invalide." };
  }
  if (rawStartTime.length > 0) {
    if (!TIME_PATTERN.test(rawStartTime)) {
      return { ok: false, error: "Horaire invalide." };
    }
    // Le sélecteur ne propose que la fenêtre 8h-22h (retour utilisateur --
    // "de 8h à 22h") -- un appel direct pourrait la contourner sans ce
    // garde-fou, même s'il ne vérifie pas la disponibilité réelle du créneau.
    if (rawStartTime < DEFAULT_FREE_WINDOW_START || rawStartTime > DEFAULT_FREE_WINDOW_END) {
      return { ok: false, error: "Horaire hors de la plage 8h-22h." };
    }
  }

  return {
    ok: true,
    value: {
      subjectId: input.subjectId.trim(),
      description,
      aRendre: input.aRendre ?? false,
      echeance: echeance.value,
      plannedWeekday: isWeekday(rawWeekday) ? rawWeekday : null,
      plannedStartTime: rawStartTime.length > 0 ? rawStartTime : null,
    },
  };
}

/**
 * Crée un devoir depuis le FAB (Accueil ou EDT).
 */
export async function createDevoirAction(
  input: DevoirFormInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseDevoirFormInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  try {
    const userId = await requireUserId();
    const devoir = await createDevoir(
      userId,
      parsed.value.subjectId,
      parsed.value.description,
      parsed.value.aRendre,
      parsed.value.echeance,
      parsed.value.plannedWeekday,
      parsed.value.plannedStartTime
    );
    revalidateAccueil();
    revalidateEdt();
    return { ok: true, data: { id: devoir.id } };
  } catch (error) {
    console.error("createDevoirAction failed:", error);
    return { ok: false, error: "Impossible d'ajouter le devoir. Réessaie." };
  }
}

/**
 * Modifie un devoir existant (retour utilisateur -- corriger une erreur de
 * saisie sans passer par supprimer/recréer). Même validation que
 * `createDevoirAction` (`parseDevoirFormInput`) ; `done` n'est jamais touché
 * ici (AD-7, réservé à `toggleDevoirDoneAction`).
 */
export async function updateDevoirAction(
  id: string,
  input: DevoirFormInput
): Promise<ActionResult<{ id: string }>> {
  if (id.trim().length === 0) {
    return { ok: false, error: "Devoir invalide." };
  }
  const parsed = parseDevoirFormInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  try {
    const userId = await requireUserId();
    const devoir = await updateDevoir(
      id,
      userId,
      parsed.value.subjectId,
      parsed.value.description,
      parsed.value.aRendre,
      parsed.value.echeance,
      parsed.value.plannedWeekday,
      parsed.value.plannedStartTime
    );
    revalidateAccueil();
    revalidateEdt();
    return { ok: true, data: { id: devoir.id } };
  } catch (error) {
    console.error("updateDevoirAction failed:", error);
    return { ok: false, error: "Impossible de modifier le devoir. Réessaie." };
  }
}

export interface ToggleDevoirDoneInput {
  id: string;
  done: boolean;
}

/**
 * Coche/décoche un devoir (tap sur une ligne de "Devoirs", retour
 * utilisateur Story 2.4 -- bidirectionnel, contrairement à la première
 * itération de cette story : le devoir reste affiché, coché, jamais retiré
 * de la liste).
 */
export async function toggleDevoirDoneAction(
  input: ToggleDevoirDoneInput
): Promise<ActionResult<null>> {
  if (input.id.trim().length === 0) {
    return { ok: false, error: "Devoir invalide." };
  }

  try {
    const userId = await requireUserId();
    await toggleDevoirDone(input.id, userId, input.done);
    revalidateAccueil();
    revalidateEdt();
    // Story 2.7 (AD-5) -- un devoir "à rendre" échéant demain fait partie de
    // la complétude du moment "Ce soir" ; recalculée après chaque bascule
    // fait/pas fait, même si ce devoir précis ne s'avère pas concerné (le
    // recalcul relit l'état réel, jamais un calcul partiel). Appelé APRÈS
    // le retour `{ ok: true }` décidé (via safeRecomputeSoirCompletion, qui
    // avale ses propres erreurs) : la bascule elle-même a déjà réussi à ce
    // stade, ce recalcul ne doit jamais la remettre en cause.
    await safeRecomputeSoirCompletion(userId);
    return { ok: true, data: null };
  } catch (error) {
    console.error("toggleDevoirDoneAction failed:", error);
    return {
      ok: false,
      error: "Impossible de mettre à jour le devoir. Réessaie.",
    };
  }
}

export interface DeleteDevoirInput {
  id: string;
}

/**
 * Supprime définitivement un devoir (bouton "supprimer" avec icône, retour
 * utilisateur Story 2.4). Contrairement à `toggleDevoirDoneAction`, c'est
 * irréversible -- l'UI ne demande pas de confirmation, même convention que
 * `deleteSlot`/`deleteFixedChecklistItem` (actions/schedule.ts,
 * actions/checklist.ts).
 */
export async function deleteDevoirAction(
  input: DeleteDevoirInput
): Promise<ActionResult<null>> {
  if (input.id.trim().length === 0) {
    return { ok: false, error: "Devoir invalide." };
  }

  try {
    const userId = await requireUserId();
    await deleteDevoir(input.id, userId);
    revalidateAccueil();
    revalidateEdt();
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteDevoirAction failed:", error);
    return { ok: false, error: "Impossible de supprimer le devoir. Réessaie." };
  }
}
