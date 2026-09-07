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
