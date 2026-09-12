import { prisma } from "./prisma";

/**
 * Enregistre le lundi de référence de la semaine A (Story 1.4) --
 * `domain/schedule.ts::computeWeekParity` calcule ensuite la parité de
 * n'importe quelle date à partir de cette seule valeur.
 */
export async function setWeekAReferenceMonday(userId: string, mondayUtc: Date) {
  return prisma.user.update({
    where: { id: userId },
    data: { weekAReferenceMonday: mondayUtc },
  });
}

/**
 * Enregistre le prénom affiché dans le message d'accueil. `null`/chaîne vide
 * efface le prénom (retour à "Bonjour !" sans nom) -- pas une valeur requise.
 */
export async function setFirstName(userId: string, firstName: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { firstName },
  });
}
