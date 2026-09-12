"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/data/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

// Toute mutation passe par ce fichier (AD-1), même convention que
// actions/checklist.ts et actions/schedule.ts.

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export interface RegisterInput {
  email: string;
  password: string;
}

function validateRegisterInput(
  input: RegisterInput
): { ok: true; email: string } | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Adresse email invalide." };
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    };
  }
  return { ok: true, email };
}

/**
 * Inscription d'une nouvelle famille.
 *
 * Rattachement du compte historique -- CartableFlow existait avant
 * l'authentification avec un unique `User` (aucun `email`/`passwordHash`).
 * Plutôt que de créer une famille vide en plus et de perdre son EDT/devoirs/
 * streak déjà en base, la TOUTE PREMIÈRE inscription (aucun `User` n'a encore
 * d'`email` renseigné) réutilise ce `User` historique -- il devient
 * simplement le premier compte. Toute inscription suivante crée une famille
 * réellement nouvelle et vide, comme attendu.
 *
 * Connecte immédiatement après succès (`signIn` redirige vers "/") -- pas
 * d'étape de connexion séparée après l'inscription.
 */
export async function registerAction(
  input: RegisterInput
): Promise<ActionResult<null>> {
  const validated = validateRegisterInput(input);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }
  const { email } = validated;

  const existingWithEmail = await prisma.user.findUnique({ where: { email } });
  if (existingWithEmail) {
    return { ok: false, error: "Un compte existe déjà avec cet email." };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const legacyUser = await prisma.user.findFirst({
    where: { email: null, passwordHash: null },
  });

  if (legacyUser) {
    await prisma.user.update({
      where: { id: legacyUser.id },
      data: { email, passwordHash },
    });
  } else {
    await prisma.user.create({ data: { email, passwordHash } });
  }

  return signInOrError({ email, password: input.password });
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Connexion (compte déjà existant). Même relais `signInOrError` que
 * `registerAction` -- un email/mot de passe invalide ne doit jamais faire
 * planter la page (AuthError), tout le reste (redirection de succès) doit
 * remonter tel quel. */
export async function loginAction(
  input: LoginInput
): Promise<ActionResult<null>> {
  return signInOrError({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
}

/**
 * `signIn` (Auth.js) lève une redirection interne (`NEXT_REDIRECT`) vers "/"
 * en cas de succès -- rethrow obligatoire, jamais avalée ici, sinon Next.js
 * ne redirige jamais réellement. Seule une véritable `AuthError` (identifiants
 * invalides) se traduit en résultat `{ ok: false }` géré par l'UI.
 */
async function signInOrError(credentials: {
  email: string;
  password: string;
}): Promise<ActionResult<null>> {
  try {
    await signIn("credentials", { ...credentials, redirectTo: "/" });
    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Email ou mot de passe incorrect." };
    }
    throw error;
  }
}
