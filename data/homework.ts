import { prisma } from "./prisma";
import {
  DEVOIR_STATUS_DONE,
  DEVOIR_STATUS_IN_PROGRESS,
  DEVOIR_STATUS_TODO,
} from "@/domain/homework";

// Story 2.4 (+ amendements retour utilisateur) -- accès aux données des
// devoirs : création, bascule "fait" (bidirectionnelle), suppression,
// listing. Toute logique de dérivation vit dans domain/homework.ts, jamais
// ici.

/**
 * Crée un devoir. `aRendre`/`echeance`/`echeanceTime` restent optionnels
 * (Boundaries spec 2.4 : seules matière + description sont obligatoires,
 * validées en amont par actions/homework.ts) -- `done` démarre toujours à
 * `false` (défaut du schéma), aucun devoir ne peut être créé déjà fait.
 */
export async function createDevoir(
  userId: string,
  subjectId: string,
  description: string,
  aRendre: boolean = false,
  echeance: Date | null = null,
  echeanceTime: string | null = null,
  estimatedMinutes: number | null = null
) {
  return prisma.devoir.create({
    data: {
      userId,
      subjectId,
      description,
      aRendre,
      echeance,
      echeanceTime,
      estimatedMinutes,
    },
    include: { subject: true },
  });
}

/**
 * Modifie un devoir existant (retour utilisateur -- pouvoir corriger une
 * erreur de saisie sans passer par supprimer/recréer). Mêmes champs que
 * `createDevoir`, scopé par `{ id, userId }` -- même garde que
 * `toggleDevoirDone`/`deleteDevoir`. `done` n'est jamais touché ici (reste
 * réservé à `toggleDevoirDone`, AD-7).
 */
export async function updateDevoir(
  id: string,
  userId: string,
  subjectId: string,
  description: string,
  aRendre: boolean,
  echeance: Date | null,
  echeanceTime: string | null,
  estimatedMinutes: number | null
) {
  return prisma.devoir.update({
    where: { id, userId },
    data: {
      subjectId,
      description,
      aRendre,
      echeance,
      echeanceTime,
      estimatedMinutes,
    },
    include: { subject: true },
  });
}

/**
 * Bascule `done` d'un devoir (bidirectionnel -- retour utilisateur Story
 * 2.4 : un devoir fait reste affiché coché, jamais retiré de la liste ; le
 * child doit pouvoir le redécocher par erreur). Scopé par `{ id, userId }` --
 * même garde que `updateSubjectItem`/`updateFixedChecklistItem`
 * (data/checklist.ts:237-246, 200-209) -- pour ne jamais laisser un appel
 * mettre à jour le devoir d'un autre utilisateur.
 */
export async function toggleDevoirDone(
  id: string,
  userId: string,
  done: boolean
) {
  // `status` reste synchronisé avec `done` (AD-7 étendu) : fait -> DONE,
  // redécoché -> TODO (jamais IN_PROGRESS -- décocher ne présume pas qu'un
  // travail est réellement repris, cf. domain/homework.ts).
  return prisma.devoir.update({
    where: { id, userId },
    data: {
      done,
      status: done ? DEVOIR_STATUS_DONE : DEVOIR_STATUS_TODO,
    },
  });
}

/**
 * Passe un devoir de TODO à IN_PROGRESS (bouton "Commencer", évolution
 * CartableFlow) -- ne touche jamais `done`. `updateMany` scopé sur
 * `status: TODO` plutôt qu'un read-then-write : idempotent (un devoir déjà
 * IN_PROGRESS/DONE ne bascule pas une seconde fois), jamais de confiance
 * aveugle dans ce que le client affichait au moment du tap.
 */
export async function startDevoir(
  id: string,
  userId: string
): Promise<{ started: boolean }> {
  const result = await prisma.devoir.updateMany({
    where: { id, userId, status: DEVOIR_STATUS_TODO },
    data: { status: DEVOIR_STATUS_IN_PROGRESS },
  });
  return { started: result.count > 0 };
}

/**
 * Supprime définitivement un devoir (retour utilisateur Story 2.4 : bouton
 * "supprimer" avec icône). Scopé par `{ id, userId }`, même garde que les
 * autres mutations de ce fichier.
 */
export async function deleteDevoir(id: string, userId: string) {
  return prisma.devoir.delete({
    where: { id, userId },
  });
}

/**
 * Liste tous les devoirs d'un utilisateur (faits et à faire -- les deux
 * restent affichés dans "Devoirs", Boundaries spec 2.4 amendée), avec leur
 * matière (pastille de couleur, SubjectTag). `orderBy: createdAt asc` fixe
 * l'ordre "reçu", préservé tel quel par l'appelant (pas de tri par urgence,
 * Boundaries spec 2.4).
 */
export async function listDevoirs(userId: string) {
  return prisma.devoir.findMany({
    where: { userId },
    include: { subject: true },
    orderBy: { createdAt: "asc" },
  });
}
