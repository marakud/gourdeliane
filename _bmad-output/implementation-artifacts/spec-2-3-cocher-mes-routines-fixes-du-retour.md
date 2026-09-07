---
title: 'Story 2.3 — Cocher mes routines fixes du retour'
type: 'feature'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'a4cd3dc0cd8386f9b679b2083ba0487c58ec0d93'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rien ne rappelle encore à l'enfant les vérifications fixes du retour (sortir le carnet/mot, ranger le sac, devoirs faits) -- mécanisme identique à "Ce matin" (Story 2.2), juste un second type de checklist fixe.

**Approach:** Réutiliser tel quel le modèle `FixedChecklistItem`/`ChecklistItemState` posé en Story 2.2, avec `checklistType="RETOUR"` et ses propres défauts. Généraliser `components/checklist/fixed-checklist.tsx` et `fixed-items-manager.tsx` (déjà quasi génériques) pour accepter les Server Actions en props plutôt que de dupliquer ces composants -- deuxième consommateur, le moment de factoriser. Afficher "Retour" sur Accueil (sous Matin) et sa gestion dans Réglages.

## Boundaries & Constraints

**Always:**
- Même mécanisme exact que Matin (Story 2.2) : `checklistType="RETOUR"`, liste plate, pré-remplissage des défauts (sortir le carnet/mot, ranger le sac, devoirs faits) à la toute première consultation via `FixedChecklistDefaultsSeed`, jamais recréés après suppression totale.
- La checklist du retour porte sur **aujourd'hui**, exactement comme Matin (AD-4). Le reset quotidien est automatique (nouvelle `date`).
- `components/checklist/fixed-checklist.tsx` et `fixed-items-manager.tsx` deviennent paramétrables (Server Action de cochage/CRUD passée en prop) plutôt que dupliqués -- Matin (Story 2.2) doit continuer de fonctionner sans régression après cette généralisation.
- Toute mutation passe par une Server Action dans `actions/` ; toute dérivation vit dans `domain/`, pure (réutilise `deriveFixedChecklist` tel quel).
- Plancher d'accessibilité déjà en place (tap ≥44px, texte ≥16px, jamais la seule couleur pour un état coché).

**Ask First:** Aucune.

**Never:** Implémenter Révisions/Devoirs ou l'écran "Ce soir" à 3 blocs (stories suivantes). Dupliquer `fixed-checklist.tsx`/`fixed-items-manager.tsx` en copies quasi identiques -- généraliser, pas copier-coller.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Première consultation, aucun item Retour | Aucun `FixedChecklistItem` "RETOUR" | Liste par défaut créée et affichée, décochée | N/A |
| Nouveau jour scolaire | Items Retour cochés hier | Tous décochés (nouvelle `date`) | N/A |
| Matin et Retour cochés indépendamment | Deux checklists sur Accueil | Cocher un item Matin n'affecte jamais l'état de Retour (types distincts) | N/A |
| Généralisation des composants | `FixedChecklist`/`FixedItemsManager` réutilisés pour Retour | Matin continue de fonctionner sans changement de comportement visible | N/A |

</frozen-after-approval>

## Code Map

- `domain/checklist.ts` -- ajouter `CHECKLIST_TYPE_RETOUR`, `DEFAULT_RETOUR_ITEMS` (`deriveFixedChecklist` déjà générique, réutilisé tel quel)
- `actions/checklist.ts` -- ajouter `createRetourChecklistItem`, `toggleRetourChecklistItem` (même schéma que leurs équivalents Matin, Story 2.2) ; `updateFixedChecklistItem`/`deleteFixedChecklistItem` déjà génériques (scopés par `id`, pas par type), réutilisés tels quels pour Retour
- `components/checklist/fixed-checklist.tsx` -- accepte la Server Action de cochage en prop au lieu d'appeler `toggleMatinChecklistItem` en dur
- `components/checklist/fixed-items-manager.tsx` -- accepte la Server Action de création en prop au lieu d'appeler `createFixedChecklistItem` en dur (`updateFixedChecklistItem`/`deleteFixedChecklistItem` restent des imports directs, déjà génériques)
- `app/(accueil)/page.tsx` -- ajoute le bloc "Retour" sous "Ce matin", passe les bonnes actions en props aux deux instances de `FixedChecklist`
- `app/reglages/page.tsx` -- ajoute la section de gestion des items Retour, passe `createRetourChecklistItem` en prop

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma`, `prisma/production/schema.prisma` -- aucun changement de schéma attendu (réutilise `FixedChecklistItem`/`ChecklistItemState`/`FixedChecklistDefaultsSeed` de la Story 2.2) -- confirmé, aucune modification nécessaire
- [x] `domain/checklist.ts` -- constantes RETOUR, avec tests unitaires (mêmes cas que Matin, `checklistType` différent)
- [x] `actions/checklist.ts` -- `createRetourChecklistItem`, `toggleRetourChecklistItem`, avec tests d'intégration
- [x] `components/checklist/fixed-checklist.tsx`, `fixed-items-manager.tsx` -- généralisation par props, vérifiée sans régression sur Matin
- [x] `app/(accueil)/page.tsx`, `app/reglages/page.tsx` -- bloc Retour ajouté -- couvre FR-8
- [x] Vérification manuelle responsive -- mobile/tablette, tap ≥44px

**Acceptance Criteria:**
- Given aucun item personnalisé, when j'ouvre "Retour" pour la première fois, then je vois la liste par défaut (sortir le carnet/mot, ranger le sac, devoirs faits), personnalisable dans Réglages
- Given la checklist du retour cochée hier, when un nouveau jour scolaire commence, then elle apparaît entièrement décochée
- Given les blocs Matin et Retour tous deux affichés sur Accueil, when je coche un item de l'un, then l'état de l'autre n'est pas affecté

## Spec Change Log

Aucun écart au Code Map. La généralisation de `fixed-checklist.tsx`/`fixed-items-manager.tsx` s'est faite exactement comme prévu : `FixedChecklist` reçoit désormais `headingId` (un `id` de `<h2>` unique par instance, nécessaire pour que `aria-labelledby` reste valide avec deux blocs sur Accueil -- pas explicitement dans le Code Map mais requis mécaniquement dès qu'un deuxième bloc apparaît sur la même page) et `onToggle` (la Server Action de cochage) en props ; `FixedItemsManager` reçoit `createAction` en prop. `updateFixedChecklistItem`/`deleteFixedChecklistItem` sont restées des imports directs dans `fixed-items-manager.tsx`, comme prévu (déjà scopées par `id`, pas par `checklistType`).

**Revue (3-layer, itération 1) :** 4 correctifs réels appliqués (aucun ne touche le Code Map ni les Boundaries) :
- `app/(accueil)/page.tsx` -- les requêtes Matin et Retour (`listFixedChecklistItems`/`listChecklistItemStates`) étaient dans deux `Promise.all` séquentiels ; batchées en un seul (indépendantes entre elles) pour éviter un aller-retour DB supplémentaire.
- `components/checklist/fixed-items-manager.tsx` -- les deux instances "Ce matin"/"Retour" de `AddFixedItemForm` partageaient le même `aria-label="Nouvel item"`, rendant les deux formulaires indistinguables au lecteur d'écran ; le `title` de la section est maintenant propagé jusqu'au champ (`aria-label={`Nouvel item (${title})`}`).
- `components/checklist/fixed-items-manager.tsx` -- `CreateFixedChecklistItemAction` dupliquait la forme de `FixedChecklistItemFormInput` (déjà exportée par `actions/checklist.ts`) au lieu de la réutiliser, inconsistant avec `ToggleFixedChecklistItemAction` (qui dérive bien de `ToggleChecklistItemInput` via `Omit`) ; corrigé pour réutiliser le type exporté.
- `actions/checklist.test.ts` -- ajout d'un test manquant symétrique au test d'indépendance déjà présent pour `toggleRetourChecklistItem` : vérifie que `createRetourChecklistItem` ne fait pas apparaître son item dans `listFixedChecklistItems(..., CHECKLIST_TYPE_MATIN, ...)`.

4 constats réels mais hors-scope (aucune régression, aucun critère d'acceptation concerné) loggés dans `deferred-work.md` : validation de paire `checklistType`/`sourceType` sur `toggleChecklistItem` (allow-lists indépendantes, pattern hérité de la Story 2.2) ; actions Matin/Retour dupliquées plutôt que génériques (même choix assumé qu'en 2.2, à reconsidérer si une 3e checklist fixe apparaît) ; `deriveFixedChecklist` fait confiance par convention au pré-filtrage `checklistType` de l'appelant ; absence de tests de rendu page/composant dans le repo (aucun test n'aurait détecté un prop `onToggle`/`createAction`/`headingId` inversé entre les deux instances -- vérifié manuellement ligne à ligne que le câblage actuel est correct).

Vérification indépendante (relecture complète des fichiers changés + re-exécution locale de `npx vitest run`/`npx tsc --noEmit`/`npm run lint`/`npm run build`, 3 subagents de revue en parallèle) menée séparément de la session d'implémentation -- résultats identiques à ceux rapportés ci-dessus, plus les 4 correctifs listés.

## Design Notes

Pas de nouveau modèle de données pour cette story -- `FixedChecklistItem`/`ChecklistItemState`/`FixedChecklistDefaultsSeed` (Story 2.2) sont déjà scopés par `checklistType`, conçus explicitement pour ce réemploi. Le seul travail structurel est la généralisation des deux composants d'affichage/gestion, jusqu'ici couplés en dur à Matin.

## Verification

**Commands:**
- `npx vitest run` -- expected: tests domain/actions passent, y compris ceux de Matin (non-régression)
- `npm run build`, `npx tsc --noEmit`, `npm run lint` -- expected: aucune erreur

**Résultats (session d'implémentation) :**
- `npx vitest run` -- OK, 62/62 tests passent (`domain/checklist.test.ts` 19 dont 4 nouveaux pour Retour, `actions/checklist.test.ts` 7 dont 4 nouveaux pour `toggleRetourChecklistItem`/`createRetourChecklistItem`, `data/checklist.test.ts` 4, `domain/schedule.test.ts` 18, `domain/school-day.test.ts` 12 -- tous les tests Matin existants toujours verts, non-régression confirmée).

**Résultats (revue indépendante, itération 1, après les 4 correctifs) :**
- `npx vitest run` -- OK, 63/63 tests passent (+1 test d'isolation `createRetourChecklistItem` vs liste MATIN).
- `npx tsc --noEmit` -- OK, aucune erreur.
- `npm run lint` -- OK, aucune erreur.
- `npm run build` -- OK, `/` et `/reglages` toujours `ƒ (Dynamic)`.
- Vérifié dans le navigateur (dev server + Browser pane) : Accueil affiche "Ce matin" (1/5) et "Retour" (0/3 puis 1/3 après clic sur "Sortir le carnet/mot", Matin resté 1/5 -- indépendance confirmée) ; état persistant après rechargement complet de page ; Réglages affiche les deux formulaires "Nouvel item (Ce matin)"/"Nouvel item (Retour)" désormais distinguables au lecteur d'écran.
- `npx tsc --noEmit` -- OK, aucune erreur.
- `npm run lint` -- OK, aucune erreur.
- `npm run build` -- OK, `/` et `/reglages` toujours `ƒ (Dynamic)`.
- Vérifié manuellement dans le navigateur (dev server + Browser pane) : Accueil affiche "Ce matin" (1/5, données existantes) et "Retour" (0/3, défauts "Sortir le carnet/mot"/"Ranger le sac"/"Devoirs faits") ; cocher "Sortir le carnet/mot" passe Retour à 1/3 sans toucher Matin (resté 1/5) ; l'état coché persiste après rechargement de page ; dans Réglages, ajouter "Casquette" à la section Retour l'affiche immédiatement sur Accueil sous Retour sans affecter la liste Matin, puis suppression confirmée retirée des deux écrans ; testé en viewport tablette (768px) sans régression visuelle, tap targets ≥44px conservés (composants inchangés visuellement, seule la plomberie des props a changé).

**Manual checks (if no CLI):**
- Ouvrir Accueil, vérifier les deux blocs Matin et Retour avec leurs défauts respectifs
- Cocher un item de chaque bloc, vérifier qu'ils sont indépendants et persistent après rechargement
- Ajouter/modifier/supprimer un item Retour dans Réglages, vérifier que Matin n'est pas affecté
