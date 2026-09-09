---
title: 'Story 2.5 — Lier un devoir à rendre à mon sac du lendemain'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'c0e4f313a730d7a3b5d91bdc2e31f4363014ffd6'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Un devoir marqué "à rendre" avec une échéance demain n'apparaît nulle part dans le bloc "Avant d'aller se coucher" comme un objet précis à préparer -- seulement dans le bloc "Devoirs" plus bas (texte, pas une checklist de préparation), ou, depuis le retour utilisateur précédent, dans la rubrique "Devoirs pour demain" (lecture seule, sans distinction "à rendre" ou non). Le PRD (FR-18) demande explicitement qu'un tel devoir ajoute un objet **spécifique et cochable** dans la checklist Sac, à côté du matériel générique de la matière -- pour que l'enfant ne l'oublie pas en préparant son sac.

**Approach:** Un devoir "à rendre" dont l'échéance est demain devient un objet cochable supplémentaire dans le groupe de sa matière au sein du Sac (`domain/checklist.ts::deriveSacChecklist`), suivi indépendamment via `ChecklistItemState` avec un nouveau `sourceType` dédié (`DEVOIR_A_RENDRE`) -- jamais confondu avec `Devoir.done` (AD-7 : cocher "je l'ai préparé dans mon sac" est une action différente de "je l'ai fait"). Pour éviter le doublon avec la rubrique "Devoirs pour demain" ajoutée au retour utilisateur précédent, un devoir "à rendre" bascule entièrement vers ce nouvel objet cochable et disparaît de cette rubrique lecture seule (répartition par `aRendre`, décision explicite de l'utilisateur) ; un devoir non-"à rendre" échéant demain continue d'y apparaître comme avant.

## Boundaries & Constraints

**Always:**
- L'objet ajouté au Sac vit dans le groupe de la **matière du devoir** (`Devoir.subjectId`), en plus des `SubjectItem` déjà présents -- jamais un groupe séparé.
- Suivi indépendant de `Devoir.done` : cocher/décocher cet objet dans le Sac ne modifie jamais `Devoir.done`, et inversement (AD-7). Clé stable `(userId, date, checklistType=SAC, sourceType=DEVOIR_A_RENDRE, sourceId=Devoir.id)`, jamais par libellé (AD-3) -- même mécanisme que les `SubjectItem`.
- Un devoir "à rendre" sans échéance renseignée n'ajoute rien au Sac (reste visible uniquement dans "Devoirs").
- Un devoir "à rendre" dont l'échéance n'est pas précisément demain (aujourd'hui, dans plusieurs jours, dans le passé) n'ajoute rien au Sac ce soir -- recalculé chaque soir comme le reste du Sac (AD-2), jamais une copie figée.
- Un devoir "à rendre" échéant demain dont la matière **n'a pas cours demain** (pas de créneau EDT) n'a pas de groupe où s'insérer -- reste dans la rubrique "Devoirs pour demain" (lecture seule) plutôt que de disparaître silencieusement du bloc du soir.
- Un devoir "à rendre" échéant demain dont la matière a cours demain bascule entièrement vers ce nouvel objet cochable -- ne s'affiche plus aussi dans "Devoirs pour demain" (pas de doublon, décision explicite).
- Le libellé de l'objet reprend la description du devoir, suffixée pour signaler qu'il est à rendre (ex. "Exercices p.42 à rendre") -- jamais recalculé depuis un libellé de matière générique.

**Ask First:** Aucune.

**Never:** Rendre l'échéance obligatoire à la saisie d'un devoir "à rendre" (question ouverte du PRD §8, tranchée en faveur du statu quo par l'AC "sans échéance renseignée" de cette story). Fusionner cet objet avec un `SubjectItem` existant. Faire dépendre son état coché de `Devoir.done` ou inversement.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Devoir "à rendre", échéance demain, matière a cours demain | Ex. devoir de maths | Objet "{description} à rendre" apparaît dans le groupe Maths du Sac, décoché par défaut, coché/décoché indépendamment de `Devoir.done` | N/A |
| Même devoir, coché dans le Sac | Objet Sac coché | `Devoir.done` reste inchangé (visible non coché dans "Devoirs" si pas encore fait) | N/A |
| Devoir "à rendre" sans échéance | -- | Aucun objet ajouté au Sac -- visible seulement dans "Devoirs" | N/A |
| Devoir "à rendre", échéance dans plus d'une semaine | -- | Aucun objet ajouté ce soir | N/A |
| Devoir "à rendre", échéance demain, matière SANS cours demain | -- | Aucun groupe Sac où l'insérer -- reste dans "Devoirs pour demain" (lecture seule) | N/A |
| Devoir non-"à rendre", échéance demain | -- | Comportement inchangé : reste dans "Devoirs pour demain" (lecture seule) | N/A |
| Devoir "à rendre" déjà fait (`done=true`), échéance demain | -- | Objet Sac quand même ajouté (préparer le sac reste utile même une fois le devoir fait) | N/A |

</frozen-after-approval>

## Code Map

- `domain/checklist.ts` -- nouvelle constante `CHECKLIST_SOURCE_TYPE_DEVOIR_A_RENDRE` ; `ChecklistSubjectItemInput` gagne un `sourceType?: string` optionnel (défaut `SUBJECT_ITEM`, rétrocompatible) ; `deriveSacChecklist` croise désormais l'état coché par clé composite `(sourceType, sourceId)` au lieu de filtrer uniquement `SUBJECT_ITEM`, et expose `sourceType` sur chaque `DerivedChecklistItem` (nécessaire pour que l'UI sache quel `sourceType` renvoyer à `toggleChecklistItem`)
- `actions/checklist.ts` -- `KNOWN_SOURCE_TYPES` gagne `DEVOIR_A_RENDRE`
- `app/(accueil)/page.tsx` -- calcule les devoirs "à rendre" échéant demain, les répartit : ceux dont la matière a un groupe Sac deviennent des `ChecklistSubjectItemInput` supplémentaires (label suffixé, `sourceType=DEVOIR_A_RENDRE`) injectés dans le groupe correspondant avant l'appel à `deriveSacChecklist` ; ceux dont la matière n'a pas cours demain restent dans `devoirsForTomorrow` (rubrique lecture seule, déjà existante) ; `devoirsForTomorrow` exclut désormais aussi tout devoir "à rendre" dont la matière a bien un groupe Sac (basculé vers l'objet cochable)
- `components/checklist/sac-checklist.tsx` -- `SacChecklistItem` gagne `sourceType` ; `handleToggle` transmet ce `sourceType` à `toggleChecklistItem` (au lieu de compter sur son défaut `SUBJECT_ITEM`, désormais insuffisant avec deux types mélangés dans un même groupe)

## Tasks & Acceptance

**Execution:**
- [ ] `domain/checklist.ts`, `domain/checklist.test.ts` -- nouveau `sourceType` sur les objets/dérivation, clé composite, tests couvrant le mélange SUBJECT_ITEM + DEVOIR_A_RENDRE dans un même groupe
- [ ] `actions/checklist.ts` -- liste blanche des `sourceType` étendue
- [ ] `app/(accueil)/page.tsx` -- répartition des devoirs "à rendre" échéant demain (Sac vs rubrique lecture seule selon que la matière a cours demain)
- [ ] `components/checklist/sac-checklist.tsx` -- transmission explicite du `sourceType` au toggle
- [ ] Vérification manuelle : devoir "à rendre" échéant demain sur une matière ayant cours demain (objet Sac cochable, indépendant de `Devoir.done`, disparu de "Devoirs pour demain") ; devoir "à rendre" échéant demain sur une matière sans cours demain (reste dans "Devoirs pour demain") ; devoir "à rendre" sans échéance (aucun impact)

**Acceptance Criteria:** (reprises du PRD/epics.md Story 2.5, ci-dessus)

## Spec Change Log

**Itération 1 (revue post-implémentation)** — implémentation initiale conforme au spec gelé (répartition par `aRendre` déjà tranchée avant implémentation). Revue adversariale à 3 couches en parallèle sur le diff complet ; correctifs appliqués : la logique de routage (quels devoirs rejoignent le Sac vs. restent dans "Devoirs pour demain") a été extraite de `app/(accueil)/page.tsx` vers une fonction pure et testée (`domain/checklist.ts::partitionDevoirsARendreForSac`) -- deux revues indépendantes avaient signalé cette logique comme non testée et fragile (deux boucles couplées seulement par un commentaire) ; correction d'un vrai bug de cohérence dans `sac-checklist.tsx` (l'état local coché/en attente et la clé React restaient keyés par `sourceId` seul, alors que la couche domaine venait justement d'adopter une clé composite `(sourceType, sourceId)` pour permettre le mélange SubjectItem/devoir-à-rendre dans un même groupe) ; ajout d'un garde-fou évitant un libellé dupliqué "... à rendre à rendre" si la description contient déjà la mention (bug de regex `\b` corrigé au passage : "à" accentué n'est pas un caractère de mot pour `\b` non-Unicode) ; ajout de `break-words` pour qu'une description longue ne casse pas la mise en page de la case ; tests manquants ajoutés (`actions/checklist.test.ts` pour le nouveau `sourceType` côté Server Action, `domain/checklist.test.ts` pour la fonction de routage). Pistes réelles mais de faible priorité loguées dans `deferred-work.md` : pas de distinction visuelle entre un objet générique et un objet "à rendre" (le texte suffit à l'accessibilité), deux devoirs de libellé identique indiscernables dans le Sac, extension d'un gap déjà accepté (validation de paires checklistType/sourceType, orphelins `ChecklistItemState` non purgés).

## Design Notes

L'insertion d'un devoir "à rendre" dans le Sac est **conditionnée à l'existence d'un groupe Sac pour sa matière** (donc à ce que la matière ait cours demain) -- un devoir dont la matière n'a pas cours demain reste dans "Devoirs pour demain" (lecture seule) plutôt que de créer un groupe Sac artificiel juste pour lui (qui afficherait aussi, à tort, le matériel générique de la matière alors qu'elle n'a pas cours). Décision documentée dans les Boundaries gelées, pas une improvisation d'implémentation.

## Verification

**Commands:**
- `npx vitest run domain/checklist.test.ts` -- expected: nouvelle logique de croisement par sourceType couverte
- `npm run build` / `npx tsc --noEmit` / `npx eslint .` -- expected: aucune erreur

**Manual checks (if no CLI):**
- Créer un devoir "à rendre" avec échéance demain sur une matière ayant cours demain -- vérifier l'objet dans le Sac, le cocher, vérifier que "Devoirs" (bloc principal) n'est pas affecté
- Vérifier qu'il a disparu de "Devoirs pour demain"
- Créer un devoir "à rendre" échéant demain sur une matière sans cours demain -- vérifier qu'il reste dans "Devoirs pour demain"

**Résultats (session d'implémentation) :**
- `npx vitest run` -- OK, 171/171 tests passent, incluant `partitionDevoirsARendreForSac` (routage pur, 8 cas) et le nouveau `sourceType` accepté par `toggleChecklistItem`.
- `npx tsc --noEmit` / `npx eslint .` -- OK, aucune erreur.
- `npm run build` -- OK, build de production réussit.
- Revue adversariale à 3 couches (blind-hunter, edge-case-hunter, verification-gap) en parallèle sur le diff complet -- voir Spec Change Log pour le détail des correctifs.
- Vérifié dans le navigateur (`npm run dev`) : un devoir "à rendre" échéant demain sur une matière ayant cours demain (Maths) apparaît comme objet cochable dans le Sac ("Exercice modifié avec succès à rendre") et disparaît de "Devoirs pour demain" ; le cocher passe le Sac à 1/1 sans toucher au bloc "Devoirs" (resté 0/1, `Devoir.done` inchangé) ; persiste après rechargement de page ; un second devoir "à rendre" échéant demain sur une matière SANS cours demain (Histoire) reste correctement affiché dans "Devoirs pour demain" plutôt que de disparaître.
- Confirmé en production par l'utilisateur ("ca marche").

## Suggested Review Order

**Routage pur et testé (correctif de revue -- remplace deux boucles couplées par un commentaire)**

- Un seul passage construit à la fois les objets à injecter et les ids consommés -- source unique de vérité, ne peut plus désynchroniser Sac et rubrique lecture seule.
  [`domain/checklist.ts:220`](../../domain/checklist.ts#L220)

**Clé composite cohérente entre domaine et UI (correctif de revue)**

- `sac-checklist.tsx` keyait son état local par `sourceId` seul alors que `deriveSacChecklist` venait d'adopter `(sourceType, sourceId)` -- deux lignes partageant un `sourceId` auraient partagé un seul état coché.
  [`components/checklist/sac-checklist.tsx:33`](../../components/checklist/sac-checklist.tsx#L33)

**Suivi indépendant de `Devoir.done` (AD-7)**

- `sourceType` dédié (`DEVOIR_A_RENDRE`) garantit que cocher "préparé dans le sac" et cocher "fait" restent deux clés `ChecklistItemState` séparées.
  [`domain/checklist.ts:16`](../../domain/checklist.ts#L16)

**Repli vers "Devoirs pour demain" quand la matière n'a pas cours demain**

- Un devoir "à rendre" dont la matière n'a pas de groupe Sac n'est jamais injecté ni consommé -- reste visible plutôt que de disparaître silencieusement.
  [`domain/checklist.ts:254`](../../domain/checklist.ts#L254)
