"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/current-user";
import {
  createLessonLog,
  deleteLessonLog,
  updateLessonLog,
} from "@/data/lesson-log";

// "Cahier de texte" (évolution CartableFlow, retour utilisateur) -- toute
// mutation passe par ce fichier (AD-1), retourne un résultat typé
// { ok: true, data } | { ok: false, error }, même convention que
// actions/homework.ts/actions/checklist.ts.

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// `revalidatePath` lève hors d'un contexte de requête Next.js (avalé ici,
// même raisonnement que actions/homework.ts::safeRevalidate) -- jamais
// transformer un succès déjà acquis en `{ ok: false }` côté appelant.
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error(`revalidatePath(${path}) failed:`, error);
  }
}

export interface LessonLogFormInput {
  subjectId: string;
  // Contrairement aux dates de Devoir (échéance/planification, toutes deux
  // optionnelles), la date d'une entrée de cahier de texte est le cœur même
  // de sa raison d'être -- obligatoire, comme la matière et le contenu.
  date: string; // ISO "yyyy-MM-dd"
  content: string;
}

/**
 * Parse une date ISO "yyyy-MM-dd" obligatoire en `Date`. Même logique de
 * validation que actions/homework.ts (format, calendrier réellement valide --
 * rejette un "30 février" plutôt que de le reporter silencieusement), mais
 * jamais optionnelle ici.
 */
function parseRequiredIsoDate(
  dateIso: string | undefined
): { ok: true; value: Date } | { ok: false } {
  if (!dateIso || dateIso.trim().length === 0) {
    return { ok: false };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return { ok: false };
  }
  const parsed = new Date(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false };
  }
  if (parsed.toISOString().slice(0, 10) !== dateIso) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}

interface ParsedLessonLogInput {
  subjectId: string;
  date: Date;
  content: string;
}

function parseLessonLogFormInput(
  input: LessonLogFormInput
): { ok: true; value: ParsedLessonLogInput } | { ok: false; error: string } {
  if (input.subjectId.trim().length === 0) {
    return { ok: false, error: "Choisis une matière." };
  }
  const date = parseRequiredIsoDate(input.date);
  if (!date.ok) {
    return { ok: false, error: "Date invalide." };
  }
  const content = input.content.trim();
  if (content.length === 0) {
    return { ok: false, error: "Décris ce qui a été vu en cours." };
  }

  return {
    ok: true,
    value: { subjectId: input.subjectId.trim(), date: date.value, content },
  };
}

/**
 * Crée une entrée de cahier de texte depuis le FAB.
 */
export async function createLessonLogAction(
  input: LessonLogFormInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseLessonLogFormInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  try {
    const userId = await requireUserId();
    const log = await createLessonLog(
      userId,
      parsed.value.subjectId,
      parsed.value.date,
      parsed.value.content
    );
    safeRevalidate("/cahier-de-texte");
    return { ok: true, data: { id: log.id } };
  } catch (error) {
    console.error("createLessonLogAction failed:", error);
    return { ok: false, error: "Impossible d'ajouter l'entrée. Réessaie." };
  }
}

/**
 * Modifie une entrée existante (retour utilisateur -- corriger une erreur de
 * saisie sans passer par supprimer/recréer). Même validation que
 * `createLessonLogAction`.
 */
export async function updateLessonLogAction(
  id: string,
  input: LessonLogFormInput
): Promise<ActionResult<{ id: string }>> {
  if (id.trim().length === 0) {
    return { ok: false, error: "Entrée invalide." };
  }
  const parsed = parseLessonLogFormInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  try {
    const userId = await requireUserId();
    const log = await updateLessonLog(
      id,
      userId,
      parsed.value.subjectId,
      parsed.value.date,
      parsed.value.content
    );
    safeRevalidate("/cahier-de-texte");
    return { ok: true, data: { id: log.id } };
  } catch (error) {
    console.error("updateLessonLogAction failed:", error);
    return { ok: false, error: "Impossible de modifier l'entrée. Réessaie." };
  }
}

export interface DeleteLessonLogInput {
  id: string;
}

/**
 * Supprime définitivement une entrée. Contrairement à Devoir/toggleDone, il
 * n'y a pas de bascule "fait/pas fait" à préserver ici -- la suppression est
 * la seule mutation destructive de cette entité, sans confirmation, même
 * convention que `deleteDevoirAction`.
 */
export async function deleteLessonLogAction(
  input: DeleteLessonLogInput
): Promise<ActionResult<null>> {
  if (input.id.trim().length === 0) {
    return { ok: false, error: "Entrée invalide." };
  }

  try {
    const userId = await requireUserId();
    await deleteLessonLog(input.id, userId);
    safeRevalidate("/cahier-de-texte");
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteLessonLogAction failed:", error);
    return { ok: false, error: "Impossible de supprimer l'entrée. Réessaie." };
  }
}
