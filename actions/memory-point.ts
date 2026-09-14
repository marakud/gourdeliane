"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/current-user";
import {
  createMemoryPoint,
  deleteMemoryPoint,
  markMemoryPointReviewed,
  updateMemoryPointStatus,
} from "@/data/memory-point";
import { isMemoryStatus, type MemoryStatus } from "@/domain/memory-point";

export type MemoryActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function refreshMemoryPages() {
  revalidatePath("/memoire");
}

export interface MemoryPointFormInput {
  subjectId: string;
  content: string;
  note?: string;
}

export async function createMemoryPointAction(
  input: MemoryPointFormInput
): Promise<MemoryActionResult<{ id: string }>> {
  const subjectId = input.subjectId.trim();
  const content = input.content.trim();
  const note = input.note?.trim() || null;
  if (!subjectId) return { ok: false, error: "Choisis une matière." };
  if (!content) return { ok: false, error: "Indique le point à retravailler." };
  try {
    const userId = await requireUserId();
    const point = await createMemoryPoint(userId, subjectId, content, note);
    refreshMemoryPages();
    return { ok: true, data: { id: point.id } };
  } catch (error) {
    console.error("createMemoryPointAction failed:", error);
    return { ok: false, error: "Impossible d'ajouter ce point. Réessaie." };
  }
}

export async function setMemoryPointStatusAction(
  id: string,
  status: MemoryStatus
): Promise<MemoryActionResult<null>> {
  if (!id.trim() || !isMemoryStatus(status)) {
    return { ok: false, error: "Point de mémoire invalide." };
  }
  try {
    const userId = await requireUserId();
    await updateMemoryPointStatus(id, userId, status);
    refreshMemoryPages();
    return { ok: true, data: null };
  } catch (error) {
    console.error("setMemoryPointStatusAction failed:", error);
    return { ok: false, error: "Impossible de changer l'état. Réessaie." };
  }
}

export async function markMemoryPointReviewedAction(
  id: string
): Promise<MemoryActionResult<null>> {
  if (!id.trim()) return { ok: false, error: "Point de mémoire invalide." };
  try {
    const userId = await requireUserId();
    await markMemoryPointReviewed(id, userId);
    refreshMemoryPages();
    return { ok: true, data: null };
  } catch (error) {
    console.error("markMemoryPointReviewedAction failed:", error);
    return { ok: false, error: "Impossible d'enregistrer la révision." };
  }
}

export async function deleteMemoryPointAction(
  id: string
): Promise<MemoryActionResult<null>> {
  if (!id.trim()) return { ok: false, error: "Point de mémoire invalide." };
  try {
    const userId = await requireUserId();
    await deleteMemoryPoint(id, userId);
    refreshMemoryPages();
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteMemoryPointAction failed:", error);
    return { ok: false, error: "Impossible de supprimer ce point." };
  }
}
