import { prisma } from "./prisma";
import type { TimerMode } from "@/domain/homework-timer";

// Sessions de travail chronométrées sur un devoir (évolution CartableFlow,
// retour utilisateur -- bouton "Commencer"). Toute logique de dérivation
// (agrégation, calcul de progression) vit dans domain/homework-timer.ts,
// jamais ici.

/**
 * Démarre une nouvelle session pour un devoir. Ne vérifie jamais ici qu'une
 * session est déjà active pour ce devoir (actions/homework-timer.ts s'en
 * charge en amont, pour retourner une erreur utilisateur claire plutôt
 * qu'un empilement silencieux de sessions concurrentes).
 */
export async function startHomeworkTimeSession(
  userId: string,
  devoirId: string,
  mode: TimerMode,
  plannedSeconds: number | null
) {
  return prisma.homeworkTimeSession.create({
    data: { userId, devoirId, mode, plannedSeconds },
  });
}

/**
 * Termine la session active (`endedAt = null`) d'un devoir donné, si elle
 * existe -- `updateMany` scopé sur `endedAt: null` plutôt qu'un
 * read-then-write : idempotent (aucune session active -> aucun effet,
 * jamais une erreur), même principe que data/homework.ts::startDevoir.
 * Retourne le nombre de sessions effectivement arrêtées (0 ou 1 en
 * pratique).
 */
export async function endActiveHomeworkTimeSession(
  userId: string,
  devoirId: string
): Promise<{ stopped: boolean }> {
  const result = await prisma.homeworkTimeSession.updateMany({
    where: { userId, devoirId, endedAt: null },
    data: { endedAt: new Date() },
  });
  return { stopped: result.count > 0 };
}

/**
 * Liste toutes les sessions d'un utilisateur, tous devoirs confondus --
 * l'appelant (page) les résume via
 * domain/homework-timer.ts::summarizeHomeworkTimeSessions plutôt que de
 * multiplier les requêtes par devoir.
 */
export async function listHomeworkTimeSessions(userId: string) {
  return prisma.homeworkTimeSession.findMany({
    where: { userId },
    orderBy: { startedAt: "asc" },
  });
}
