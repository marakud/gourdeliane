import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/data/prisma";

/**
 * Résout l'id de l'utilisateur courant depuis la session (pages Server
 * Component, Server Actions) -- remplace l'ancien `ensureSeedUser().id`
 * (utilisateur unique) depuis l'ajout de l'authentification multi-famille.
 * Ne fait aucune requête base (l'id vient déjà du JWT de session) -- pour la
 * quasi-totalité des appelants, qui n'ont besoin que de cet id.
 *
 * `middleware.ts` protège déjà toutes les pages/actions (redirection vers
 * `/login` si pas de session) -- ce garde-fou est une seconde ligne de
 * défense, jamais le seul rempart (une Server Action reste techniquement
 * joignable directement).
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

/**
 * Comme `requireUserId`, mais renvoie la ligne `User` complète -- pour les
 * quelques appelants qui ont aussi besoin de `firstName`/
 * `weekAReferenceMonday` (ex. app/(app)/(accueil)/page.tsx), pas seulement de
 * l'id. Un appel base supplémentaire par rapport à `requireUserId` -- réservé
 * à ces cas, jamais le défaut.
 */
export async function requireCurrentUser() {
  const userId = await requireUserId();
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}
