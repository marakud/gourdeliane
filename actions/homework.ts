"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/current-user";
import {
  createDevoir,
  deleteDevoir,
  toggleDevoirDone,
  updateDevoir,
} from "@/data/homework";
import { endActiveHomeworkTimeSession } from "@/data/homework-timer";
import { recomputeAndPersistSoirCompletion } from "@/data/day-completion";
import {
  DEFAULT_FREE_WINDOW_END,
  DEFAULT_FREE_WINDOW_START,
  TIME_PATTERN,
} from "@/domain/schedule";
import { MAX_ESTIMATED_MINUTES } from "@/domain/homework";

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
  // Un devoir dont la planification (planDate/planTime, évolution
  // CartableFlow -- distincte de l'échéance) porte une heure précise
  // s'affiche dans l'EDT du jour concerné -- toute mutation doit donc aussi
  // revalider "/edt", pas seulement Accueil.
  safeRevalidate("/edt");
}

function revalidateMesTaches() {
  // Évolution CartableFlow -- page "Mes tâches" (étape 3) affiche tous les
  // devoirs, pas seulement ceux d'Accueil/EDT -- une mutation faite depuis
  // n'importe quel écran (Accueil, EDT, ou cette page elle-même) doit aussi
  // la revalider.
  safeRevalidate("/mes-taches");
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

// Minuteur de devoirs (évolution CartableFlow, retour utilisateur) -- marquer
// un devoir fait arrête toute session en cours (le travail est terminé, plus
// rien à chronométrer) : best-effort, même raisonnement que
// `safeRecomputeSoirCompletion` -- la bascule "fait" a déjà réussi, cet
// arrêt ne doit jamais la remettre en cause.
async function safeStopActiveTimeSession(userId: string, devoirId: string) {
  try {
    await endActiveHomeworkTimeSession(userId, devoirId);
  } catch (error) {
    console.error("endActiveHomeworkTimeSession failed:", error);
  }
}

export interface DevoirFormInput {
  subjectId: string;
  description: string;
  // Optionnels (Boundaries spec 2.4) : aucune validation ne les rend requis.
  aRendre?: boolean;
  // Date de rendu fixée par l'école (retour utilisateur -- distincte de la
  // planification ci-dessous, jamais fusionnées : une première version de
  // cette évolution les avait à tort réunies en un seul champ).
  echeance?: string; // ISO "yyyy-MM-dd"
  // Jour + heure où l'élève prévoit de faire le devoir (évolution
  // CartableFlow, retour utilisateur) -- indépendant de l'échéance, choisi
  // via un calendrier proposant les trous libres de l'EDT ce jour-là.
  // `planTime` n'a de sens qu'accompagné de `planDate`, jamais seul.
  planDate?: string; // ISO "yyyy-MM-dd"
  planTime?: string; // "HH:mm"
  // Durée estimée en minutes (évolution CartableFlow, facultative) --
  // presets 10/15/20/30/45/60 ou une valeur personnalisée, saisie côté
  // formulaire (HomeworkFormDialog) ; ce champ n'accepte ici qu'un entier
  // positif borné (MAX_ESTIMATED_MINUTES), jamais une confiance aveugle
  // dans ce que le sélecteur aurait dû empêcher.
  estimatedMinutes?: number;
}

/**
 * Parse une date ISO "yyyy-MM-dd" optionnelle en `Date | null`. Générique --
 * réutilisée aussi bien pour l'échéance que pour la date de planification
 * (évolution CartableFlow, deux champs indépendants du formulaire). `undefined`
 * ou chaîne vide -> `null` (pas de date saisie, cas normal -- Boundaries spec
 * 2.4). Une chaîne non vide mais mal formée est en revanche rejetée plutôt
 * que silencieusement ignorée.
 */
function parseOptionalIsoDate(
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
  // plutôt que de stocker une date décalée sans que l'appelant s'en
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
  planDate: Date | null;
  planTime: string | null;
  estimatedMinutes: number | null;
}

/**
 * Valide une durée estimée optionnelle. `undefined` -> `null` (pas
 * renseignée, cas normal). Un nombre fourni doit être un entier strictement
 * positif et rester sous `MAX_ESTIMATED_MINUTES` -- un `NaN`/négatif/décimal
 * ne doit jamais s'écrire silencieusement en base.
 */
function parseEstimatedMinutes(
  value: number | undefined
): { ok: true; value: number | null } | { ok: false } {
  if (value === undefined) {
    return { ok: true, value: null };
  }
  if (!Number.isInteger(value) || value <= 0 || value > MAX_ESTIMATED_MINUTES) {
    return { ok: false };
  }
  return { ok: true, value };
}

/**
 * Valide/normalise un `DevoirFormInput`, partagé par `createDevoirAction` et
 * `updateDevoirAction` (retour utilisateur -- édition, même règles que la
 * création). Matière + description sont les seuls champs obligatoires
 * (Boundaries spec 2.4) -- "à rendre", échéance et planification restent
 * optionnelles. `planTime` n'a de sens qu'accompagnant `planDate` (évolution
 * CartableFlow) -- une heure sans date de planification est rejetée plutôt
 * que silencieusement ignorée. La disponibilité réelle du créneau choisi
 * n'est pas revérifiée ici (pas de requête sur `ScheduleSlot`) -- le
 * sélecteur (`PlanPicker`, `domain/schedule.ts::computeWeeklyFreeGaps`) ne
 * propose déjà que des trous libres au moment de l'affichage. Seuls le
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
  const echeance = parseOptionalIsoDate(input.echeance);
  if (!echeance.ok) {
    return { ok: false, error: "Date d'échéance invalide." };
  }
  const planDate = parseOptionalIsoDate(input.planDate);
  if (!planDate.ok) {
    return { ok: false, error: "Date de planification invalide." };
  }
  const estimatedMinutes = parseEstimatedMinutes(input.estimatedMinutes);
  if (!estimatedMinutes.ok) {
    return { ok: false, error: "Durée estimée invalide." };
  }

  const rawPlanTime = input.planTime?.trim() || "";
  if (rawPlanTime.length > 0) {
    if (planDate.value === null) {
      return { ok: false, error: "Une heure nécessite une date de planification." };
    }
    if (!TIME_PATTERN.test(rawPlanTime)) {
      return { ok: false, error: "Horaire invalide." };
    }
    // Le sélecteur ne propose que la fenêtre 8h-22h (retour utilisateur --
    // "de 8h à 22h") -- un appel direct pourrait la contourner sans ce
    // garde-fou, même s'il ne vérifie pas la disponibilité réelle du créneau.
    if (
      rawPlanTime < DEFAULT_FREE_WINDOW_START ||
      rawPlanTime > DEFAULT_FREE_WINDOW_END
    ) {
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
      planDate: planDate.value,
      planTime: rawPlanTime.length > 0 ? rawPlanTime : null,
      estimatedMinutes: estimatedMinutes.value,
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
      parsed.value.planDate,
      parsed.value.planTime,
      parsed.value.estimatedMinutes
    );
    revalidateAccueil();
    revalidateEdt();
    revalidateMesTaches();
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
      parsed.value.planDate,
      parsed.value.planTime,
      parsed.value.estimatedMinutes
    );
    revalidateAccueil();
    revalidateEdt();
    revalidateMesTaches();
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
    revalidateMesTaches();
    // Story 2.7 (AD-5) -- un devoir "à rendre" échéant demain fait partie de
    // la complétude du moment "Ce soir" ; recalculée après chaque bascule
    // fait/pas fait, même si ce devoir précis ne s'avère pas concerné (le
    // recalcul relit l'état réel, jamais un calcul partiel). Appelé APRÈS
    // le retour `{ ok: true }` décidé (via safeRecomputeSoirCompletion, qui
    // avale ses propres erreurs) : la bascule elle-même a déjà réussi à ce
    // stade, ce recalcul ne doit jamais la remettre en cause.
    await safeRecomputeSoirCompletion(userId);
    if (input.done) {
      await safeStopActiveTimeSession(userId, input.id);
    }
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
    revalidateMesTaches();
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteDevoirAction failed:", error);
    return { ok: false, error: "Impossible de supprimer le devoir. Réessaie." };
  }
}
