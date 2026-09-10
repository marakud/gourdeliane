"use server";

import { ensureSeedUser } from "@/data/user";
import { saveSubscription } from "@/data/push-subscription";

// Story 3.1 -- seule mutation liée aux abonnements Web Push (AD-1). Chaque
// action retourne { ok: true, data } | { ok: false, error } -- même
// convention que actions/checklist.ts et actions/homework.ts.

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Persiste l'abonnement Web Push renvoyé par `pushManager.subscribe()` côté
 * client (components/settings/notifications-section.tsx). Appelée
 * immédiatement après un abonnement navigateur réussi -- ne décide jamais
 * elle-même d'envoyer une notification (réservé aux routes cron).
 */
export async function subscribeToPush(
  input: PushSubscriptionInput
): Promise<ActionResult<null>> {
  // Une Server Action reste un endpoint HTTP appelable directement (pas
  // seulement depuis notre propre client TypeScript) : `input.keys` doit
  // être vérifié avant d'y accéder, pas seulement ses champs internes.
  if (
    typeof input.endpoint !== "string" ||
    input.endpoint.trim().length === 0 ||
    typeof input.keys !== "object" ||
    input.keys === null ||
    typeof input.keys.p256dh !== "string" ||
    input.keys.p256dh.trim().length === 0 ||
    typeof input.keys.auth !== "string" ||
    input.keys.auth.trim().length === 0
  ) {
    return { ok: false, error: "Abonnement invalide." };
  }

  try {
    const user = await ensureSeedUser();
    await saveSubscription({
      userId: user.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    });
    return { ok: true, data: null };
  } catch (error) {
    console.error("subscribeToPush failed:", error);
    return {
      ok: false,
      error: "Impossible d'activer les rappels. Réessaie.",
    };
  }
}
