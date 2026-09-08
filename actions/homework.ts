"use server";

import { revalidatePath } from "next/cache";
import { ensureSeedUser } from "@/data/user";
import { createDevoir, deleteDevoir, toggleDevoirDone } from "@/data/homework";

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
  // Un devoir peut être rattaché à un créneau EDT (scheduleSlotId, retour
  // utilisateur Story 2.4) et s'y afficher -- toute mutation doit donc aussi
  // revalider "/edt", pas seulement Accueil.
  safeRevalidate("/edt");
}

export interface DevoirFormInput {
  subjectId: string;
  description: string;
  // Optionnels (Boundaries spec 2.4) : aucune validation ne les rend requis.
  aRendre?: boolean;
  echeance?: string; // ISO "yyyy-MM-dd", saisie via <input type="date">
  // Rattachement optionnel à un créneau EDT existant (retour utilisateur
  // Story 2.4, "programmer le devoir dans l'EDT").
  scheduleSlotId?: string;
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

/**
 * Crée un devoir depuis le FAB (Accueil ou EDT). Matière + description sont
 * les seuls champs obligatoires (Boundaries spec 2.4) -- "à rendre",
 * échéance et créneau EDT restent optionnels, aucune validation ne les rend
 * requis.
 */
export async function createDevoirAction(
  input: DevoirFormInput
): Promise<ActionResult<{ id: string }>> {
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
  const scheduleSlotId =
    input.scheduleSlotId && input.scheduleSlotId.trim().length > 0
      ? input.scheduleSlotId
      : null;

  try {
    const user = await ensureSeedUser();
    const devoir = await createDevoir(
      user.id,
      input.subjectId,
      description,
      input.aRendre ?? false,
      echeance.value,
      scheduleSlotId
    );
    revalidateAccueil();
    revalidateEdt();
    return { ok: true, data: { id: devoir.id } };
  } catch (error) {
    console.error("createDevoirAction failed:", error);
    return { ok: false, error: "Impossible d'ajouter le devoir. Réessaie." };
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
    const user = await ensureSeedUser();
    await toggleDevoirDone(input.id, user.id, input.done);
    revalidateAccueil();
    revalidateEdt();
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
    const user = await ensureSeedUser();
    await deleteDevoir(input.id, user.id);
    revalidateAccueil();
    revalidateEdt();
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteDevoirAction failed:", error);
    return { ok: false, error: "Impossible de supprimer le devoir. Réessaie." };
  }
}
