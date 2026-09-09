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

// Story 2.5 -- un devoir "à rendre" échéant demain ajoute un objet cochable
// dans le groupe de sa matière au sein du Sac, en plus des SubjectItem
// (FR-18). Suivi indépendamment de `Devoir.done` (AD-7) : ce sourceType
// distinct garantit que cocher "préparé dans le sac" et cocher "fait" sont
// deux clés `ChecklistItemState` séparées, jamais la même.
export const CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE = "DEVOIR_A_RENDRE" as const;

// Story 2.2 -- checklist fixe "Ce matin" (Retour, Story 2.3, réutilisera le
// même modèle avec CHECKLIST_TYPE_RETOUR). Écrites en toutes lettres, même
// convention que ci-dessus.
export const CHECKLIST_TYPE_MATIN = "MATIN" as const;
export const CHECKLIST_SOURCE_TYPE_FIXED_ITEM = "FIXED_ITEM" as const;

/**
 * Liste par défaut pré-remplie à la toute première consultation de "Ce
 * matin" pour un utilisateur (Design Notes spec 2.2 : détectée par "aucun
 * `FixedChecklistItem` de type MATIN pour cet utilisateur", jamais recréée
 * ensuite -- y compris si l'utilisateur supprime tout).
 */
export const DEFAULT_MATIN_ITEMS = [
  "Clés",
  "Goûter",
  "Carnet",
  "Chargeur",
] as const;

// Story 2.3 -- checklist fixe "Retour", même mécanisme exact que Matin
// ci-dessus, avec `checklistType="RETOUR"` et ses propres défauts. Partage
// `CHECKLIST_SOURCE_TYPE_FIXED_ITEM` avec Matin : ce qui distingue les deux
// checklists est `checklistType` sur `ChecklistItemState`/`FixedChecklistItem`
// (déjà filtré par l'appelant, cf. data/checklist.ts), pas `sourceType`.
export const CHECKLIST_TYPE_RETOUR = "RETOUR" as const;

/**
 * Liste par défaut pré-remplie à la toute première consultation de "Retour"
 * pour un utilisateur (même mécanisme que `DEFAULT_MATIN_ITEMS` -- détectée
 * par "aucun `FixedChecklistItem` de type RETOUR pour cet utilisateur",
 * jamais recréée ensuite).
 */
export const DEFAULT_RETOUR_ITEMS = [
  "Sortir le carnet/mot",
  "Ranger le sac",
  "Devoirs faits",
] as const;

/**
 * Un objet du groupe d'une matière dans le Sac -- soit un `SubjectItem`
 * (défaut/réglages, `sourceType` omis = `SUBJECT_ITEM`), soit, depuis la
 * Story 2.5, un devoir "à rendre" injecté par l'appelant
 * (`sourceType = CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE`, `id` = `Devoir.id`).
 */
export interface ChecklistSubjectItemInput {
  id: string;
  label: string;
  sourceType?: string;
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

/** Un devoir tel que chargé par data/homework.ts, réduit aux champs
 * nécessaires à la Story 2.5 (routage vers le Sac). */
export interface DevoirARendreInput {
  id: string;
  subjectId: string;
  description: string;
  aRendre: boolean;
  echeanceIso: string | null;
}

export interface PartitionedDevoirsARendre {
  /** Objets à injecter dans le groupe Sac de chaque matière concernée
   * (app/(accueil)/page.tsx les fusionne avec les SubjectItem existants
   * avant d'appeler `deriveSacChecklist`). */
  itemsBySubjectId: Map<string, ChecklistSubjectItemInput[]>;
  /** Ids des devoirs effectivement injectés quelque part -- l'appelant les
   * exclut de la rubrique "Devoirs pour demain" (lecture seule) pour éviter
   * le doublon (Boundaries spec 2.5). */
  consumedIds: Set<string>;
}

// Évite un libellé "... à rendre à rendre" si la description contient déjà
// la mention (correctif de revue -- cas plausible, un enfant peut déjà
// écrire "Dossier à rendre"). Sous-chaîne plutôt qu'un regex à `\b` : "à"
// n'est pas un caractère de mot pour `\b` (non-Unicode), qui échoue donc à
// détecter la frontière juste avant un "à" accentué.
function buildDevoirARendreLabel(description: string): string {
  const trimmed = description.trim();
  const alreadyMentionsARendre = trimmed
    .toLocaleLowerCase("fr-FR")
    .includes("à rendre");
  return alreadyMentionsARendre ? trimmed : `${trimmed} à rendre`;
}

/**
 * Partitionne les devoirs "à rendre" échéant `tomorrowIso` (Story 2.5,
 * FR-18) : pure, un seul passage qui construit à la fois les objets à
 * injecter dans le Sac ET la liste des ids consommés -- contrairement à
 * deux boucles séparées couplées seulement par un commentaire, une seule
 * source de vérité empêche qu'un devoir soit dupliqué (Sac + rubrique
 * lecture seule) ou disparaisse silencieusement des deux (correctif de
 * revue).
 *
 * Un devoir "à rendre" échéant demain dont la matière n'a pas de groupe Sac
 * (pas dans `subjectIdsWithSacGroup`, ex. matière sans cours demain) n'est
 * jamais injecté -- il ne figure donc pas non plus dans `consumedIds`, et
 * l'appelant le garde dans la rubrique "Devoirs pour demain" plutôt que de
 * le perdre silencieusement (Boundaries spec 2.5).
 */
export function partitionDevoirsARendreForSac(
  devoirs: readonly DevoirARendreInput[],
  tomorrowIso: string,
  subjectIdsWithSacGroup: ReadonlySet<string>
): PartitionedDevoirsARendre {
  const itemsBySubjectId = new Map<string, ChecklistSubjectItemInput[]>();
  const consumedIds = new Set<string>();

  for (const devoir of devoirs) {
    if (!devoir.aRendre || devoir.echeanceIso !== tomorrowIso) continue;
    if (!subjectIdsWithSacGroup.has(devoir.subjectId)) continue;

    const list = itemsBySubjectId.get(devoir.subjectId) ?? [];
    list.push({
      id: devoir.id,
      label: buildDevoirARendreLabel(devoir.description),
      sourceType: CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE,
    });
    itemsBySubjectId.set(devoir.subjectId, list);
    consumedIds.add(devoir.id);
  }

  return { itemsBySubjectId, consumedIds };
}

export interface DerivedChecklistItem {
  sourceId: string;
  sourceType: string;
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
 * croise chaque objet avec son état coché existant, keyé par
 * `(sourceType, sourceId)` -- jamais par son libellé (AD-3, FR-5). Depuis la
 * Story 2.5, un groupe peut mélanger des `SubjectItem` (`sourceType` omis =
 * `SUBJECT_ITEM`) et des devoirs "à rendre" injectés par l'appelant
 * (`sourceType = CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE`) -- la clé composite
 * évite toute ambiguïté entre les deux, même si un `id` de devoir coïncidait
 * un jour avec un `id` de `SubjectItem` (aucun risque réel avec des `cuid()`,
 * mais la clé le garantit explicitement plutôt que par convention).
 *
 * Comportements couverts (I/O matrix spec 2.1, étendue spec 2.5) :
 * - une matière sans objet apparaît dans le résultat avec `items: []` (pas
 *   d'erreur, pas de matière masquée) ;
 * - un objet sans état coché existant est décoché par défaut ;
 * - un objet dont l'`id` a un état coché existant reflète cet état, même si
 *   son libellé a changé depuis (l'état ne référence jamais le libellé) ;
 * - un état coché dont `(sourceType, sourceId)` ne correspond à aucun objet
 *   reçu ici (objet supprimé, devoir dont l'échéance n'est plus demain, ou
 *   matière qui n'a plus cours demain) est simplement ignoré -- pas de purge
 *   active requise (AD-3) ;
 * - l'état coché d'un objet "à rendre" (sourceType dédié) ne se confond
 *   jamais avec un `SubjectItem` de même `id` -- structurellement impossible
 *   via la clé composite.
 *
 * Pure : ne décide pas de "demain est sans cours" -- si `subjectGroups` est
 * vide, l'appelant (app/(accueil)/page.tsx) affiche le message neutre plutôt
 * que d'invoquer cette fonction sur une liste vide.
 */
export function deriveSacChecklist(
  subjectGroups: readonly ChecklistSubjectGroupInput[],
  checkedStates: readonly ChecklistItemStateInput[]
): DerivedChecklistGroup[] {
  const checkedByKey = new Map<string, boolean>();
  for (const state of checkedStates) {
    checkedByKey.set(`${state.sourceType}:${state.sourceId}`, state.checked);
  }

  return subjectGroups.map((group) => ({
    subject: group.subject,
    items: group.items.map((item) => {
      const sourceType = item.sourceType ?? CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM;
      return {
        sourceId: item.id,
        sourceType,
        label: item.label,
        checked: checkedByKey.get(`${sourceType}:${item.id}`) ?? false,
      };
    }),
  }));
}

// Story 2.6 -- bloc "Révisions du jour" (FR-19) : un rappel "Revoir le cours
// de {matière}" par matière suivie AUJOURD'HUI (pas demain, contrairement au
// Sac). `sourceId` = `Subject.id` directement -- pas de nouvelle entité
// "item de révision" à créer/configurer depuis Réglages, contrairement à
// SubjectItem/FixedChecklistItem (Boundaries spec 2.6 : texte non
// personnalisable).
export const CHECKLIST_TYPE_REVISIONS = "REVISIONS" as const;
export const CHECKLIST_SOURCE_TYPE_SUBJECT = "SUBJECT" as const;

/** Une matière suivie aujourd'hui, telle que résolue par
 * domain/schedule.ts::dedupeSubjectsFromSlots. */
export interface RevisionSubjectInput {
  id: string;
  name: string;
  colorIndex: number;
}

/** Un item "Révisions du jour" dérivé -- étend `DerivedChecklistItem` avec la
 * matière complète (id/name/colorIndex), nécessaire à l'affichage de la
 * pastille de matière par ligne (contrairement à Matin/Retour, dont les items
 * sont génériques et sans matière). */
export interface DerivedRevisionItem extends DerivedChecklistItem {
  subject: { id: string; name: string; colorIndex: number };
}

// Élision "de" -> "d'" devant une voyelle ou un h muet (ex. "Anglais", "EPS",
// "Histoire") -- sans quoi le libellé généré serait grammaticalement fautif
// ("Revoir le cours de Anglais"), même souci que `buildDevoirARendreLabel`
// ci-dessus pour le texte généré côté devoirs.
function withDePrefix(name: string): string {
  const trimmed = name.trim();
  const first = trimmed.charAt(0).toLocaleLowerCase("fr-FR");
  const elides = "aeiouyàâäéèêëîïôöùûü".includes(first) || first === "h";
  return elides ? `d'${trimmed}` : `de ${trimmed}`;
}

/**
 * Dérive la checklist "Révisions du jour" (Story 2.6, FR-19) : un item par
 * matière suivie aujourd'hui (liste plate, comme Matin/Retour -- pas de
 * groupement puisqu'il n'y a jamais qu'un seul item par matière), croisé avec
 * l'état coché existant, keyé par `sourceId` = `Subject.id` (jamais par
 * libellé, AD-3) et filtré sur `sourceType = CHECKLIST_SOURCE_TYPE_SUBJECT`
 * (même mécanisme que `deriveFixedChecklist`).
 *
 * Comportements couverts (I/O matrix spec 2.6) :
 * - une matière suivie aujourd'hui sans état coché existant est décochée par
 *   défaut (nouveau jour scolaire) ;
 * - une matière avec un état coché existant reflète cet état ;
 * - un état coché dont le `sourceId` ne correspond à aucune matière reçue ici
 *   (matière retirée de l'EDT du jour depuis) est simplement ignoré -- pas de
 *   purge active requise (AD-3), et le rappel correspondant disparaît
 *   naturellement puisqu'il n'est jamais généré ;
 * - une matière avec plusieurs créneaux aujourd'hui n'apparaît qu'une fois
 *   ici -- dédupliquée en amont par `subjects` (l'appelant transmet le
 *   résultat de `dedupeSubjectsFromSlots`, jamais les créneaux bruts).
 *
 * Pure : ne décide pas de "aujourd'hui est sans cours" -- si `subjects` est
 * vide, l'appelant (app/(accueil)/page.tsx) n'affiche aucun bloc plutôt que
 * d'invoquer cette fonction sur une liste vide (Boundaries spec 2.6 : jamais
 * de message neutre pour ce bloc, contrairement au Sac).
 */
export function deriveRevisionsChecklist(
  subjects: readonly RevisionSubjectInput[],
  checkedStates: readonly ChecklistItemStateInput[]
): DerivedRevisionItem[] {
  const checkedBySourceId = new Map<string, boolean>();
  for (const state of checkedStates) {
    if (state.sourceType === CHECKLIST_SOURCE_TYPE_SUBJECT) {
      checkedBySourceId.set(state.sourceId, state.checked);
    }
  }

  return subjects.map((subject) => ({
    sourceId: subject.id,
    sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT,
    label: `Revoir le cours ${withDePrefix(subject.name)}`,
    checked: checkedBySourceId.get(subject.id) ?? false,
    subject: { id: subject.id, name: subject.name, colorIndex: subject.colorIndex },
  }));
}

/** Un `FixedChecklistItem` (Matin ici), tel que chargé par data/checklist.ts. */
export interface FixedChecklistItemInput {
  id: string;
  label: string;
}

/**
 * Dérive une checklist fixe (Matin ici, Retour en Story 2.3) : liste plate
 * (pas de groupement par matière, contrairement au sac -- spec 2.2, Never),
 * croisée avec l'état coché existant, keyé par `sourceId` (l'`id` du
 * `FixedChecklistItem`), jamais par libellé (AD-3), exactement le même
 * mécanisme que `deriveSacChecklist`.
 *
 * Comportements couverts (I/O matrix spec 2.2) :
 * - un item sans état coché existant est décoché par défaut (nouveau jour
 *   scolaire : `checkedStates` vient d'une `date` différente, donc vide) ;
 * - un item dont l'`id` a un état coché existant reflète cet état, même si
 *   son libellé a changé depuis (édition Réglages) ;
 * - un état coché dont le `sourceId` ne correspond à aucun item reçu ici
 *   (item supprimé depuis) est simplement ignoré -- pas de purge active
 *   requise (AD-3).
 *
 * Pure : ne décide ni du pré-remplissage des défauts (data/checklist.ts) ni
 * de la date "aujourd'hui" (domain/school-day.ts) -- reçoit `items` et
 * `checkedStates` déjà résolus par l'appelant.
 */
export function deriveFixedChecklist(
  items: readonly FixedChecklistItemInput[],
  checkedStates: readonly ChecklistItemStateInput[]
): DerivedChecklistItem[] {
  const checkedBySourceId = new Map<string, boolean>();
  for (const state of checkedStates) {
    if (state.sourceType === CHECKLIST_SOURCE_TYPE_FIXED_ITEM) {
      checkedBySourceId.set(state.sourceId, state.checked);
    }
  }

  return items.map((item) => ({
    sourceId: item.id,
    sourceType: CHECKLIST_SOURCE_TYPE_FIXED_ITEM,
    label: item.label,
    checked: checkedBySourceId.get(item.id) ?? false,
  }));
}
