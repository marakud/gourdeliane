import { prisma } from "./prisma";

// Story 2.4 -- accès aux données des devoirs : création, bascule "fait",
// listing. Toute logique de dérivation (filtrer "à faire") vit dans
// domain/homework.ts, jamais ici.

/**
 * Crée un devoir. `aRendre`/`echeance` restent optionnels (Boundaries spec
 * 2.4 : seules matière + description sont obligatoires, validées en amont
 * par actions/homework.ts) -- `done` démarre toujours à `false` (défaut du
 * schéma), aucun devoir ne peut être créé déjà fait.
 */
export async function createDevoir(
  userId: string,
  subjectId: string,
  description: string,
  aRendre: boolean = false,
  echeance: Date | null = null
) {
  return prisma.devoir.create({
    data: { userId, subjectId, description, aRendre, echeance },
    include: { subject: true },
  });
}

/**
 * Marque un devoir fait. Scopé par `{ id, userId }` -- même garde que
 * `updateSubjectItem`/`updateFixedChecklistItem` (data/checklist.ts:237-246,
 * 200-209) -- pour ne jamais laisser un appel mettre à jour le devoir d'un
 * autre utilisateur. Écrit toujours `done: true` : le Never de la spec 2.4
 * ("seule la bascule done est mutable", jamais d'autre édition) n'expose
 * aucun geste de "redécocher" dans cette story -- pas de paramètre `done`
 * ici pour ne pas laisser un futur appel réintroduire silencieusement cette
 * capacité côté données.
 */
export async function markDevoirDone(id: string, userId: string) {
  return prisma.devoir.update({
    where: { id, userId },
    data: { done: true },
  });
}

/**
 * Liste tous les devoirs d'un utilisateur (faits et à faire -- le filtre
 * "à faire" est appliqué par domain/homework.ts::filterDevoirsAFaire, jamais
 * ici), avec leur matière pour l'affichage (pastille de couleur, SubjectTag).
 * `orderBy: createdAt asc` fixe l'ordre "reçu" que domain/homework.ts
 * préserve tel quel (pas de tri par urgence, Boundaries spec 2.4).
 */
export async function listDevoirs(userId: string) {
  return prisma.devoir.findMany({
    where: { userId },
    include: { subject: true },
    orderBy: { createdAt: "asc" },
  });
}
