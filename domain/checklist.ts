// CartableFlow -- domain/checklist.ts (Story 2.1)
//
// Dérivation pure de la checklist "Sac pour demain" (AD-2 : jamais stockée
// comme liste générée à l'avance, toujours recalculée à la lecture à partir
// de l'EDT de demain + des SubjectItem + de l'état coché existant). Aucune
// dépendance vers Next.js ou Prisma (AD-1 / domain/README.md).

// Écrits en toutes lettres (Design Notes spec 2.1) : `ChecklistItemState`
// est un modèle partagé entre plusieurs checklists (Sac ici, Matin/Retour/
// Révisions dans les stories suivantes de l'epic 2) plutôt qu'une table par
// checklist -- ces constantes évitent de réécrire les chaînes littérales
// dans data/ et actions/.
export const CHECKLIST_TYPE_SAC = "SAC" as const;
export const CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM = "SUBJECT_ITEM" as const;

/** Un objet par défaut d'une matière (`SubjectItem`), tel que chargé par data/checklist.ts. */
export interface ChecklistSubjectItemInput {
  id: string;
  label: string;
}

/** Une matière présente dans l'EDT de demain, avec ses objets par défaut. */
export interface ChecklistSubjectGroupInput {
  subject: { id: string; name: string; colorIndex: number };
  items: readonly ChecklistSubjectItemInput[];
}

/** Un `ChecklistItemState` existant, tel que chargé par data/checklist.ts. */
export interface ChecklistItemStateInput {
  sourceType: string;
  sourceId: string;
  checked: boolean;
}

export interface DerivedChecklistItem {
  sourceId: string;
  label: string;
  checked: boolean;
}

export interface DerivedChecklistGroup {
  subject: { id: string; name: string; colorIndex: number };
  items: DerivedChecklistItem[];
}

/**
 * Dérive la checklist "Sac pour demain" : groupe les objets par matière
 * (ordre reçu -- déjà celui de l'EDT/de création, à l'appelant de trier) et
 * croise chaque objet avec son état coché existant, keyé par `sourceId`
 * (l'`id` du `SubjectItem`), jamais par son libellé (AD-3, FR-5).
 *
 * Comportements couverts (I/O matrix spec 2.1) :
 * - une matière sans `SubjectItem` apparaît dans le résultat avec `items: []`
 *   (pas d'erreur, pas de matière masquée) ;
 * - un objet sans état coché existant est décoché par défaut ;
 * - un objet dont l'`id` a un état coché existant reflète cet état, même si
 *   son libellé a changé depuis (l'état ne référence jamais le libellé) ;
 * - un état coché dont le `sourceId` ne correspond à aucun objet reçu ici
 *   (objet supprimé, ou matière qui n'a plus cours demain) est simplement
 *   ignoré -- pas de purge active requise (AD-3).
 *
 * Pure : ne décide pas de "demain est sans cours" -- si `subjectGroups` est
 * vide, l'appelant (app/(accueil)/page.tsx) affiche le message neutre plutôt
 * que d'invoquer cette fonction sur une liste vide.
 */
export function deriveSacChecklist(
  subjectGroups: readonly ChecklistSubjectGroupInput[],
  checkedStates: readonly ChecklistItemStateInput[]
): DerivedChecklistGroup[] {
  const checkedBySourceId = new Map<string, boolean>();
  for (const state of checkedStates) {
    if (state.sourceType === CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM) {
      checkedBySourceId.set(state.sourceId, state.checked);
    }
  }

  return subjectGroups.map((group) => ({
    subject: group.subject,
    items: group.items.map((item) => ({
      sourceId: item.id,
      label: item.label,
      checked: checkedBySourceId.get(item.id) ?? false,
    })),
  }));
}
