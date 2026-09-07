"use server";

import { revalidatePath } from "next/cache";
import { validateSlot, type Weekday } from "@/domain/schedule";
import { ensureSeedUser } from "@/data/user";
import {
  createScheduleSlot,
  deleteScheduleSlot,
  setNoSchoolDay,
  unsetNoSchoolDay,
  updateScheduleSlot,
} from "@/data/schedule";

// Toute mutation de l'EDT passe par ce fichier -- seule frontière de
// mutation (AD-1). Chaque action rappelle domain/schedule.ts pour toute
// règle de validation avant d'écrire via data/schedule.ts, et retourne un
// résultat typé { ok: true, data } | { ok: false, error } -- jamais
// d'exception non gérée remontée à l'UI (ARCHITECTURE-SPINE.md).

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface SlotFormInput {
  weekday: string;
  startTime: string;
  endTime: string;
  subjectName: string;
}

// `revalidatePath` exige un contexte de requête Next.js valide -- appelé en
// dehors (ex. script, test direct de l'action) il lève "Invariant: static
// generation store missing" (confirmé pendant la revue de la story 2.2, même
// fonction dupliquée dans actions/checklist.ts). Toujours appelée après une
// mutation déjà réussie : une erreur ici ne doit jamais transformer un
// succès réel en { ok: false } côté appelant.
function revalidateEdt() {
  try {
    revalidatePath("/edt");
  } catch (error) {
    console.error("revalidatePath(/edt) failed:", error);
  }
}

// Créer/modifier un créneau peut faire naître une nouvelle Subject
// (findOrCreateSubject, data/schedule.ts) -- Accueil (route "/", groupe
// (accueil)) lit aussi la liste des matières (Sac, et depuis la Story 2.4 le
// sélecteur du FAB "Ajouter un devoir"), donc sans ceci une matière tout
// juste créée depuis l'EDT resterait absente d'Accueil jusqu'à une autre
// revalidation.
function revalidateAccueil() {
  try {
    revalidatePath("/");
  } catch (error) {
    console.error("revalidatePath(/) failed:", error);
  }
}

export async function createSlot(
  input: SlotFormInput
): Promise<ActionResult<{ id: string }>> {
  const validation = validateSlot(input);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  try {
    const user = await ensureSeedUser();
    const slot = await createScheduleSlot({
      userId: user.id,
      weekday: input.weekday as Weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      subjectName: input.subjectName.trim(),
    });
    revalidateEdt();
    revalidateAccueil();
    return { ok: true, data: { id: slot.id } };
  } catch (error) {
    console.error("createSlot failed:", error);
    return {
      ok: false,
      error: "Impossible d'enregistrer le créneau. Réessaie.",
    };
  }
}

export async function updateSlot(
  id: string,
  input: SlotFormInput
): Promise<ActionResult<{ id: string }>> {
  const validation = validateSlot(input);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  try {
    const user = await ensureSeedUser();
    const slot = await updateScheduleSlot({
      id,
      userId: user.id,
      weekday: input.weekday as Weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      subjectName: input.subjectName.trim(),
    });
    revalidateEdt();
    revalidateAccueil();
    return { ok: true, data: { id: slot.id } };
  } catch (error) {
    console.error("updateSlot failed:", error);
    return {
      ok: false,
      error: "Impossible de modifier le créneau. Réessaie.",
    };
  }
}

export async function deleteSlot(id: string): Promise<ActionResult<null>> {
  try {
    const user = await ensureSeedUser();
    await deleteScheduleSlot(id, user.id);
    revalidateEdt();
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteSlot failed:", error);
    return {
      ok: false,
      error: "Impossible de supprimer le créneau. Réessaie.",
    };
  }
}

export async function markNoSchoolDay(
  date: string
): Promise<ActionResult<null>> {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Date invalide." };
  }

  try {
    const user = await ensureSeedUser();
    await setNoSchoolDay(user.id, parsed);
    revalidateEdt();
    return { ok: true, data: null };
  } catch (error) {
    console.error("markNoSchoolDay failed:", error);
    return {
      ok: false,
      error: "Impossible de marquer ce jour comme sans cours. Réessaie.",
    };
  }
}

export async function unmarkNoSchoolDay(
  date: string
): Promise<ActionResult<null>> {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Date invalide." };
  }

  try {
    const user = await ensureSeedUser();
    await unsetNoSchoolDay(user.id, parsed);
    revalidateEdt();
    return { ok: true, data: null };
  } catch (error) {
    console.error("unmarkNoSchoolDay failed:", error);
    return {
      ok: false,
      error: "Impossible de démarquer ce jour. Réessaie.",
    };
  }
}
