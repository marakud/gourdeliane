// CartableFlow -- domain/notifications.ts (Story 3.1)
//
// Contenu et logique pure des rappels quotidiens (FR-10). Aucune dépendance
// vers Next.js, Prisma, ou `web-push` (AD-1) -- l'envoi réel vit dans
// lib/push.ts, cette couche décide seulement QUOI envoyer et SI on doit
// envoyer aujourd'hui.

import type { Weekday } from "./schedule";

export type NotificationMoment = "SOIR" | "MATIN" | "RETOUR";

/** Titre + corps du message pour chaque moment -- ton non-culpabilisant
 * (DESIGN.md) : jamais une formulation qui pointe un oubli ou une urgence. */
export const NOTIFICATION_CONTENT: Record<
  NotificationMoment,
  { title: string; body: string }
> = {
  SOIR: {
    title: "Ce soir",
    body: "C'est l'heure de préparer ta soirée !",
  },
  MATIN: {
    title: "Ce matin",
    body: "Bonjour ! Prépare-toi pour l'école.",
  },
  RETOUR: {
    title: "Retour",
    body: "Te voilà rentré ? Ta liste de retour t'attend.",
  },
};

/**
 * Un rappel ne doit jamais se déclencher un jour sans école -- envoyer
 * "prépare-toi pour l'école" un samedi ou un jour férié serait un vrai défaut
 * d'UX (lecture de "une fois par jour scolaire", I/O matrix spec 3.1), même
 * si aucune AC ne le formule explicitement. Un samedi/dimanche est toujours
 * "sans cours" par construction (jamais un `NoSchoolDay` -- ce marqueur ne
 * couvre que les jours fériés/vacances exceptionnels, cf. domain/schedule.ts).
 */
export function shouldSkipReminderToday(
  weekday: Weekday,
  dateIso: string,
  noSchoolDayIsoSet: ReadonlySet<string>
): boolean {
  return weekday === "SATURDAY" || weekday === "SUNDAY" || noSchoolDayIsoSet.has(dateIso);
}
