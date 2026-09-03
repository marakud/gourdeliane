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
