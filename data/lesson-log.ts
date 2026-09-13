import { prisma } from "./prisma";

// "Cahier de texte" (évolution CartableFlow, retour utilisateur) -- accès aux
// données des entrées : création, modification, suppression, listing. Toute
// logique de dérivation (filtrage par période, groupement par date) vit dans
// domain/lesson-log.ts, jamais ici.

/**
 * Crée une entrée de cahier de texte. Matière, date et contenu sont tous les
 * trois obligatoires (contrairement à Devoir -- une entrée sans date ni
 * contenu n'aurait aucun sens à exister), validés en amont par
 * actions/lesson-log.ts.
 */
export async function createLessonLog(
  userId: string,
  subjectId: string,
  date: Date,
  content: string
) {
  return prisma.lessonLog.create({
    data: { userId, subjectId, date, content },
    include: { subject: true },
  });
}

/**
 * Modifie une entrée existante (retour utilisateur -- corriger une erreur de
 * saisie ou compléter plus tard). Scopé par `{ id, userId }`, même garde que
 * les autres mutations de ce fichier.
 */
export async function updateLessonLog(
  id: string,
  userId: string,
  subjectId: string,
  date: Date,
  content: string
) {
  return prisma.lessonLog.update({
    where: { id, userId },
    data: { subjectId, date, content },
    include: { subject: true },
  });
}

/**
 * Supprime définitivement une entrée. Scopé par `{ id, userId }`, même garde
 * que `deleteDevoir`/`deleteFixedChecklistItem`.
 */
export async function deleteLessonLog(id: string, userId: string) {
  return prisma.lessonLog.delete({
    where: { id, userId },
  });
}

/**
 * Liste toutes les entrées d'un utilisateur, avec leur matière (pastille de
 * couleur, SubjectTag). Triées par date décroissante (la plus récente en
 * premier -- relecture, contrairement à `listDevoirs` qui trie par
 * `createdAt asc`, ordre de saisie) puis par `createdAt` croissant à
 * égalité de date (plusieurs entrées le même jour restent dans leur ordre
 * de saisie).
 */
export async function listLessonLogs(userId: string) {
  return prisma.lessonLog.findMany({
    where: { userId },
    include: { subject: true },
    orderBy: [{ date: "desc" }, { createdAt: "asc" }],
  });
}
