"use server";

import { revalidatePath } from "next/cache";
import {
  CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
  CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
  CHECKLIST_SOURCE_TYPE_SUBJECT,
  CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
  CHECKLIST_TYPE_MATIN,
  CHECKLIST_TYPE_RETOUR,
  CHECKLIST_TYPE_REVISIONS,
  CHECKLIST_TYPE_SAC,
} from "@/domain/checklist";
import { ensureSeedUser } from "@/data/user";
import {
  createFixedChecklistItem as createFixedChecklistItemData,
  createSubjectItem as createSubjectItemData,
  deleteFixedChecklistItem as deleteFixedChecklistItemData,
  deleteSubjectItem as deleteSubjectItemData,
  updateFixedChecklistItem as updateFixedChecklistItemData,
  updateSubjectItem as updateSubjectItemData,
  upsertChecklistItemState,
} from "@/data/checklist";
import { recomputeAndPersistSoirCompletion } from "@/data/day-completion";

// Toute mutation du sac/des objets par matière passe par ce fichier (AD-1).
// Chaque action retourne { ok: true, data } | { ok: false, error } -- jamais
// d'exception non gérée remontée à l'UI (ARCHITECTURE-SPINE.md).

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// `revalidatePath` exige un contexte de requête Next.js valide -- appelé en
// dehors (ex. script, test direct de l'action) il lève "Invariant: static
// generation store missing" (confirmé pendant la revue de la story 2.2).
// Comme ces fonctions sont toujours appelées après une mutation déjà
// réussie, une erreur ici ne doit jamais transformer un succès réel en
// { ok: false } côté appelant -- on l'avale (avec un log) plutôt que de la
// laisser remonter dans le même bloc try/catch que la mutation.
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error(`revalidatePath(${path}) failed:`, error);
  }
}

function revalidateAccueil() {
  // app/(accueil)/page.tsx vit dans un groupe de routes -- son URL réelle
  // est "/", pas "/(accueil)".
  safeRevalidate("/");
}

function revalidateReglages() {
  safeRevalidate("/reglages");
}

// Story 2.7 -- même raisonnement que `safeRevalidate` ci-dessus : le
// recalcul/persistance de la complétude "Ce soir" (AD-5) est un
// enregistrement de bord (le futur Streak, Epic 4, pas encore construit) qui
// ne doit jamais transformer une coche déjà réussie en `{ ok: false }` côté
// UI -- sans quoi un bug dans ce recalcul ferait annuler visuellement (par
// l'optimistic update) une case pourtant bien enregistrée en base.
async function safeRecomputeSoirCompletion(userId: string) {
  try {
    await recomputeAndPersistSoirCompletion(userId, new Date());
  } catch (error) {
    console.error("recomputeAndPersistSoirCompletion failed:", error);
  }
}

/**
 * Parse une date "yyyy-MM-dd" (celle pour laquelle la checklist est
 * préparée, ex. demain) en `Date`. Retourne `null` si le format est invalide
 * plutôt que de laisser `new Date(...)` produire un `Invalid Date` silencieux.
 */
function parseChecklistDate(dateIso: string): Date | null {
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateIso);
  if (!isValidFormat) {
    return null;
  }
  const parsed = new Date(`${dateIso}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface ToggleChecklistItemInput {
  date: string; // ISO "yyyy-MM-dd", jour pour lequel la checklist est préparée
  sourceId: string;
  checked: boolean;
  // Généralisés (Story 2.2) pour que cette même action serve aussi bien le
  // sac (Story 2.1) que Matin (cette story) et Retour (Story 2.3) --
  // défauts sur les valeurs de Story 2.1 pour ne rien casser côté
  // SacChecklist, qui ne les transmet pas explicitement.
  checklistType?: string;
  sourceType?: string;
}

// Contrairement à `checklistType`/`sourceType` sur `ChecklistItemState`
// (String en base par choix, cf. domain/checklist.ts), une Server Action est
// un point d'entrée réseau : un appel direct (hors UI) pourrait passer
// n'importe quelle chaîne. Cette liste blanche évite d'écrire des lignes
// avec un type inconnu qu'aucune vue ne saura jamais lire.
const KNOWN_CHECKLIST_TYPES = new Set<string>([
  CHECKLIST_TYPE_SAC,
  CHECKLIST_TYPE_MATIN,
  CHECKLIST_TYPE_RETOUR,
  CHECKLIST_TYPE_REVISIONS,
]);
const KNOWN_SOURCE_TYPES = new Set<string>([
  CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
  CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
  CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
  CHECKLIST_SOURCE_TYPE_SUBJECT,
]);

export async function toggleChecklistItem(
  input: ToggleChecklistItemInput
): Promise<ActionResult<null>> {
  const date = parseChecklistDate(input.date);
  if (!date) {
    return { ok: false, error: "Date invalide." };
  }
  if (input.sourceId.trim().length === 0) {
    return { ok: false, error: "Objet invalide." };
  }
  if (input.checklistType && !KNOWN_CHECKLIST_TYPES.has(input.checklistType)) {
    return { ok: false, error: "Type de checklist invalide." };
  }
  if (input.sourceType && !KNOWN_SOURCE_TYPES.has(input.sourceType)) {
    return { ok: false, error: "Type d'objet invalide." };
  }

  const resolvedChecklistType = input.checklistType ?? CHECKLIST_TYPE_SAC;

  try {
    const user = await ensureSeedUser();
    await upsertChecklistItemState({
      userId: user.id,
      date,
      checklistType: resolvedChecklistType,
      sourceType: input.sourceType ?? CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
      sourceId: input.sourceId,
      checked: input.checked,
    });
    revalidateAccueil();
    // Story 2.7 (AD-5) -- Sac et Révisions font partie du moment "Ce soir" ;
    // Matin/Retour n'y participent pas (Never de la spec 2.7), pas de
    // recalcul pour ces deux-là. Appelé APRÈS le retour `{ ok: true }`
    // décidé (via safeRecomputeSoirCompletion, qui avale ses propres
    // erreurs) : la coche elle-même a déjà réussi à ce stade, ce recalcul ne
    // doit jamais la remettre en cause.
    if (
      resolvedChecklistType === CHECKLIST_TYPE_SAC ||
      resolvedChecklistType === CHECKLIST_TYPE_REVISIONS
    ) {
      await safeRecomputeSoirCompletion(user.id);
    }
    return { ok: true, data: null };
  } catch (error) {
    console.error("toggleChecklistItem failed:", error);
    return {
      ok: false,
      error: "Impossible de mettre à jour la case. Réessaie.",
    };
  }
}

export interface SubjectItemFormInput {
  subjectId: string;
  label: string;
}

export async function createSubjectItem(
  input: SubjectItemFormInput
): Promise<ActionResult<{ id: string }>> {
  const label = input.label.trim();
  if (label.length === 0) {
    return { ok: false, error: "Le nom de l'objet est requis." };
  }
  if (input.subjectId.trim().length === 0) {
    return { ok: false, error: "Matière invalide." };
  }

  try {
    const user = await ensureSeedUser();
    const item = await createSubjectItemData(user.id, input.subjectId, label);
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: { id: item.id } };
  } catch (error) {
    console.error("createSubjectItem failed:", error);
    return { ok: false, error: "Impossible d'ajouter l'objet. Réessaie." };
  }
}

export async function updateSubjectItem(
  id: string,
  label: string
): Promise<ActionResult<{ id: string }>> {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Le nom de l'objet est requis." };
  }

  try {
    const user = await ensureSeedUser();
    const item = await updateSubjectItemData(id, user.id, trimmed);
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: { id: item.id } };
  } catch (error) {
    console.error("updateSubjectItem failed:", error);
    return { ok: false, error: "Impossible de modifier l'objet. Réessaie." };
  }
}

export async function deleteSubjectItem(
  id: string
): Promise<ActionResult<null>> {
  try {
    const user = await ensureSeedUser();
    await deleteSubjectItemData(id, user.id);
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteSubjectItem failed:", error);
    return { ok: false, error: "Impossible de supprimer l'objet. Réessaie." };
  }
}

// Story 2.2 -- gestion des items de "Ce matin" depuis Réglages. Le
// `checklistType` reste "MATIN" en dur ici (pas transmis par l'appelant) :
// ce fichier est l'unique point d'entrée mutation, et Retour (Story 2.3,
// plus bas) a ses propres actions dédiées plutôt que de paramétrer
// celles-ci -- même choix que la génération séparée SubjectItem vs
// FixedChecklistItem. `updateFixedChecklistItem`/`deleteFixedChecklistItem`
// restent en revanche partagées : scopées par `id` (pas par `checklistType`),
// elles sont déjà génériques et servent Matin comme Retour telles quelles.

export interface FixedChecklistItemFormInput {
  label: string;
}

export async function createFixedChecklistItem(
  input: FixedChecklistItemFormInput
): Promise<ActionResult<{ id: string }>> {
  const label = input.label.trim();
  if (label.length === 0) {
    return { ok: false, error: "Le nom de l'item est requis." };
  }

  try {
    const user = await ensureSeedUser();
    const item = await createFixedChecklistItemData(
      user.id,
      CHECKLIST_TYPE_MATIN,
      label
    );
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: { id: item.id } };
  } catch (error) {
    console.error("createFixedChecklistItem failed:", error);
    return { ok: false, error: "Impossible d'ajouter l'item. Réessaie." };
  }
}

export async function updateFixedChecklistItem(
  id: string,
  label: string
): Promise<ActionResult<{ id: string }>> {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Le nom de l'item est requis." };
  }

  try {
    const user = await ensureSeedUser();
    const item = await updateFixedChecklistItemData(id, user.id, trimmed);
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: { id: item.id } };
  } catch (error) {
    console.error("updateFixedChecklistItem failed:", error);
    return { ok: false, error: "Impossible de modifier l'item. Réessaie." };
  }
}

export async function deleteFixedChecklistItem(
  id: string
): Promise<ActionResult<null>> {
  try {
    const user = await ensureSeedUser();
    await deleteFixedChecklistItemData(id, user.id);
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteFixedChecklistItem failed:", error);
    return { ok: false, error: "Impossible de supprimer l'item. Réessaie." };
  }
}

/** Coche/décoche un item de "Ce matin" -- wrapper de `toggleChecklistItem`
 * avec `checklistType`/`sourceType` fixés à MATIN/FIXED_ITEM, pour que
 * `components/checklist/fixed-checklist.tsx` n'ait pas à connaître ces
 * constantes de domaine (même niveau d'abstraction que `SacChecklist`, qui
 * appelle `toggleChecklistItem` directement car SAC/SUBJECT_ITEM en sont les
 * valeurs par défaut). */
export async function toggleMatinChecklistItem(
  input: Omit<ToggleChecklistItemInput, "checklistType" | "sourceType">
): Promise<ActionResult<null>> {
  return toggleChecklistItem({
    ...input,
    checklistType: CHECKLIST_TYPE_MATIN,
    sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
  });
}

// Story 2.3 -- "Retour", même mécanisme exact que Matin ci-dessus : deuxième
// consommateur de `FixedChecklistItem`/`ChecklistItemState`, avec
// `checklistType="RETOUR"`. `components/checklist/fixed-checklist.tsx` et
// `fixed-items-manager.tsx` reçoivent désormais ces actions en props plutôt
// que d'appeler leur équivalent Matin en dur (généralisation spec 2.3) --
// c'est ce qui permet à ce même couple de composants de servir les deux
// checklists sans être dupliqué.

/** Crée un item de "Retour" depuis Réglages -- même schéma que
 * `createFixedChecklistItem` (Matin), `checklistType` fixé à RETOUR ici. */
export async function createRetourChecklistItem(
  input: FixedChecklistItemFormInput
): Promise<ActionResult<{ id: string }>> {
  const label = input.label.trim();
  if (label.length === 0) {
    return { ok: false, error: "Le nom de l'item est requis." };
  }

  try {
    const user = await ensureSeedUser();
    const item = await createFixedChecklistItemData(
      user.id,
      CHECKLIST_TYPE_RETOUR,
      label
    );
    revalidateReglages();
    revalidateAccueil();
    return { ok: true, data: { id: item.id } };
  } catch (error) {
    console.error("createRetourChecklistItem failed:", error);
    return { ok: false, error: "Impossible d'ajouter l'item. Réessaie." };
  }
}

/** Coche/décoche un item de "Retour" -- wrapper de `toggleChecklistItem`
 * avec `checklistType`/`sourceType` fixés à RETOUR/FIXED_ITEM, même rôle que
 * `toggleMatinChecklistItem` pour Matin. */
export async function toggleRetourChecklistItem(
  input: Omit<ToggleChecklistItemInput, "checklistType" | "sourceType">
): Promise<ActionResult<null>> {
  return toggleChecklistItem({
    ...input,
    checklistType: CHECKLIST_TYPE_RETOUR,
    sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
  });
}

/** Coche/décoche un rappel de "Révisions du jour" (Story 2.6) -- wrapper de
 * `toggleChecklistItem` avec `checklistType`/`sourceType` fixés à
 * REVISIONS/SUBJECT (`sourceId` = `Subject.id` directement, pas d'entité
 * dédiée), même rôle que `toggleMatinChecklistItem`/`toggleRetourChecklistItem`. */
export async function toggleRevisionsChecklistItem(
  input: Omit<ToggleChecklistItemInput, "checklistType" | "sourceType">
): Promise<ActionResult<null>> {
  return toggleChecklistItem({
    ...input,
    checklistType: CHECKLIST_TYPE_REVISIONS,
    sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT,
  });
}
