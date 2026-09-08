"use server";

import { revalidatePath } from "next/cache";
import { ensureSeedUser, setWeekAReferenceMonday } from "@/data/user";
import { isWeekParity, mondayOfIso, shiftIsoDays } from "@/domain/schedule";
import { getTodaySchoolDate, schoolDateToIso } from "@/domain/school-day";

// Story 1.4 -- réglage "cette semaine est la semaine A/B", seule frontière
// de mutation pour User.weekAReferenceMonday (AD-1).

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function revalidateReglages() {
  try {
    revalidatePath("/reglages");
  } catch (error) {
    console.error("revalidatePath(/reglages) failed:", error);
  }
}

function revalidateEdt() {
  try {
    revalidatePath("/edt");
  } catch (error) {
    console.error("revalidatePath(/edt) failed:", error);
  }
}

function revalidateAccueil() {
  try {
    revalidatePath("/");
  } catch (error) {
    console.error("revalidatePath(/) failed:", error);
  }
}

/**
 * Déclare que la semaine calendaire en cours (calculée serveur, America/Guadeloupe,
 * AD-4) est la semaine A ou B -- dérive et enregistre `weekAReferenceMonday`
 * (un lundi appartenant à la semaine A) pour que `computeWeekParity` calcule
 * ensuite la parité de n'importe quelle date (Story 1.4). Ne touche jamais
 * aux créneaux existants : seule la référence change.
 */
export async function setCurrentWeekParity(
  parity: string
): Promise<ActionResult<null>> {
  if (!isWeekParity(parity)) {
    return { ok: false, error: "Parité invalide." };
  }

  try {
    const user = await ensureSeedUser();
    const todayIso = schoolDateToIso(getTodaySchoolDate(new Date()));
    const currentMondayIso = mondayOfIso(todayIso);
    const referenceMondayIso =
      parity === "A" ? currentMondayIso : shiftIsoDays(currentMondayIso, -7);

    await setWeekAReferenceMonday(
      user.id,
      new Date(`${referenceMondayIso}T00:00:00.000Z`)
    );

    revalidateReglages();
    revalidateEdt();
    revalidateAccueil();
    return { ok: true, data: null };
  } catch (error) {
    console.error("setCurrentWeekParity failed:", error);
    return {
      ok: false,
      error: "Impossible d'enregistrer la semaine de référence. Réessaie.",
    };
  }
}
