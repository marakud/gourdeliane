import { prisma } from "./prisma";

// Story 3.1 -- accès aux données d'abonnement Web Push. Toute logique de
// contenu/décision d'envoi vit dans domain/notifications.ts et lib/push.ts,
// jamais ici (AD-1).

export interface SaveSubscriptionData {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Enregistre un abonnement Web Push. Upsert sur `endpoint` (unique côté
 * navigateur) -- s'abonner à nouveau depuis le même appareil met simplement
 * à jour les clés plutôt que de créer un doublon.
 */
export async function saveSubscription(data: SaveSubscriptionData) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: data,
    update: { p256dh: data.p256dh, auth: data.auth, userId: data.userId },
  });
}

/** Liste tous les abonnements d'un utilisateur (un même utilisateur peut
 * avoir plusieurs appareils abonnés). */
export async function listSubscriptionsForUser(userId: string) {
  return prisma.pushSubscription.findMany({ where: { userId } });
}

/** Supprime un abonnement devenu invalide (le push service a répondu 404/410
 * -- Boundaries spec 3.1 : jamais de tentative de renvoi indéfinie). */
export async function deleteSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}
