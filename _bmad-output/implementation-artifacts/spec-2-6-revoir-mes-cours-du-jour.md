---
title: 'Story 2.6 — Revoir mes cours du jour'
type: 'feature'
created: '2026-09-09'
status: 'review'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: '7e82c8e993687d4c3ee229fd614f792dd77cff1'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rien ne rappelle à l'enfant de revoir ses cours le jour même où il les a eus -- il ne prend l'habitude de réviser qu'à l'approche d'un contrôle, jamais au fil de l'eau (FR-19).

**Approach:** Nouveau bloc "Révisions du jour" sur Accueil, généré chaque soir à partir des matières réellement suivies **aujourd'hui** (pas demain, contrairement au Sac) : un rappel cochable "Revoir le cours de {matière}" par matière. Aucune nouvelle table Prisma -- réutilise `ChecklistItemState` (déjà générique, AD-3) avec un nouveau couple `checklistType=REVISIONS`/`sourceType=SUBJECT` (`sourceId` = l'id de la `Subject` elle-même, il n'existe pas d'entité "item de révision" séparée à créer/configurer). Recalculé à chaque consultation à partir de l'EDT du jour même (AD-2), jamais une copie figée.

## Boundaries & Constraints

**Always:**
- Basé sur l'EDT du jour même (aujourd'hui), calculé indépendamment du bloc Sac (qui regarde demain) -- même mécanisme que `deriveDaySlots`/`dedupeSubjectsFromSlots` déjà utilisés pour demain, appliqué ici à aujourd'hui.
- Un rappel par matière suivie aujourd'hui, jamais par créneau (une matière avec deux créneaux le même jour ne produit qu'un seul rappel -- même déduplication que le Sac).
- Coché/décoché indépendamment de toute autre checklist -- `sourceType=SUBJECT` dédié, jamais confondu avec `SUBJECT_ITEM` (Sac) ou `FIXED_ITEM` (Matin/Retour).
- Si aujourd'hui est "sans cours" (ou aucune matière suivie), **aucun bloc n'est affiché du tout** -- pas de message neutre type "Pas cours..." (différent du Sac, qui affiche un message rassurant ; ici l'AC demande explicitement "pas de bloc vide qui interroge").
- Recalculé à chaque chargement de page à partir de l'EDT courant (AD-2) -- si l'EDT du jour est corrigé après coup, les rappels déjà cochés qui correspondent encore à une matière du jour gardent leur état, les nouveaux apparaissent décochés, ceux qui ne correspondent plus à aucune matière du jour disparaissent (même comportement que le Sac).

**Ask First:** Aucune.

**Never:** Personnalisation du texte du rappel depuis Réglages (toujours "Revoir le cours de {matière}", généré, pas une entité éditable comme `SubjectItem`/`FixedChecklistItem`). Lier ce bloc au calcul du Streak/de la complétion de "Ce soir" (Story 2.7, hors périmètre ici). Implémenter l'écran "Ce soir" à 3 blocs (Story 2.7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| SVT et Français aujourd'hui | 2 matières suivies aujourd'hui | Bloc "Révisions du jour" avec "Revoir le cours de SVT" et "Revoir le cours de Français", décochés par défaut | N/A |
| Aujourd'hui "sans cours" | Aucune matière | Aucun bloc affiché (ni message, ni carte vide) | N/A |
| Une matière avec deux créneaux aujourd'hui | Ex. Maths le matin et l'après-midi | Un seul rappel "Revoir le cours de Maths" (dédupliqué) | N/A |
| Rappel coché, puis EDT du jour corrigé (matière retirée) | Correction après coup | Le rappel disparaît du bloc (recalculé, pas une copie figée) | N/A |
| Rappel coché, EDT du jour corrigé (matière conservée) | Correction sans impact sur cette matière | Le rappel reste coché | N/A |
| Nouvelle matière ajoutée à l'EDT du jour après coup | Correction après coup | Le nouveau rappel apparaît décoché | N/A |

</frozen-after-approval>

## Code Map

- `domain/checklist.ts` -- nouvelle constante `CHECKLIST_TYPE_REVISIONS` et `CHECKLIST_SOURCE_TYPE_SUBJECT` ; nouvelle fonction pure `deriveRevisionsChecklist(subjects, checkedStates)` -- liste plate (un item par matière, `sourceId` = `Subject.id`), même mécanisme de croisement que `deriveFixedChecklist` mais conserve `colorIndex` pour la pastille de matière
- `actions/checklist.ts` -- `toggleRevisionsChecklistItem` (wrapper fixant `checklistType=REVISIONS`/`sourceType=SUBJECT`, même pattern que `toggleMatinChecklistItem`/`toggleRetourChecklistItem`) ; `KNOWN_CHECKLIST_TYPES`/`KNOWN_SOURCE_TYPES` étendues
- `components/checklist/revisions-checklist.tsx` (nouveau) -- liste plate avec pastille de matière par ligne (mirror `SacChecklist`/`FixedChecklist`), **ne rend rien** (pas de carte) quand la liste est vide -- contrairement à `FixedChecklist`
- `app/(accueil)/page.tsx` -- calcule `todaySlots`/`todaySubjects` (aujourd'hui, même mécanisme déjà en place pour demain -- `deriveDaySlots` + `dedupeSubjectsFromSlots`, avec la parité Semaine A/B du jour même), charge les états cochés `REVISIONS` du jour, dérive et affiche le nouveau bloc

## Tasks & Acceptance

**Execution:**
- [ ] `domain/checklist.ts`, `domain/checklist.test.ts` -- `deriveRevisionsChecklist` pure + tests (I/O matrix ci-dessus, y compris déduplication et recalcul)
- [ ] `actions/checklist.ts`, `actions/checklist.test.ts` -- `toggleRevisionsChecklistItem` + test d'intégration
- [ ] `components/checklist/revisions-checklist.tsx` -- composant, aucun rendu si liste vide
- [ ] `app/(accueil)/page.tsx` -- branchement (todaySlots/todaySubjects, chargement des états, rendu conditionnel)
- [ ] Vérification manuelle : matières du jour avec rappels cochables, jour sans cours -> aucun bloc, cocher un rappel et recharger -> persiste, matière avec 2 créneaux le même jour -> un seul rappel

**Acceptance Criteria:** (reprises du PRD FR-19/epics.md Story 2.6, ci-dessus)

## Spec Change Log

- **Post-review (3-layer adversarial review) :** libellé généré corrigé pour l'élision française ("Revoir le cours de Anglais" -> "d'Anglais") -- pas un changement d'intent/boundaries, correction d'un défaut de génération de texte non anticipé par la spec (qui décrit littéralement le gabarit `"Revoir le cours de {matière}"` sans traiter le cas de l'élision). Cf. `withDePrefix` dans `domain/checklist.ts`.

## Design Notes

- `deriveRevisionsChecklist` ne déduplique jamais elle-même -- elle fait confiance à l'appelant pour lui transmettre `subjects` déjà dédupliqué (résultat de `dedupeSubjectsFromSlots`), exactement comme `deriveSacChecklist`/`deriveFixedChecklist` font confiance à leurs appelants pour le filtrage par `checklistType`. Choix délibéré, cohérent avec le reste de `domain/checklist.ts` (chaque fonction pure fait un seul travail, la composition du pipeline reste dans `app/(accueil)/page.tsx`).
- `RevisionsChecklist` ne rend rien (`return null`) quand `items` est vide -- une double garantie avec l'appelant qui, de toute façon, ne construit jamais une liste vide un jour sans cours autrement qu'en la transmettant telle quelle (jamais de branche conditionnelle côté page pour ce bloc, contrairement au Sac). Les deux couches protègent donc indépendamment le "jamais de message neutre" du Boundaries.
- Élision "de"/"d'" (`withDePrefix`) : heuristique simple (voyelle ou "h" en première lettre), même esprit que `buildDevoirARendreLabel` (Story 2.5) pour le texte généré. Pas de liste d'exceptions ("h aspiré") -- aucune matière réelle de collège n'en a besoin (Histoire, Histoire-Géo ont toutes un h muet).

## Verification

**Commands:**
- `npx vitest run domain/checklist.test.ts actions/checklist.test.ts` -- expected: nouvelle logique couverte
- `npm run build` / `npx tsc --noEmit` / `npx eslint .` -- expected: aucune erreur

**Manual checks (if no CLI):**
- Vérifier le bloc "Révisions du jour" avec les matières réelles du jour
- Marquer aujourd'hui "sans cours" (ou vérifier un jour sans créneau) -- aucun bloc affiché
- Cocher un rappel, recharger la page -- persiste
- Vérifier qu'une matière à deux créneaux le même jour ne produit qu'un seul rappel

**Résultats (session d'implémentation) :**

- `npx vitest run domain/checklist.test.ts actions/checklist.test.ts` -- 49 tests passent (38 domain, 11 actions), y compris les nouveaux cas déduplication (pipeline `dedupeSubjectsFromSlots` -> `deriveRevisionsChecklist`) et élision française.
- `npx tsc --noEmit` -- aucune erreur.
- `npx eslint .` -- aucune erreur.
- Vérification manuelle en conditions réelles (dev.db) via le navigateur :
  - Mercredi (jour réel avec un seul créneau Français) -> bloc "Révisions du jour" affiché avec "Revoir le cours de Français", 0/1.
  - Coché puis rechargement de page -> reste coché (1/1), recoché à 0/1 pour restaurer l'état.
  - Ajout temporaire d'un second créneau Français le même jour -> toujours un seul rappel affiché (dédupliqué), retiré après vérification.
  - Ajout temporaire d'un `NoSchoolDay` sur aujourd'hui -> le bloc "Révisions du jour" disparaît entièrement (aucune carte, aucun message), retiré après vérification.
  - Ajout temporaire d'un créneau Anglais aujourd'hui -> "Revoir le cours d'Anglais" (élision correcte), retiré après vérification.
- 3-layer adversarial review (blind-hunter, edge-case-hunter, verification-gap) exécutée en parallèle sur le diff complet. Corrigé : libellé "de"/"d'" (élision française, défaut réel visible utilisateur), test de déduplication manquant explicitement demandé par les Tasks de cette spec, type `RevisionsChecklistItemView` incomplet (`sourceType` manquant), commentaire attribuant à tort une optimisation au Boundaries de la spec, typage fragile du 5e élément du `Promise.all` (page.tsx). Différé vers `deferred-work.md` (patterns pré-existants, hors périmètre de cette story) : validation par paire checklistType/sourceType (5e occurrence du gap déjà loggé depuis Story 2.3), duplication de la logique de dérivation du jour aujourd'hui/demain, état optimiste non resynchronisé après revalidation (pattern hérité de SacChecklist/FixedChecklist), absence de test de rendu de page (gap déjà loggé, anticipait explicitement ce scénario), absence de région `aria-live`.

## Suggested Review Order

1. `domain/checklist.ts` -- `deriveRevisionsChecklist` + `withDePrefix` (logique pure, testée)
2. `domain/checklist.test.ts` -- I/O matrix, dédup pipeline, élision
3. `actions/checklist.ts` -- `toggleRevisionsChecklistItem` + allow-lists étendues
4. `components/checklist/revisions-checklist.tsx` -- composant (mirror `FixedChecklist`/`SacChecklist`)
5. `app/(accueil)/page.tsx` -- branchement (today vs tomorrow, Promise.all, rendu conditionnel)
