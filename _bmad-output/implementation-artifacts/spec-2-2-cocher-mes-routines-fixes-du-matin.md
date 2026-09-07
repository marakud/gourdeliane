---
title: 'Story 2.2 — Cocher mes routines fixes du matin'
type: 'feature'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'e807ff11d1866500350ac90b29d292d05f88b0ca'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rien ne rappelle encore à l'enfant les vérifications fixes du matin (clés, goûter, carnet, chargeur) avant de partir -- contrairement au sac (Story 2.1), cette liste ne dépend pas de l'EDT, elle est toujours la même mais doit être personnalisable et se décocher chaque jour.

**Approach:** Ajouter un modèle `FixedChecklistItem` (liste plate par utilisateur et par type de checklist, réutilisable pour Retour en Story 2.3), le pré-remplir avec des valeurs par défaut à la première consultation, réutiliser `ChecklistItemState` (Story 2.1, AD-3) avec `checklistType="MATIN"` -- le "reset quotidien" vient uniquement du fait que `date` change, aucune tâche planifiée. Afficher le bloc "Ce matin" sur Accueil (sous le Sac) et sa gestion dans Réglages.

## Boundaries & Constraints

**Always:**
- `FixedChecklistItem` est une liste plate par utilisateur (pas liée à une matière), scopée par `checklistType` -- "MATIN" ici, "RETOUR" en Story 2.3 réutilisera le même modèle.
- Si aucun `FixedChecklistItem` de type "MATIN" n'existe encore pour l'utilisateur, la liste par défaut (Clés, Goûter, Carnet, Chargeur) est créée automatiquement à la première consultation -- une seule fois, jamais recréée si l'utilisateur a tout supprimé depuis.
- L'état coché réutilise `ChecklistItemState` (Story 2.1) avec `checklistType="MATIN"`, `sourceType="FIXED_ITEM"`, `sourceId=FixedChecklistItem.id` -- keyé par identité stable, jamais par libellé (AD-3), exactement comme le sac.
- La checklist du matin porte sur **aujourd'hui** (calculé via `domain/school-day.ts`, AD-4) -- pas demain comme le sac. Le "reset chaque jour scolaire" (FR-7) est automatique : une nouvelle `date` n'a par définition aucun `ChecklistItemState` coché, aucun job n'efface rien.
- Éditer/ajouter/supprimer un `FixedChecklistItem` dans Réglages s'applique immédiatement, sans toucher aux `ChecklistItemState` déjà existants (même logique que `SubjectItem`, Story 2.1).
- Toute mutation passe par une Server Action dans `actions/` ; toute dérivation vit dans `domain/`, pure.
- Plancher d'accessibilité déjà en place (tap ≥44px, texte ≥16px, jamais la seule couleur pour un état coché).

**Ask First:** Aucune.

**Never:** Implémenter Retour/Révisions/Devoirs ou l'écran "Ce soir" à 3 blocs (stories suivantes). Recréer les valeurs par défaut si la liste de l'utilisateur est vide parce qu'il a tout supprimé lui-même (le pré-remplissage n'a lieu qu'à la toute première consultation, jamais après). Grouper par matière (contrairement au sac, Matin est une liste plate).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Première consultation, aucun item | Aucun `FixedChecklistItem` "MATIN" pour l'utilisateur | Liste par défaut créée et affichée, décochée | N/A |
| Consultations suivantes | Des `FixedChecklistItem` "MATIN" existent déjà | Liste existante affichée telle quelle, pas de recréation des défauts | N/A |
| Utilisateur a tout supprimé | Liste vidée manuellement | Liste vide affichée (pas de recréation automatique) | N/A |
| Cocher un item | Tap sur une case | `ChecklistItemState` du jour mis à jour immédiatement | `{ ok: false, error }` si échec |
| Nouveau jour scolaire | Items cochés hier, `date` = aujourd'hui différente | Tous les items apparaissent décochés (nouvelle `date`, aucun état existant) | N/A |
| Édition du libellé d'un item déjà coché | Item coché, libellé modifié dans Réglages | L'état coché survit (même `id`, AD-3) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` + `prisma/production/schema.prisma` (+ migrations séparées) -- ajouter `FixedChecklistItem` (id, userId, checklistType, label, createdAt)
- `domain/checklist.ts` -- ajouter `CHECKLIST_TYPE_MATIN`, `CHECKLIST_SOURCE_TYPE_FIXED_ITEM`, `DEFAULT_MATIN_ITEMS`, et `deriveFixedChecklist(items, checkedStates)` pure (liste plate, pas de groupement -- réutilise le même croisement par `sourceId` que `deriveSacChecklist`)
- `data/checklist.ts` -- ajouter `listFixedChecklistItems` (avec pré-remplissage des défauts si liste vide et jamais initialisée, ex. via un flag ou simplement "aucun item d'aucune sorte pour ce type"), CRUD `FixedChecklistItem`
- `actions/checklist.ts` -- ajouter `createFixedChecklistItem`, `updateFixedChecklistItem`, `deleteFixedChecklistItem` (le cochage réutilise `toggleChecklistItem` existant, généralisé si besoin pour accepter un `checklistType`/`sourceType` paramétrés au lieu de "SAC"/"SUBJECT_ITEM" en dur)
- `components/checklist/fixed-checklist.tsx` (nouveau) -- liste plate cochable, réutilise le style de `sac-checklist.tsx`
- `components/checklist/fixed-items-manager.tsx` (nouveau) -- gestion Réglages, réutilise le style de `subject-items-manager.tsx`
- `app/(accueil)/page.tsx` -- ajoute le bloc "Ce matin" sous le Sac
- `app/reglages/page.tsx` -- ajoute la section de gestion des items Matin

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma`, `prisma/production/schema.prisma` -- ajouter `FixedChecklistItem`, migrations dev + prod
- [x] `domain/checklist.ts` -- `deriveFixedChecklist` + constantes MATIN, avec tests unitaires -- couvre la matrice I/O
- [x] `data/checklist.ts` -- pré-remplissage des défauts à la première consultation + CRUD, avec test d'intégration (idempotence du pré-remplissage)
- [x] `actions/checklist.ts` -- CRUD `FixedChecklistItem` en Server Actions, généralisation de `toggleChecklistItem` si besoin
- [x] `components/checklist/fixed-checklist.tsx`, `app/(accueil)/page.tsx` -- bloc "Ce matin" sur Accueil -- couvre FR-6
- [x] `components/checklist/fixed-items-manager.tsx`, `app/reglages/page.tsx` -- gestion des items Matin -- couvre FR-6
- [x] Vérification manuelle responsive -- mobile/tablette, tap ≥44px

**Acceptance Criteria:**
- Given aucun item personnalisé, when j'ouvre "Ce matin" pour la première fois, then je vois la liste par défaut (clés, goûter, carnet, chargeur), personnalisable dans Réglages
- Given la checklist du matin cochée hier, when un nouveau jour scolaire commence, then elle apparaît entièrement décochée

## Spec Change Log

**Écart au Code Map (schéma) :** le Code Map ne listait que `FixedChecklistItem (id, userId, checklistType, label, createdAt)`. Un second modèle minimal, `FixedChecklistDefaultsSeed (id, userId, checklistType, createdAt)`, a été ajouté -- non frozen, Code Map n'étant pas dans le bloc `<frozen-after-approval>`, contrairement à Boundaries/I-O matrix. Raison : les Design Notes proposaient de détecter "première consultation" par "aucun `FixedChecklistItem` pour ce type" sans flag séparé, mais ce test seul ne distingue pas "jamais initialisé" de "tout supprimé par l'utilisateur" -- les deux se traduisent par zéro ligne. Or le Never de cette spec et la ligne "Utilisateur a tout supprimé" de l'I-O matrix (frozen, donc prioritaires) exigent explicitement qu'aucune recréation n'ait lieu dans ce second cas. `FixedChecklistDefaultsSeed` porte une ligne unique `(userId, checklistType)`, écrite une seule fois au tout premier remplissage et jamais supprimée par `deleteFixedChecklistItem` -- elle permet de distinguer les deux cas sans toucher à la forme de `FixedChecklistItem` lui-même. Vérifié par un test d'intégration dédié (`data/checklist.test.ts`) qui supprime tous les items par défaut puis re-consulte la liste : elle reste vide.

## Design Notes

Le pré-remplissage des défauts se détecte par "aucun `FixedChecklistItem` de ce `checklistType` pour cet utilisateur" -- pas par un flag séparé "défauts déjà initialisés" : plus simple, et couvre naturellement le cas où l'utilisateur supprime tout (pas de recréation, cf. Never) puisqu'on ne peut pas distinguer "jamais initialisé" de "tout supprimé" avec cette seule condition -- c'est un choix assumé : mieux vaut une liste vide après suppression volontaire qu'une résurrection surprenante des défauts.

**Revue post-implémentation :** cette note (non frozen) s'est avérée intenable telle quelle -- "pas de flag séparé" et "pas de recréation après suppression totale" sont en tension directe dès lors que "aucun FixedChecklistItem" est la seule condition testée (elle est vraie aussi bien à la toute première consultation qu'après une suppression totale). Le frozen Never/I-O matrix ayant priorité, l'implémentation réelle (`data/checklist.ts::listFixedChecklistItems`) utilise `FixedChecklistDefaultsSeed` comme marqueur dédié -- voir Spec Change Log ci-dessus.

**Revue post-implémentation (blind hunter / edge-case hunter / verification-gap) :** la création du marqueur `FixedChecklistDefaultsSeed` et celle des 4 objets par défaut étaient deux écritures séparées -- une requête concurrente perdant la course sur le marqueur (P2002) pouvait relire `FixedChecklistItem` entre les deux et recevoir `[]` au lieu des défauts fraîchement créés (Accueil et Réglages chargés en même temps au tout premier lancement). Corrigé en regroupant les deux écritures dans un `prisma.$transaction`, avec un test d'intégration dédié (deux appels concurrents via `Promise.all`).

**Bug réel trouvé et corrigé pendant la revue (pas seulement théorique) :** en essayant d'écrire un test direct sur `toggleChecklistItem` (Server Action), `revalidatePath` s'est révélé lever une exception hors d'une requête Next.js ("Invariant: static generation store missing") -- capturée par le même `try/catch` que la mutation, elle transformait un succès réel en `{ ok: false }` renvoyé à l'appelant, alors que l'écriture en base avait déjà réussi. Vérifié concrètement : la ligne `ChecklistItemState` existait bien en base malgré la réponse `ok: false`. Corrigé dans `actions/checklist.ts` **et** `actions/schedule.ts` (même fonction dupliquée depuis la Story 1.2) en absorbant l'erreur de revalidation sans la laisser masquer le succès de la mutation. Cette correction a aussi rendu possible un test d'intégration direct sur les Server Actions (`actions/checklist.test.ts`, nouveau), qui échouait systématiquement avant ce correctif.

**Autre correctif de revue :** `checklistType`/`sourceType` sur `toggleChecklistItem` sont désormais fournis par l'appelant (généralisation de cette story) sans validation -- une liste blanche a été ajoutée pour éviter qu'un appel direct (hors UI) n'écrive des lignes avec un type inconnu.

## Verification

**Commands:**
- `npx vitest run` -- expected: tests de `domain/checklist.ts` (matrice I/O) et test d'intégration du pré-remplissage passent
- `npm run build`, `npx tsc --noEmit`, `npm run lint` -- expected: aucune erreur

**Résultats (session d'implémentation + revue) :**
- `npx vitest run` -- OK, 54/54 tests passent (`domain/checklist.test.ts` 15 dont 7 nouveaux pour `deriveFixedChecklist`, `data/checklist.test.ts` 4 dont 2 nouveaux pour le pré-remplissage + 1 nouveau pour la course concurrente, `actions/checklist.test.ts` 3 nouveaux tests d'intégration sur les Server Actions, `domain/schedule.test.ts` 18, `domain/school-day.test.ts` 12).
- `npm run build` -- OK, `/` et `/reglages` confirmés `ƒ (Dynamic)`.
- Vérifié manuellement : liste par défaut à la première visite, cochage avec persistance, ajout/suppression d'item dans Réglages reflété sur Accueil.

**Manual checks (if no CLI):**
- Ouvrir Accueil pour la première fois, vérifier la liste par défaut du matin
- Cocher un item, vérifier la persistance ; simuler un nouveau jour (changer la date système ou tester via les tests) et vérifier le reset
- Ajouter/supprimer un item dans Réglages, vérifier que ça se reflète sur Accueil

## Suggested Review Order

**Pré-remplissage atomique des défauts (correctif de revue)**

- Marqueur + défauts créés dans une transaction unique -- corrige une fenêtre de course où une requête concurrente pouvait recevoir une liste vide.
  [`checklist.ts:120`](../../data/checklist.ts#L120)

**Dérivation pure de la checklist fixe (AD-3)**

- Liste plate, même mécanisme de croisement par `sourceId` que le sac.
  [`checklist.ts:132`](../../domain/checklist.ts#L132)

**Généralisation de `toggleChecklistItem` (liste blanche ajoutée en revue)**

- `checklistType`/`sourceType` désormais fournis par l'appelant, validés contre les valeurs connues.
  [`checklist.ts:85`](../../actions/checklist.ts#L85)

- Wrapper dédié pour Matin, sans exposer les constantes de domaine au composant.
  [`checklist.ts:272`](../../actions/checklist.ts#L272)

**Bug de `revalidatePath` trouvé et corrigé pendant la revue**

- Une erreur de revalidation ne doit jamais masquer le succès réel d'une mutation -- confirmé par un test direct sur la Server Action avant correctif.
  [`checklist.ts:36`](../../actions/checklist.ts#L36)
