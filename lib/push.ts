import webpush from "web-push";
import {
  deleteSubscription,
  listSubscriptionsForUser,
} from "@/data/push-subscription";

// Story 3.1 -- envoi Web Push. Vit hors de domain/ (AD-1 : domain/ ne dépend
// jamais d'une librairie tierce comme `web-push`) mais hors de data/ aussi
// (ce n'est pas un accès Prisma direct) -- lib/ est le point d'entrée déjà
// établi pour ce genre d'utilitaire technique (cf. lib/utils.ts).

let vapidConfigured = false;

/** Configure `web-push` une seule fois par process (les clés ne changent
 * jamais en cours d'exécution) -- lève une erreur explicite plutôt que
 * d'envoyer silencieusement avec des clés manquantes. */
function ensureVapidConfigured() {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT sont requises pour l'envoi Web Push. Voir .env.example."
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
}

/**
 * Envoie une notification à tous les abonnements Web Push d'un utilisateur.
 * Un abonnement dont l'envoi échoue avec un statut 404/410 (endpoint plus
 * valide -- désinstallation, permission révoquée) est supprimé de la base ;
 * les autres abonnements ne sont jamais affectés par l'échec d'un seul
 * (Boundaries spec 3.1).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  ensureVapidConfigured();

  const subscriptions = await listSubscriptionsForUser(userId);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload)
        );
        sent += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? (error as { statusCode?: unknown }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          // Elle-même protégée : un échec ici ne doit jamais faire rejeter
          // le `Promise.all` et perdre le décompte des autres abonnements
          // déjà traités (Boundaries spec 3.1 -- un abonnement en échec
          // n'affecte jamais les autres).
          try {
            await deleteSubscription(subscription.endpoint);
            removed += 1;
          } catch (deleteError) {
            console.error(
              "sendPushToUser: échec de la suppression d'un abonnement périmé:",
              deleteError
            );
          }
        } else {
          console.error("sendPushToUser failed for one subscription:", error);
        }
      }
    })
  );

  return { sent, removed };
}
