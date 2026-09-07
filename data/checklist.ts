import { prisma } from "./prisma";
import { toUtcMidnight } from "./schedule";

// Story 2.1 -- accès aux données du sac du soir : matières + leurs
// `SubjectItem`, `ChecklistItemState` cochés, et le CRUD des objets par
// matière géré depuis Réglages. Toute logique de dérivation (croisement
// EDT/objets/état coché) vit dans domain/checklist.ts, jamais ici.

/**
 * Liste toutes les matières d'un utilisateur avec leurs `SubjectItem`
 * (Réglages -- gestion des objets par matière, FR-4). Une matière sans objet
 * défini apparaît quand même, avec `items: []`.
 */
export async function listSubjectsWithItems(userId: string) {
  return prisma.subject.findMany({
    where: { userId },
    include: { items: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Liste les `SubjectItem` des matières données (Accueil -- bloc "Sac pour
 * demain"), avec leur matière pour l'affichage (pastille de couleur). Prend
 * un ensemble de `subjectId` plutôt que de re-dériver l'EDT ici : c'est
 * `app/(accueil)/page.tsx` qui sait déjà quelles matières ont cours demain
 * (via data/schedule.ts + domain/school-day.ts, Story 1.3).
 */
export async function listSubjectItemsForSubjects(
  userId: string,
  subjectIds: readonly string[]
) {
  if (subjectIds.length === 0) {
    return [];
  }

  return prisma.subjectItem.findMany({
    where: { userId, subjectId: { in: [...subjectIds] } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Liste les `ChecklistItemState` d'un utilisateur pour une date/type de
 * checklist donnés (ex. le sac du 8 septembre). `date` est normalisée à
 * minuit UTC, identique au traitement de `NoSchoolDay.date` (data/schedule.ts).
 */
export async function listChecklistItemStates(
  userId: string,
  date: Date,
  checklistType: string
) {
  return prisma.checklistItemState.findMany({
    where: { userId, date: toUtcMidnight(date), checklistType },
  });
}

export interface UpsertChecklistItemStateData {
  userId: string;
  date: Date;
  checklistType: string;
  sourceType: string;
  sourceId: string;
  checked: boolean;
}

/**
 * Coche/décoche un item de checklist. Upsert sur la clé stable
 * `(userId, date, checklistType, sourceType, sourceId)` (AD-3) -- jamais un
 * lookup par libellé.
 */
export async function upsertChecklistItemState(
  data: UpsertChecklistItemStateData
) {
  const date = toUtcMidnight(data.date);

  return prisma.checklistItemState.upsert({
    where: {
      userId_date_checklistType_sourceType_sourceId: {
        userId: data.userId,
        date,
        checklistType: data.checklistType,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
      },
    },
    create: {
      userId: data.userId,
      date,
      checklistType: data.checklistType,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      checked: data.checked,
    },
    update: { checked: data.checked },
  });
}

/**
 * Liste les `FixedChecklistItem` d'un utilisateur pour un `checklistType`
 * donné (Matin ici), avec pré-remplissage des valeurs par défaut à la toute
 * première consultation (spec 2.2, Boundaries).
 *
 * Détection "première consultation" : l'existence d'une ligne
 * `FixedChecklistDefaultsSeed` pour `(userId, checklistType)`, jamais un
 * simple "la liste est vide" -- un utilisateur qui a tout supprimé depuis
 * (I/O matrix spec 2.2, "Utilisateur a tout supprimé") a aussi une liste
 * vide, mais la ligne `FixedChecklistDefaultsSeed` créée lors du tout premier
 * remplissage persiste (jamais supprimée par `deleteFixedChecklistItem`) et
 * empêche donc toute recréation ultérieure -- exactement le "choix assumé"
 * documenté dans les Design Notes de la spec, implémenté ici sans flag sur
 * `FixedChecklistItem` lui-même (qui reste id/userId/checklistType/label/
 * createdAt, cf. Code Map) mais via une table dédiée à ce seul marqueur.
 *
 * `defaultLabels` est fourni par l'appelant (ex. `DEFAULT_MATIN_ITEMS` de
 * domain/checklist.ts) plutôt que codé en dur ici, pour que cette fonction
 * reste réutilisable telle quelle par Retour (Story 2.3) avec ses propres
 * défauts.
 */
export async function listFixedChecklistItems(
  userId: string,
  checklistType: string,
  defaultLabels: readonly string[]
) {
  const existing = await prisma.fixedChecklistItem.findMany({
    where: { userId, checklistType },
    orderBy: { createdAt: "asc" },
  });
  if (existing.length > 0) {
    return existing;
  }

  const alreadySeeded = await prisma.fixedChecklistDefaultsSeed.findUnique({
    where: { userId_checklistType: { userId, checklistType } },
  });
  if (alreadySeeded) {
    // Déjà pré-rempli une fois, l'utilisateur a depuis tout supprimé --
    // liste vide affichée, pas de recréation (Never de la spec 2.2).
    return [];
  }

  // Toute première consultation : crée le marqueur ET les défauts dans une
  // même transaction -- les deux écritures doivent être atomiques, sinon une
  // requête concurrente qui perd la course sur le marqueur (P2002) pourrait
  // relire la table `FixedChecklistItem` entre la création du marqueur et
  // celle des défauts par le gagnant, et recevoir `[]` au lieu de la liste
  // fraîchement créée (ex. Accueil et Réglages chargés en même temps au
  // tout premier lancement, ou double rendu React en dev).
  // `@@unique([userId, checklistType])` sur `FixedChecklistDefaultsSeed`
  // protège contre une double création : la transaction perdante échoue en
  // bloc (P2002), et se contente de relire ce que la gagnante a déjà écrit
  // -- comme la gagnante a validé marqueur + défauts ensemble, cette
  // relecture ne peut plus tomber sur un état intermédiaire.
  try {
    await prisma.$transaction([
      prisma.fixedChecklistDefaultsSeed.create({
        data: { userId, checklistType },
      }),
      prisma.fixedChecklistItem.createMany({
        data: defaultLabels.map((label) => ({ userId, checklistType, label })),
      }),
    ]);
  } catch (error) {
    const isUniqueConstraintError =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002";
    if (!isUniqueConstraintError) {
      throw error;
    }
    return prisma.fixedChecklistItem.findMany({
      where: { userId, checklistType },
      orderBy: { createdAt: "asc" },
    });
  }

  return prisma.fixedChecklistItem.findMany({
    where: { userId, checklistType },
    orderBy: { createdAt: "asc" },
  });
}

/** Crée un item de checklist fixe (Réglages -- gestion "Ce matin"). */
export async function createFixedChecklistItem(
  userId: string,
  checklistType: string,
  label: string
) {
  return prisma.fixedChecklistItem.create({
    data: { userId, checklistType, label },
  });
}

/**
 * Modifie le libellé d'un item fixe. Ne touche jamais son `id` -- garantit
 * qu'un `ChecklistItemState` déjà coché pour cet item survit à ce renommage
 * (AD-3), même logique que `updateSubjectItem`.
 */
export async function updateFixedChecklistItem(
  id: string,
  userId: string,
  label: string
) {
  return prisma.fixedChecklistItem.update({
    where: { id, userId },
    data: { label },
  });
}

/**
 * Supprime un item fixe. Les `ChecklistItemState` qui le référencent par
 * `sourceId` ne sont pas purgés activement (AD-3), même logique que
 * `deleteSubjectItem` -- et ne recrée jamais les défauts (le marqueur
 * `FixedChecklistDefaultsSeed` n'est jamais touché ici).
 */
export async function deleteFixedChecklistItem(id: string, userId: string) {
  return prisma.fixedChecklistItem.delete({ where: { id, userId } });
}

/** Crée un objet par défaut pour une matière (Réglages). */
export async function createSubjectItem(
  userId: string,
  subjectId: string,
  label: string
) {
  return prisma.subjectItem.create({
    data: { userId, subjectId, label },
  });
}

/**
 * Modifie le libellé d'un objet. Ne touche jamais son `id` -- c'est
 * précisément ce qui garantit qu'un `ChecklistItemState` déjà coché pour cet
 * objet survit à ce renommage (AD-3, FR-5).
 */
export async function updateSubjectItem(
  id: string,
  userId: string,
  label: string
) {
  return prisma.subjectItem.update({
    where: { id, userId },
    data: { label },
  });
}

/**
 * Supprime un objet. Les `ChecklistItemState` qui le référencent par
 * `sourceId` ne sont pas purgés activement (AD-3) : ils deviennent
 * simplement orphelins et ne sont plus jamais rendus, puisque
 * `deriveSacChecklist` ne les croise qu'avec les objets encore présents.
 */
export async function deleteSubjectItem(id: string, userId: string) {
  return prisma.subjectItem.delete({ where: { id, userId } });
}
