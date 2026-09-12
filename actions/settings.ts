"use server";

import { revalidatePath } from "next/cache";
import { setFirstName, setWeekAReferenceMonday } from "@/data/user";
import { requireUserId } from "@/lib/current-user";
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
    const userId = await requireUserId();
    const todayIso = schoolDateToIso(getTodaySchoolDate(new Date()));
    const currentMondayIso = mondayOfIso(todayIso);
    const referenceMondayIso =
      parity === "A" ? currentMondayIso : shiftIsoDays(currentMondayIso, -7);

    await setWeekAReferenceMonday(
      userId,
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

// Même limite que components/settings/first-name-card.tsx (`maxLength` du
// champ) -- revérifiée ici puisque les Server Actions sont joignables
// directement, sans passer par le champ contraint côté client.
const MAX_FIRST_NAME_LENGTH = 60;

/**
 * Enregistre le prénom affiché dans le message d'accueil ("Bonjour
 * {firstName} !", app/(accueil)/page.tsx). Une chaîne vide efface le prénom
 * (retour à "Bonjour !" sans nom) -- ce n'est pas une valeur requise.
 */
export async function setFirstNameAction(
  firstName: string
): Promise<ActionResult<null>> {
  const trimmed = firstName.trim();
  if (trimmed.length > MAX_FIRST_NAME_LENGTH) {
    return { ok: false, error: `Le prénom ne peut pas dépasser ${MAX_FIRST_NAME_LENGTH} caractères.` };
  }

  try {
    const userId = await requireUserId();
    await setFirstName(userId, trimmed.length > 0 ? trimmed : null);
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: null };
  } catch (error) {
    console.error("setFirstNameAction failed:", error);
    return { ok: false, error: "Impossible d'enregistrer le prénom. Réessaie." };
  }
}
