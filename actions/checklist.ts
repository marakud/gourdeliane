"use server";

import { revalidatePath } from "next/cache";
import {
  CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
  CHECKLIST_TYPE_SAC,
} from "@/domain/checklist";
import { ensureSeedUser } from "@/data/user";
import {
  createSubjectItem as createSubjectItemData,
  deleteSubjectItem as deleteSubjectItemData,
  updateSubjectItem as updateSubjectItemData,
  upsertChecklistItemState,
} from "@/data/checklist";

// Toute mutation du sac/des objets par matière passe par ce fichier (AD-1).
// Chaque action retourne { ok: true, data } | { ok: false, error } -- jamais
// d'exception non gérée remontée à l'UI (ARCHITECTURE-SPINE.md).

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function revalidateAccueil() {
  // app/(accueil)/page.tsx vit dans un groupe de routes -- son URL réelle
  // est "/", pas "/(accueil)".
  revalidatePath("/");
}

function revalidateReglages() {
  revalidatePath("/reglages");
}

/**
 * Parse une date "yyyy-MM-dd" (celle pour laquelle la checklist est
 * préparée, ex. demain) en `Date`. Retourne `null` si le format est invalide
 * plutôt que de laisser `new Date(...)` produire un `Invalid Date` silencieux.
 */
function parseChecklistDate(dateIso: string): Date | null {
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateIso);
  if (!isValidFormat) {
    return null;
  }
  const parsed = new Date(`${dateIso}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface ToggleChecklistItemInput {
  date: string; // ISO "yyyy-MM-dd", jour pour lequel la checklist est préparée
  sourceId: string;
  checked: boolean;
}

export async function toggleChecklistItem(
  input: ToggleChecklistItemInput
): Promise<ActionResult<null>> {
  const date = parseChecklistDate(input.date);
  if (!date) {
    return { ok: false, error: "Date invalide." };
  }
  if (input.sourceId.trim().length === 0) {
    return { ok: false, error: "Objet invalide." };
  }

  try {
    const user = await ensureSeedUser();
    await upsertChecklistItemState({
      userId: user.id,
      date,
      checklistType: CHECKLIST_TYPE_SAC,
      sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
      sourceId: input.sourceId,
      checked: input.checked,
    });
    revalidateAccueil();
    return { ok: true, data: null };
  } catch (error) {
    console.error("toggleChecklistItem failed:", error);
    return {
      ok: false,
      error: "Impossible de mettre à jour la case. Réessaie.",
    };
  }
}

export interface SubjectItemFormInput {
  subjectId: string;
  label: string;
}

export async function createSubjectItem(
  input: SubjectItemFormInput
): Promise<ActionResult<{ id: string }>> {
  const label = input.label.trim();
  if (label.length === 0) {
    return { ok: false, error: "Le nom de l'objet est requis." };
  }
  if (input.subjectId.trim().length === 0) {
    return { ok: false, error: "Matière invalide." };
  }

  try {
    const user = await ensureSeedUser();
    const item = await createSubjectItemData(user.id, input.subjectId, label);
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: { id: item.id } };
  } catch (error) {
    console.error("createSubjectItem failed:", error);
    return { ok: false, error: "Impossible d'ajouter l'objet. Réessaie." };
  }
}

export async function updateSubjectItem(
  id: string,
  label: string
): Promise<ActionResult<{ id: string }>> {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Le nom de l'objet est requis." };
  }

  try {
    const user = await ensureSeedUser();
    const item = await updateSubjectItemData(id, user.id, trimmed);
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: { id: item.id } };
  } catch (error) {
    console.error("updateSubjectItem failed:", error);
    return { ok: false, error: "Impossible de modifier l'objet. Réessaie." };
  }
}

export async function deleteSubjectItem(
  id: string
): Promise<ActionResult<null>> {
  try {
    const user = await ensureSeedUser();
    await deleteSubjectItemData(id, user.id);
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteSubjectItem failed:", error);
    return { ok: false, error: "Impossible de supprimer l'objet. Réessaie." };
  }
}
