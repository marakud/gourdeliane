// CartableFlow -- domain/day-completion.ts (Story 2.7)
//
// Complétude du moment "Ce soir" (FR-20) : Sac + Révisions entièrement
// cochés (un bloc vide compte comme trivialement complet -- ex. jour sans
// cours demain) ET tout devoir "à rendre" échéant demain marqué fait. Pure,
// aucune dépendance vers Next.js ou Prisma (AD-1). Réutilisée à l'identique
// par app/(accueil)/page.tsx (affichage) ET data/day-completion.ts
// (persistance après une coche) -- une seule implémentation, jamais deux
// calculs indépendants qui pourraient diverger (AD-5).

import type { DayMoment } from "./school-day";

export const DAY_COMPLETION_MOMENT_SOIR = "SOIR" as const;

interface SacGroupLike {
  items: readonly { checked: boolean }[];
}

interface ChecklistItemLike {
  checked: boolean;
}

interface DevoirARendreDemainLike {
  done: boolean;
}

export interface SoirCompletionInput {
  sacGroups: readonly SacGroupLike[];
  revisionsItems: readonly ChecklistItemLike[];
  /** Devoirs déjà filtrés par l'appelant sur `aRendre && échéance === demain`
   * -- cette fonction ne refait jamais ce filtrage (Boundaries spec 2.7 : un
   * devoir sans échéance ou échéant plus tard ne doit jamais atteindre ici). */
  devoirsARendreDemain: readonly DevoirARendreDemainLike[];
}

/** Un bloc sans objet (ex. Sac un jour sans cours demain, ou Retour sans
 * item configuré -- Story 3.2) compte comme trivialement complet -- sinon un
 * moment sans rien à faire ne pourrait jamais être "complet" (I/O matrix spec
 * 2.7 et spec 3.2). Exportée (Story 3.2) : Matin et Retour ont exactement la
 * même forme de complétude que Sac/Révisions (`{checked: boolean}[]`), donc
 * réutilisent cette fonction plutôt que de dupliquer la règle. */
export function isBlockComplete(items: readonly ChecklistItemLike[]): boolean {
  return items.length === 0 || items.every((item) => item.checked);
}

/**
 * Calcule si le moment "Ce soir" est complet (Story 2.7, FR-20, PRD §9
 * assumption confirmée par epics.md Story 2.7 AC#3) :
 * - Sac (tous groupes confondus) trivialement-ou-réellement complet ;
 * - Révisions du jour trivialement-ou-réellement complet ;
 * - tout devoir "à rendre" échéant demain marqué fait (`devoirsARendreDemain`
 *   est déjà filtré par l'appelant -- un devoir sans échéance ou échéant
 *   plus tard n'y figure jamais, donc ne bloque jamais la complétude).
 *
 * Conséquence assumée (signalée en revue) : un devoir "à rendre" échéant
 * demain apparaît à DEUX endroits distincts et indépendants -- injecté comme
 * objet cochable dans son groupe Sac (Story 2.5, `sourceType =
 * DEVOIR_A_RENDRE`) ET comme ligne "fait/pas fait" dans `devoirsARendreDemain`
 * ci-dessus (`Devoir.done`, Story 2.4). Les deux cases sont réellement
 * distinctes (AD-3 : jamais la même clé), donc les DEUX doivent être cochées
 * pour que ce devoir n'empêche plus la complétude -- ni l'une ni l'autre
 * seule ne suffit. Voir `data/day-completion.test.ts` pour un cas
 * d'intégration explicite.
 */
export function computeSoirCompletion(input: SoirCompletionInput): boolean {
  const sacItems = input.sacGroups.flatMap((group) => group.items);
  const sacComplete = isBlockComplete(sacItems);
  const revisionsComplete = isBlockComplete(input.revisionsItems);
  const devoirsComplete = input.devoirsARendreDemain.every(
    (devoir) => devoir.done
  );

  return sacComplete && revisionsComplete && devoirsComplete;
}

/**
 * Sélectionne, parmi les trois complétudes déjà calculées séparément, celle
 * du moment courant (Story 3.2, repli visuel) -- extraite en fonction pure
 * testable plutôt que laissée en ternaire dans `app/(accueil)/page.tsx`
 * (correctif de revue : un branchement inversé/permuté ne serait détecté par
 * aucun test tant que cette sélection restait inline).
 */
export function selectCurrentMomentCompletion(
  currentMoment: DayMoment,
  matinComplete: boolean,
  retourComplete: boolean,
  soirComplete: boolean
): boolean {
  if (currentMoment === "MATIN") return matinComplete;
  if (currentMoment === "RETOUR") return retourComplete;
  return soirComplete;
}

/** Nombre d'objets faits/total dans un bloc -- refonte visuelle, carte
 * d'accueil (missions restantes + jauge). Un bloc vide donne `{done: 0,
 * total: 0}` (jamais `NaN`) ; l'appelant décide comment l'afficher (ex.
 * "rien de prévu" plutôt que "0/0"). */
export interface MomentProgress {
  done: number;
  total: number;
}

export function countBlockProgress(
  items: readonly ChecklistItemLike[]
): MomentProgress {
  return {
    done: items.filter((item) => item.checked).length,
    total: items.length,
  };
}

/** Même agrégation que `computeSoirCompletion` (Sac + Révisions + devoirs à
 * rendre demain), mais en décompte fait/total plutôt qu'en booléen -- une
 * seule définition de "ce qui compte pour Ce soir", jamais un second
 * calcul divergent (AD-5). */
export function countSoirProgress(input: SoirCompletionInput): MomentProgress {
  const sacItems = input.sacGroups.flatMap((group) => group.items);
  const allItems = [
    ...sacItems,
    ...input.revisionsItems,
    ...input.devoirsARendreDemain.map((devoir) => ({ checked: devoir.done })),
  ];
  return countBlockProgress(allItems);
}

/** Sélectionne, parmi les trois progressions déjà calculées séparément,
 * celle du moment courant -- même fonction pure/testée que
 * `selectCurrentMomentCompletion`, pour la carte d'accueil (refonte
 * visuelle). */
export function selectCurrentMomentProgress(
  currentMoment: DayMoment,
  matinProgress: MomentProgress,
  retourProgress: MomentProgress,
  soirProgress: MomentProgress
): MomentProgress {
  if (currentMoment === "MATIN") return matinProgress;
  if (currentMoment === "RETOUR") return retourProgress;
  return soirProgress;
}
