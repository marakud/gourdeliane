import { prisma } from "./prisma";

/**
 * Garantit qu'une unique ligne `User` existe en base.
 *
 * CartableFlow n'a pas d'ecran de connexion (Story 1.1) : l'application
 * fonctionne pour un unique utilisateur implicite, dont la ligne doit exister
 * des le premier demarrage (dev local via `prisma migrate dev`, ou premiere
 * requete apres un deploiement Vercel/Supabase).
 *
 * Idempotent : si une ligne existe deja, elle n'est pas recreee.
 */
export async function ensureSeedUser() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    return existing;
  }

  return prisma.user.create({ data: {} });
}
