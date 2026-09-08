import { prisma } from "./prisma";

/**
 * Garantit qu'une unique ligne `User` existe en base.
 *
 * CartableFlow n'a pas d'écran de connexion (Story 1.1) : l'application
 * fonctionne pour un unique utilisateur implicite, dont la ligne doit exister
 * dès le premier démarrage (dev local via `prisma migrate dev`, ou première
 * requête après un déploiement Vercel/Supabase).
 *
 * Idempotent : si une ligne existe déjà, elle n'est pas recréée.
 */
export async function ensureSeedUser() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    return existing;
  }

  return prisma.user.create({ data: {} });
}

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
