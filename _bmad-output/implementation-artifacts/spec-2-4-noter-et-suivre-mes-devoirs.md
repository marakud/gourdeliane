---
title: 'Story 2.4 — Noter et suivre mes devoirs'
type: 'feature'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'ddf868a9db5bfd3abc607c0ec863fdc7aa4a6024'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rien ne permet aujourd'hui à Léo de noter un devoir donné en classe et de le suivre jusqu'à ce qu'il soit fait -- aucun modèle `Devoir`, aucune saisie rapide, aucun affichage.

**Approach:** Nouveau modèle `Devoir` (matière + description obligatoires, "à rendre"/échéance optionnels, `done` qui ne se réinitialise jamais -- AD-7). Saisie via un FAB persistant (Accueil + EDT) ouvrant un modal de saisie rapide (`components/ui/dialog.tsx`), fermé immédiatement après validation. Affichage dans un bloc "Devoirs à faire" sur Accueil (toujours rendu, y compris vide), coché par tap comme les autres checklists.

## Boundaries & Constraints

**Always:**
- Création : matière + description seules obligatoires ; "à rendre" et échéance restent optionnels, aucune validation ne les rend requis. Apparition immédiate dans "Devoirs à faire", sans écran de confirmation.
- `Devoir.done` ne change que par tap explicite (AD-7) -- aucune tâche planifiée ne le réinitialise ni ne purge la ligne ; un devoir fait n'est simplement plus rendu dans "à faire" (même mécanisme d'exclusion que Sac/Matin/Retour, pas de suppression).
- Bloc "Devoirs à faire" toujours affiché sur Accueil, y compris vide -- jamais absent (contrairement à Sac). Vide → message positif ("Rien à faire ce soir, bravo !").
- Jamais de couleur d'alerte (rouge) liée à l'ancienneté ou à une échéance dépassée -- ton neutre/positif uniquement, aucune logique de retard dans cette story.
- Toute mutation passe par une Server Action dans `actions/homework.ts`, appelant une fonction pure de `domain/homework.ts` avant `data/homework.ts` (AD-1). Réutilise `SubjectTag` (`components/schedule/subject-tag.tsx`) pour la pastille matière -- ne pas réinventer.
- FAB dupliqué sur Accueil et EDT (pas de layout partagé existant pour ces deux routes) -- même composant `components/homework/add-homework-fab.tsx`, instancié deux fois.
- `prisma/schema.prisma` et `prisma/production/schema.prisma` restent synchronisés manuellement (convention existante) ; migration dev (sqlite) + migration production (postgres, générée hors-ligne via `prisma migrate diff`) toutes deux requises.

**Ask First:** Aucune.

**Never:** Lier un devoir "à rendre" au sac du lendemain (Story 2.5). Écran "Ce soir" à 3 blocs (Story 2.7). Logique de retard/couleur d'alerte. Modifier/supprimer un devoir après création (seule la bascule `done` est mutable dans cette story).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Création minimale | matière + description seules | Devoir créé, `aRendre=false`, `echeance=null`, visible immédiatement dans "à faire" | Description vide → rejet, message d'erreur |
| Devoir coché fait | Tap sur une ligne "à faire" | `done=true`, ligne retirée de "à faire" (mise à jour optimiste) | Échec réseau → annule l'optimisme, réaffiche la ligne |
| Aucun devoir en attente | Tous les devoirs `done=true` ou aucun devoir créé | Bloc affiché avec message positif, jamais absent | N/A |
| Devoir vieux de plusieurs jours, jamais fait | `createdAt` ancien, `done=false` | Reste visible, aucune pénalité visuelle (pas de couleur, pas de tri par urgence) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma`, `prisma/production/schema.prisma` -- ajouter modèle `Devoir` (id, userId+user Cascade, subjectId+subject Cascade, description String, aRendre Boolean @default(false), echeance DateTime?, done Boolean @default(false), createdAt), `@@index([userId, done])`, back-relation `devoirs Devoir[]` sur `User` (mirroring `SubjectItem`, schema.prisma:113-123) ; doc-comment référençant AD-7
- `domain/homework.ts` (nouveau) -- `filterDevoirsAFaire(devoirs)` pure, filtre `done === false`, préserve l'ordre reçu (pas de tri par urgence) ; style `domain/checklist.ts`
- `data/homework.ts` (nouveau) -- `createDevoir(userId, subjectId, description, aRendre?, echeance?)`, `markDevoirDone(id, userId)`, `listDevoirs(userId)` (orderBy createdAt asc) ; mirror `data/checklist.ts:237-246` (scoping update par `{id, userId}`)
- `actions/homework.ts` (nouveau) -- `ActionResult<T>`, `ensureSeedUser()`, `safeRevalidate`/`revalidateAccueil()` locaux (mirror `actions/checklist.ts:26-53`) ; `createDevoirAction`, `toggleDevoirDoneAction`
- `components/homework/add-homework-fab.tsx` (nouveau) -- FAB position fixe + `Dialog` (`components/ui/dialog.tsx`) contenant le formulaire (select matière via `components/ui/select.tsx`, description `Input`, case "à rendre", échéance `Input type="date"`) ; ferme immédiatement au submit, mirror `useTransition` de `AddFixedItemForm` (`components/checklist/fixed-items-manager.tsx:193-247`)
- `components/homework/devoirs-list.tsx` (nouveau) -- bloc "Devoirs à faire", tap-to-toggle optimiste mirror `FixedChecklist` (`components/checklist/fixed-checklist.tsx`), `SubjectTag` par ligne, message positif si vide
- `app/(accueil)/page.tsx` -- fetch `listDevoirs`, `filterDevoirsAFaire`, ajoute `<DevoirsList>` (toujours rendu) + `<AddHomeworkFab subjects={...}>`
- `app/edt/page.tsx` -- ajoute `<AddHomeworkFab subjects={...}>` uniquement (réutiliser la liste de matières déjà chargée par cette page)

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma`, `prisma/production/schema.prisma` -- modèle `Devoir` + migrations dev/production
- [x] `domain/homework.ts` -- `filterDevoirsAFaire` + tests unitaires (I/O matrix)
- [x] `data/homework.ts` -- CRUD, tests d'intégration
- [x] `actions/homework.ts` -- actions création/toggle, tests d'intégration
- [x] `components/homework/add-homework-fab.tsx` -- FAB + modal, formulaire minimal validé
- [x] `components/homework/devoirs-list.tsx` -- bloc "Devoirs à faire", tap-to-toggle optimiste, état vide positif
- [x] `app/(accueil)/page.tsx`, `app/edt/page.tsx` -- intégration FAB (+ bloc liste sur Accueil)

**Acceptance Criteria:**
- Given le FAB ouvert sur Accueil ou EDT, when je saisis matière + description et valide, then le devoir apparaît immédiatement dans "Devoirs à faire" sur Accueil, sans écran de confirmation
- Given un devoir affiché dans "Devoirs à faire", when je tape dessus, then il est marqué fait et retiré de la liste, sans être supprimé de la base
- Given aucun devoir en attente, when j'ouvre Accueil, then le bloc "Devoirs à faire" est affiché avec un message positif, jamais absent

## Spec Change Log

Aucun écart au Code Map à l'implémentation. La fonction `data/homework.ts::toggleDevoirDone(id, userId, done)` prévue au Code Map a été renommée `markDevoirDone(id, userId)` (sans paramètre `done`) pendant la revue -- voir ci-dessous.

**Revue (3-layer, itération 1) :** 3 correctifs réels appliqués :
- `actions/homework.ts::parseEcheance` -- acceptait un jour calendaire inexistant (ex. "2026-02-30") en le reportant silencieusement au mois suivant (`new Date` le corrige plutôt que de lever), contredisant son propre commentaire ("rejetée plutôt que silencieusement ignorée"). Corrigé en comparant `parsed.toISOString().slice(0,10)` à la chaîne d'origine ; test de régression ajouté (`actions/homework.test.ts`, échéance "2026-02-30").
- `data/homework.ts::toggleDevoirDone(id, userId, done: boolean)` -- le paramètre `done` libre laissait la couche données capable de redécocher un devoir, alors que le Never de cette spec n'expose aucun geste de "redécocher" et que ce garde-fou ne vivait que dans `actions/homework.ts` (choix de l'appelant, jamais imposé par les données). Renommé `markDevoirDone(id, userId)`, écrit toujours `done: true` -- ferme l'écart à la racine plutôt que par convention. `actions/homework.ts`/tests mis à jour en conséquence.
- `actions/schedule.ts::createSlot`/`updateSlot` -- ces deux actions peuvent faire naître une nouvelle `Subject` (`findOrCreateSubject`) mais ne revalidaient que `/edt`, jamais `/`. Sans régression visible avant cette story, mais le nouveau sélecteur de matière du FAB "Ajouter un devoir" (Accueil) en dépend directement : une matière tout juste créée depuis l'EDT pouvait rester absente de ce sélecteur. Ajout d'un `revalidateAccueil()` local (mirror `actions/checklist.ts`), appelé après les deux actions.

5 constats réels mais hors-scope (aucune régression, aucun critère d'acceptation concerné) loggés dans `deferred-work.md` : cascade `Devoir.subject` en tension avec l'invariant "jamais supprimé" si une suppression de matière apparaît un jour ; `listDevoirs` charge tout l'historique et filtre en JS plutôt qu'en requête (index `[userId, done]` inutilisé aujourd'hui) ; `subjectId` non vérifié comme appartenant à l'utilisateur avant création (mirror `createSubjectItem`, non exploitable -- utilisateur unique) ; "à rendre"/échéance saisis mais jamais affichés dans "Devoirs à faire" (scope MVP assumé, Story 2.5 les rendra utiles) ; `pendingId` scalaire unique dans `DevoirsList` (même limite que `FixedChecklist`, non exploitable aujourd'hui -- la ligne disparaît immédiatement du rendu).

Vérification indépendante (relecture complète des fichiers changés + re-exécution locale de `npx vitest run`/`npx tsc --noEmit`/`npm run lint`/`npm run build`, 3 subagents de revue en parallèle) menée séparément de la session d'implémentation.

## Design Notes

FAB dupliqué (pas de layout partagé Accueil+EDT existant, confirmé par l'investigation -- `app/layout.tsx` est le seul layout, commun à toutes les routes) plutôt qu'un wrapper client conditionnel sur `usePathname()` : plus simple, zéro risque de fuite sur d'autres routes (Réglages, Progression). `SubjectTag` documente déjà en commentaire (`subject-tag.tsx:3-4`) être prévu pour les devoirs -- confirme le choix de réemploi.

## Verification

**Commands:**
- `npx vitest run` -- expected: tests domain/data/actions passent, y compris non-régression Sac/Matin/Retour
- `npm run build`, `npx tsc --noEmit`, `npm run lint` -- expected: aucune erreur

**Manual checks:**
- Ouvrir Accueil et EDT, vérifier le FAB présent sur les deux, absent ailleurs (Réglages, Progression)
- Créer un devoir minimal (matière + description) depuis chaque écran, vérifier l'apparition immédiate sur Accueil
- Cocher un devoir, vérifier son retrait de "à faire" et sa persistance en base (non supprimé)
- Vérifier le message positif à vide, et l'absence de toute couleur d'alerte

**Résultats (session d'implémentation) :**
- `npx vitest run` -- OK, 80/80 tests passent (26 nouveaux : 5 `domain/homework.test.ts`, 5 `data/homework.test.ts`, 7 `actions/homework.test.ts` -- suites Sac/Matin/Retour existantes toujours vertes, non-régression confirmée).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- OK, aucune erreur, `/` et `/edt` toujours `ƒ (Dynamic)`.

**Résultats (revue indépendante, itération 1, après les 3 correctifs) :**
- `npx vitest run` -- OK, 81/81 tests passent (+1 test de régression : échéance calendairement invalide "2026-02-30" rejetée).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- OK, aucune erreur, `/` et `/edt` toujours `ƒ (Dynamic)`.
- Vérifié dans le navigateur (dev server + Browser pane) : bloc "Devoirs à faire" affiché vide ("Rien à faire ce soir, bravo !") ; FAB ouvert depuis Accueil, devoir minimal (Maths, "Exercices p.42") créé sans écran de confirmation, apparaît immédiatement dans "Devoirs à faire" ; tap sur la ligne -> retirée de la liste, message positif réaffiché, état persistant après rechargement complet de page (jamais supprimé en base, confirmé par `actions/homework.test.ts`) ; FAB présent sur EDT, absent sur Réglages.

## Suggested Review Order

**Modèle de données**

- Nouveau modèle, doc-comment référençant AD-7 ("jamais supprimé" par tâche planifiée).
  [`schema.prisma:201`](../../prisma/schema.prisma#L201)

**Règle métier (pure, domain/)**

- Filtre "à faire" : `done === false`, ordre préservé, pas de tri par urgence.
  [`domain/homework.ts:36`](../../domain/homework.ts#L36)

**Validation & mutation (actions/)**

- Rejette une échéance calendairement invalide plutôt que de la reporter silencieusement (correctif de revue).
  [`actions/homework.ts:55`](../../actions/homework.ts#L55)

- Création : matière + description seules obligatoires.
  [`actions/homework.ts:84`](../../actions/homework.ts#L84)

- Marque fait, jamais de geste "redécocher" exposé côté action.
  [`actions/homework.ts:129`](../../actions/homework.ts#L129)

- Écrit toujours `done: true` -- garde-fou déplacé dans la couche données (correctif de revue).
  [`data/homework.ts:36`](../../data/homework.ts#L36)

**Effet de bord inattendu (correctif de revue)**

- `createSlot`/`updateSlot` peuvent faire naître une Subject ; Accueil (FAB) doit désormais être revalidé aussi.
  [`actions/schedule.ts:51`](../../actions/schedule.ts#L51)

**UI -- saisie rapide**

- FAB position fixe + Dialog, ferme immédiatement au submit réussi (sans écran de confirmation).
  [`add-homework-fab.tsx:51`](../../components/homework/add-homework-fab.tsx#L51)

**UI -- affichage & tap-to-complete**

- Mise à jour optimiste : la ligne disparaît immédiatement du rendu au tap.
  [`devoirs-list.tsx:44`](../../components/homework/devoirs-list.tsx#L44)

**Intégration pages**

- Fetch + dérivation + bloc toujours rendu (y compris vide) + FAB.
  [`app/(accueil)/page.tsx:167`](../../app/(accueil)/page.tsx#L167)

- FAB seul (pas de bloc liste sur cette page).
  [`app/edt/page.tsx:96`](../../app/edt/page.tsx#L96)

**Peripherals**

- Test de régression : échéance "2026-02-30" rejetée.
  [`actions/homework.test.ts:108`](../../actions/homework.test.ts#L108)
