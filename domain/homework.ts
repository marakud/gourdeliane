// CartableFlow -- domain/homework.ts (Story 2.4)
//
// Dérivation pure du bloc "Devoirs à faire" (Boundaries spec 2.4 : `done` ne
// change que par tap explicite, AD-7 -- contrairement à `ChecklistItemState`
// (AD-3), aucune tâche planifiée ne réinitialise ni ne purge un `Devoir`).
// Aucune dépendance vers Next.js ou Prisma (AD-1 / domain/README.md).

/** Un `Devoir` (ou toute projection qui en garde `done`), tel que chargé par
 * data/homework.ts. Générique plutôt que lié au type Prisma complet : cette
 * fonction n'a besoin de connaître que `done` pour filtrer, l'appelant
 * (app/(accueil)/page.tsx) reçoit en retour exactement la forme qu'il a
 * transmise (matière, description, etc. inclus). */
export interface DevoirLike {
  done: boolean;
}

/**
 * Dérive "Devoirs à faire" : ne garde que les devoirs non faits
 * (`done === false`), en préservant l'ordre reçu (pas de tri par urgence ni
 * par ancienneté -- Boundaries spec 2.4 : "Jamais de couleur d'alerte...
 * aucune logique de retard dans cette story"). Pure : ne décide pas de
 * l'ordre de tri (c'est `data/homework.ts::listDevoirs`, orderBy createdAt
 * asc, qui fixe l'ordre reçu ici) ni du message positif à afficher quand le
 * résultat est vide -- c'est à l'appelant de le faire.
 *
 * Comportements couverts (I/O matrix spec 2.4) :
 * - un devoir fait (`done === true`) est exclu du résultat, jamais supprimé
 *   de la source -- l'appelant continue de recevoir la ligne complète
 *   ailleurs (ex. Réglages/historique futurs), seul ce filtre l'exclut ici ;
 * - un devoir vieux de plusieurs jours et toujours `done === false` reste
 *   dans le résultat, sans traitement particulier lié à son ancienneté ;
 * - aucun devoir en attente (liste vide, ou tous `done === true`) renvoie un
 *   tableau vide -- l'appelant affiche alors le message positif plutôt que de
 *   masquer le bloc (contrairement au Sac, cf. Boundaries).
 */
export function filterDevoirsAFaire<T extends DevoirLike>(
  devoirs: readonly T[]
): T[] {
  return devoirs.filter((devoir) => devoir.done === false);
}
