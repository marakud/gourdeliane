"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/current-user";
import { startDevoir } from "@/data/homework";
import {
  endActiveHomeworkTimeSession,
  listHomeworkTimeSessions,
  startHomeworkTimeSession,
} from "@/data/homework-timer";
import {
  isTimerMode,
  TIMER_MODE_MINUTEUR,
  type TimerMode,
} from "@/domain/homework-timer";
import { MAX_ESTIMATED_MINUTES } from "@/domain/homework";
import type { ActionResult } from "@/actions/homework";

// Minuteur de devoirs (évolution CartableFlow, retour utilisateur) -- toute
// mutation passe par ce fichier (AD-1), même convention que
// actions/homework.ts.

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error(`revalidatePath(${path}) failed:`, error);
  }
}

function revalidateAfterTimerChange() {
  // Une session en cours s'affiche sur l'Accueil (carte "Devoir en cours") ;
  // le total réel cumulé s'affiche sur Accueil ET "Mes tâches".
  safeRevalidate("/");
  safeRevalidate("/mes-taches");
}

export interface StartHomeworkTimerInput {
  devoirId: string;
  mode: string;
  // Requis uniquement pour MINUTEUR -- borné par MAX_ESTIMATED_MINUTES (8h),
  // même garde-fou générique que la durée estimée d'un devoir
  // (domain/homework.ts), pas une règle produit précise.
  plannedMinutes?: number;
}

interface ParsedStartInput {
  devoirId: string;
  mode: TimerMode;
  plannedSeconds: number | null;
}

function parseStartInput(
  input: StartHomeworkTimerInput
): { ok: true; value: ParsedStartInput } | { ok: false; error: string } {
  if (input.devoirId.trim().length === 0) {
    return { ok: false, error: "Devoir invalide." };
  }
  if (!isTimerMode(input.mode)) {
    return { ok: false, error: "Mode de minuteur invalide." };
  }
  if (input.mode === TIMER_MODE_MINUTEUR) {
    const minutes = input.plannedMinutes;
    if (
      minutes === undefined ||
      !Number.isInteger(minutes) ||
      minutes <= 0 ||
      minutes > MAX_ESTIMATED_MINUTES
    ) {
      return { ok: false, error: "Durée de minuteur invalide." };
    }
    return {
      ok: true,
      value: { devoirId: input.devoirId.trim(), mode: input.mode, plannedSeconds: minutes * 60 },
    };
  }

  return {
    ok: true,
    value: { devoirId: input.devoirId.trim(), mode: input.mode, plannedSeconds: null },
  };
}

/**
 * Démarre une session (chronomètre ou minuteur) sur un devoir -- déclenché
 * par le choix "Chronométrer"/"Minuteur" ouvert depuis le bouton "Commencer"
 * (StartTimerDialog). Fait aussi passer le devoir en "En cours"
 * (data/homework.ts::startDevoir, idempotent) -- une seule action utilisateur
 * couvre les deux effets, jamais deux actions séparées à enchaîner.
 * Refuse de démarrer une 2e session si une est déjà active pour ce devoir
 * (jamais un empilement silencieux).
 */
export async function startHomeworkTimerAction(
  input: StartHomeworkTimerInput
): Promise<ActionResult<{ started: boolean }>> {
  const parsed = parseStartInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  try {
    const userId = await requireUserId();
    const sessions = await listHomeworkTimeSessions(userId);
    const alreadyActive = sessions.some(
      (session) => session.devoirId === parsed.value.devoirId && session.endedAt === null
    );
    if (alreadyActive) {
      return { ok: false, error: "Une session est déjà en cours pour ce devoir." };
    }

    await startDevoir(parsed.value.devoirId, userId);
    await startHomeworkTimeSession(
      userId,
      parsed.value.devoirId,
      parsed.value.mode,
      parsed.value.plannedSeconds
    );
    revalidateAfterTimerChange();
    return { ok: true, data: { started: true } };
  } catch (error) {
    console.error("startHomeworkTimerAction failed:", error);
    return { ok: false, error: "Impossible de démarrer le minuteur. Réessaie." };
  }
}

export interface StopHomeworkTimerInput {
  devoirId: string;
}

/**
 * Arrête la session active d'un devoir SANS le marquer fait (bouton
 * "Arrêter" de la carte de session active) -- contrairement à cocher
 * "fait" (toggleDevoirDoneAction, qui arrête aussi la session en cours mais
 * en plus), ce n'est qu'une pause : le devoir reste "En cours", une
 * nouvelle session démarre au prochain "Commencer" (pas de pause/reprise
 * dans cette version).
 */
export async function stopHomeworkTimerAction(
  input: StopHomeworkTimerInput
): Promise<ActionResult<{ stopped: boolean }>> {
  if (input.devoirId.trim().length === 0) {
    return { ok: false, error: "Devoir invalide." };
  }

  try {
    const userId = await requireUserId();
    const result = await endActiveHomeworkTimeSession(userId, input.devoirId);
    revalidateAfterTimerChange();
    return { ok: true, data: result };
  } catch (error) {
    console.error("stopHomeworkTimerAction failed:", error);
    return { ok: false, error: "Impossible d'arrêter le minuteur. Réessaie." };
  }
}
