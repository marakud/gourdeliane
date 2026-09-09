---
title: 'Story 2.7 — Voir ma soirée organisée en 3 blocs et savoir quand elle est terminée'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'b8db9655c6698dfb772baafc43d303f7bb5aab32'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les 3 blocs du soir (Sac, Devoirs à faire, Révisions du jour) vivent aujourd'hui comme des cartes distinctes, séparées visuellement par "Ce matin"/"Retour" sur la même page -- rien n'indique à l'enfant qu'ils forment un seul "moment", et rien ne signale quand la soirée est entièrement traitée (FR-20).

**Approach:** Regrouper Sac + Devoirs à faire + Révisions du jour dans une seule "moment card" visuelle sur Accueil, cochables dans n'importe quel ordre. La complétude ("Sac et Révisions entièrement cochés, et tout devoir 'à rendre' échéant demain marqué fait") est calculée côté serveur -- jamais recalculée indépendamment côté client (AD-5) -- et persistée dans une nouvelle table `DayCompletion` (base du futur Streak, Epic 4, pas construit ici). Une transition incomplet -> complet déclenche une célébration courte ("Soirée prête !", < 1,5s, non bloquante).

## Boundaries & Constraints

**Always:**
- Sac, Devoirs à faire et Révisions du jour vivent dans UNE seule carte visuelle ("Ce soir"), pas 3 cartes top-level séparées -- cochables dans n'importe quel ordre (déjà vrai techniquement, à préserver visuellement).
- La complétude ("soir complet") est calculée par une fonction pure `domain/day-completion.ts::computeSoirCompletion`, réutilisée à l'identique pour (a) l'affichage initial de la page et (b) la persistance côté serveur après chaque coche pertinente -- jamais deux implémentations distinctes qui pourraient diverger (AD-5).
- Règle de complétude (epics 2.7 AC, PRD FR-20 + §9 assumption confirmée) : Sac trivialement-ou-réellement complet (aucun objet, ou tous cochés) ET Révisions trivialement-ou-réellement complet ET tout devoir "à rendre" dont l'échéance est demain est marqué fait. Un devoir sans échéance, ou dont l'échéance est plus lointaine, non fait, ne bloque JAMAIS la complétude.
- Chaque coche pertinente (item Sac, item Révisions, devoir marqué fait/pas fait) persiste l'état recalculé dans `DayCompletion` (moment="SOIR", date=aujourd'hui) via un upsert -- jamais un compteur incrémenté directement par une action cliente (AD-5).
- La célébration ne se déclenche que sur la transition incomplet -> complet observée pendant la session en cours (jamais au premier rendu si la soirée était déjà complète avant l'ouverture de l'app -- pas de rejeu de l'animation à chaque ouverture).
- Jour sans cours demain (Sac vide) : le bloc Sac affiche son message neutre existant à l'intérieur de la moment card (pas de carte masquée entièrement) -- Devoirs à faire et Révisions du jour restent actifs normalement (cas limite Flow 1, EXPERIENCE.md).
- "Devoirs à faire" à l'intérieur de la moment card = le bloc "Devoirs" existant tel quel (création/édition/suppression/coche, tous les devoirs visibles y compris déjà faits) -- aucun changement de comportement, seulement un déplacement visuel dans la nouvelle carte.

**Ask First:** Aucune.

**Never:**
- Construire l'écran de progression, le compteur de Streak affiché, ou les badges (Epic 4) -- cette story persiste uniquement la complétude par moment/jour, sans jamais l'agréger ni l'afficher comme un Streak.
- Étendre la persistance `DayCompletion` aux moments "MATIN"/"RETOUR" dans cette story (le modèle prévoit ces valeurs pour plus tard, mais Matin/Retour ne sont ni recalculés ni persistés ici -- hors périmètre des AC de 2.7).
- Modifier la sémantique de persistance des devoirs (FR-17, inchangée) ou le comportement déjà amendé de la liste "Devoirs" (Story 2.4).
- Bloquer l'enfant avec un écran de célébration qui empêche la suite de l'usage (DESIGN.md, UX-DR non-culpabilisant) -- toast/bannière courte et non modale uniquement.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sac+Révisions+devoirs à rendre demain tous traités, dans n'importe quel ordre | Dernière coche | Célébration "Soirée prête !" affichée une fois ; `DayCompletion` (SOIR, aujourd'hui) upserted `complete=true` | N/A |
| Devoir sans échéance non fait, tout le reste coché | -- | Soirée quand même considérée complète (PRD §9 confirmée) | N/A |
| Devoir "à rendre" échéant après-demain (pas demain), non fait, tout le reste coché | -- | Soirée quand même complète (seul "demain" compte) | N/A |
| Décoche un item après complétude | Sac ou Révisions décoché, ou devoir démarqué "fait" | `complete` repasse à `false`, `DayCompletion` mis à jour -- aucune "décélébration" nécessaire | N/A |
| Réouverture de l'app un soir déjà complété plus tôt dans la session | Rendu initial avec `complete=true` | Etat "complet" affiché directement (ex. bandeau statique), PAS de rejeu de l'animation de célébration | N/A |
| Demain est un jour sans cours (Sac vide) | `sacGroups` vide | Bloc Sac affiche son message neutre existant dans la carte ; Devoirs/Révisions restent actifs ; Sac compte comme trivialement complet pour le calcul global | N/A |
| Aujourd'hui est aussi un jour sans cours (Révisions vide) en plus de Sac vide et aucun devoir à rendre demain | Tous les sous-blocs triviaux | `complete=true` dès le rendu initial, sans qu'aucune coche n'ait eu lieu -- aucune animation (rien n'a été "coché" pour la déclencher) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` + `prisma/production/schema.prisma` -- nouveau modèle `DayCompletion` (id/userId/date/moment: String ("SOIR", "MATIN"/"RETOUR" réservés pour plus tard)/complete: Boolean/updatedAt), `@@unique([userId, date, moment])`, même convention que `ChecklistItemState`. Migration Prisma (dev + déployée en prod via `build:vercel`).
- `domain/day-completion.ts` (nouveau) -- `CHECKLIST_MOMENT_SOIR = "SOIR"` ; fonction pure `computeSoirCompletion({ sacGroups, revisionsItems, devoirsARendreDemain })` : booléen, réutilisée par l'affichage (page.tsx) ET par la persistance (data layer), jamais deux implémentations (AD-5).
- `data/day-completion.ts` (nouveau) -- `upsertDayCompletion(userId, date, moment, complete)` ; `recomputeAndPersistSoirCompletion(userId, now)` : reconstitue l'état nécessaire (EDT demain/aujourd'hui, Sac, Révisions, devoirs à rendre demain) via les fonctions data/domain déjà existantes et testées, appelle `computeSoirCompletion`, upsert, retourne `{ complete, justCompleted }` (comparé à l'état précédent en base).
- `actions/checklist.ts` -- `toggleChecklistItem` appelle `recomputeAndPersistSoirCompletion` (fire-and-forget bookkeeping, pas retourné à l'UI) quand `checklistType` résolu est SAC ou REVISIONS.
- `actions/homework.ts` -- `toggleDevoirDoneAction` appelle `recomputeAndPersistSoirCompletion` de la même façon.
- `app/(accueil)/page.tsx` -- calcule `soirComplete` via `computeSoirCompletion` à partir des données déjà chargées (sacGroups, revisionsChecklist, devoirsView filtré à-rendre+demain) -- aucune requête DB supplémentaire pour l'affichage. Restructuration JSX : `SacChecklist`, `DevoirsList` (+ `AddHomeworkFab`, inchangé côté position fixe) et `RevisionsChecklist` déplacés à l'intérieur d'un nouveau wrapper `MomentSoirCard`.
- `components/moment/moment-soir-card.tsx` (nouveau) -- wrapper client, prop `complete: boolean` ; `useRef`+`useEffect` détecte la transition `false -> true` pendant la session (jamais au montage initial) et affiche une bannière/toast "Soirée prête !" auto-masquée après ~1,5s ; affiche un état "complet" statique (sans animation) quand `complete` est déjà `true`.

## Tasks & Acceptance

**Execution:**
- [ ] `prisma/schema.prisma` + `prisma/production/schema.prisma` + migration -- modèle `DayCompletion`
- [ ] `domain/day-completion.ts` + `domain/day-completion.test.ts` -- `computeSoirCompletion` pure, I/O matrix ci-dessus
- [ ] `data/day-completion.ts` -- `upsertDayCompletion`, `recomputeAndPersistSoirCompletion`
- [ ] `actions/checklist.ts`, `actions/homework.ts` -- branchement de la persistance (SAC/REVISIONS toggle, devoir done toggle)
- [ ] `components/moment/moment-soir-card.tsx` -- wrapper + célébration (transition uniquement, jamais au montage)
- [ ] `app/(accueil)/page.tsx` -- calcul de `soirComplete`, restructuration JSX (une seule moment card pour Sac+Devoirs+Révisions)
- [ ] Vérification manuelle : cocher le dernier élément dans n'importe quel ordre -> célébration ; jour sans cours demain -> Sac neutre dans la carte, reste actif ; devoir sans échéance non fait n'empêche pas la complétude ; réouverture après complétude -> pas de rejeu d'animation ; décoche -> complete repasse à false

**Acceptance Criteria:** (reprises d'epics.md Story 2.7, ci-dessus)

## Spec Change Log

- **Post-review :** le Code Map (ligne 56) nommait la constante `CHECKLIST_MOMENT_SOIR` ; le code exporte `DAY_COMPLETION_MOMENT_SOIR` (cohérent avec le fichier `domain/day-completion.ts` qui la porte, plutôt que le nom `checklist`-préfixé initialement envisagé). Nom différent, comportement identique -- correction de la référence uniquement.
- **Post-review :** `recomputeAndPersistSoirCompletion` ne retourne finalement que `{ complete }`, pas `{ complete, justCompleted }` comme prévu au Code Map -- la détection de la transition pour la célébration vit entièrement côté `MomentSoirCard` (comparaison de l'ancien/nouveau `complete` reçu en prop, rafraîchi par le `revalidatePath` déjà appelé par chaque action), donc `justCompleted` côté serveur se serait avéré un calcul mort (rien ne le consomme). Retiré plutôt que gardé inutilisé.
- **Post-review (3-layer adversarial review) :** l'appel à `recomputeAndPersistSoirCompletion` vivait initialement dans le même bloc `try` que la mutation principale (`upsertChecklistItemState`/`toggleDevoirDone`) -- un bug dans ce recalcul aurait fait échouer `{ ok: false }` une coche/bascule pourtant déjà enregistrée avec succès, contredisant le Code Map lui-même ("fire-and-forget bookkeeping, pas retourné à l'UI") et contredisant la convention déjà établie de `safeRevalidate` dans les mêmes fichiers. Corrigé : extrait dans un `safeRecomputeSoirCompletion` qui avale ses propres erreurs, appelé après le retour `{ ok: true }` déjà décidé.

## Design Notes

- Les trois composants regroupés (`SacChecklist`, `DevoirsList`, `RevisionsChecklist`) ont perdu leur propre `<section aria-labelledby>`/carte visuelle (`rounded-2xl bg-card ring-1 ring-border`) -- ils redeviennent de simples `<div>` visuellement, `MomentSoirCard` porte désormais la seule carte/landmark visible pour les trois. Leurs titres restent des `<h3>` (déjà abaissés depuis `<h2>` lors de Story 2.6/2.4 pour ce même regroupement) ; le sous-titre "Devoirs pour demain" (dans `SacChecklist`) est descendu à `<h4>` pour rester cohérent avec la hiérarchie (correctif de revue).
- `computeSoirCompletion` traite un devoir "à rendre" échéant demain comme exigeant DEUX cases indépendantes quand sa matière a cours demain : l'objet injecté dans le Sac (Story 2.5, "préparé") ET `Devoir.done` (Story 2.4, "fait"). Ni l'une ni l'autre seule ne suffit -- documenté explicitement dans le docstring de `computeSoirCompletion` et testé (`domain/day-completion.test.ts`, `data/day-completion.test.ts`) suite à une observation de revue (ce n'était pas explicite dans l'I/O matrix initiale, bien que déjà la conséquence logique du design existant de Story 2.5).
- `recomputeAndPersistSoirCompletion` relit sa propre ligne `User` par le `userId` reçu en paramètre (`prisma.user.findUniqueOrThrow`) plutôt que de rappeler `ensureSeedUser()` -- l'app n'a qu'un seul utilisateur aujourd'hui donc les deux coïncident toujours, mais rappeler `ensureSeedUser()` aurait ignoré silencieusement le `userId` déjà résolu par l'appelant (correctif de revue).

## Verification

**Commands:**
- `npx vitest run domain/day-completion.test.ts` -- expected: nouvelle logique de complétude couverte
- `npm run build` / `npx tsc --noEmit` / `npx eslint .` -- expected: aucune erreur
- `npx prisma migrate dev` (dev.db) -- expected: migration `DayCompletion` appliquée sans erreur

**Manual checks (if no CLI):**
- Cocher Sac, Révisions et le(s) devoir(s) à rendre demain dans un ordre quelconque -> célébration "Soirée prête !" à la dernière coche
- Vérifier en base (`prisma.dayCompletion.findFirst`) que la ligne SOIR/aujourd'hui passe à `complete=true`
- Décocher un item -> `complete` repasse à `false` en base, pas de célébration
- Jour sans cours demain -> bloc Sac neutre dans la carte, Devoirs/Révisions actifs
- Recharger la page après complétude -> état complet affiché sans rejouer l'animation

**Résultats (session d'implémentation) :**

- `npx vitest run` -- 197 tests passent (domain/day-completion.test.ts : 11, data/day-completion.test.ts : 5 nouveaux ; le reste de la suite inchangée).
- `npx tsc --noEmit` -- aucune erreur.
- `npx eslint .` -- aucune erreur.
- `npm run build` -- build de production réussi.
- Vérification manuelle en conditions réelles (dev.db) via le navigateur :
  - Trois sous-blocs (Sac, Devoirs à faire, Révisions) affichés dans une seule carte "Ce soir", cochables dans n'importe quel ordre.
  - Coché Sac + Révisions + les deux devoirs "à rendre" échéant demain (Devoirs à faire ET leur objet Sac) -> badge "Soirée prête !" apparu avec l'animation d'apparition.
  - Rechargement de la page avec la soirée déjà complète -> badge affiché directement, sans rejeu de l'animation (confirmé visuellement, deux captures consécutives).
  - Décoché un item -> badge disparu ; `DayCompletion` (SOIR, aujourd'hui) vérifié en base : `complete=false` puis `complete=true` après recoché.
  - Retesté le chemin heureux d'un toggle Sac après le correctif du `try/catch` (safeRecomputeSoirCompletion) -- coche/décoche toujours fonctionnelles, aucune régression.
- 3-layer adversarial review (blind-hunter, edge-case-hunter, verification-gap) exécutée en parallèle sur le diff complet (809 lignes). Corrigé : le recalcul de complétude partageait le `try/catch` de la mutation principale (risque de "phantom exception" -- une coche réussie signalée comme échouée), `recomputeAndPersistSoirCompletion` rappelait `ensureSeedUser()` au lieu de relire `userId`, absence totale de test pour la couche de persistance (`data/day-completion.test.ts` créé, 5 cas dont le scénario à deux cases indépendantes), hiérarchie de titres incohérente après le regroupement visuel (`<h2>`→`<h3>` sans descendre le sous-titre imbriqué), landmarks ARIA redondants (4 `<section>` imbriquées pour une seule carte visuelle), type `moment: string` non contraint, pollution de `DayCompletion` sur la vraie base par les tests d'action (nettoyage ajouté). Différé vers `deferred-work.md` (hors périmètre de cette story ou risque déjà accepté ailleurs) : absence de ligne `DayCompletion` pour une soirée complète sans aucune coche (écrire depuis le rendu serait un anti-pattern Next.js), lectures-puis-écriture non transactionnelles dans `recomputeAndPersistSoirCompletion` (fenêtre de course étroite, catégorie de risque déjà acceptée ailleurs), `createDevoirAction`/`updateDevoirAction`/`deleteDevoirAction` ne recalculant pas (limite de périmètre explicite du Code Map), absence de test de rendu pour `MomentSoirCard` (gap déjà loggé pour tout le repo).

**Confirmé en production par l'utilisateur ("ca marche").**

## Suggested Review Order

1. `domain/day-completion.ts` -- `computeSoirCompletion` (logique pure, testée, y compris la règle des deux cases indépendantes)
2. `domain/day-completion.test.ts` -- I/O matrix
3. `data/day-completion.ts` -- `recomputeAndPersistSoirCompletion` (reconstitue l'état réel, upsert)
4. `data/day-completion.test.ts` -- couverture d'intégration contre la vraie base
5. `actions/checklist.ts`, `actions/homework.ts` -- branchement (`safeRecomputeSoirCompletion`, jamais dans le `try` de la mutation principale)
6. `components/moment/moment-soir-card.tsx` -- détection de transition + célébration
7. `app/(accueil)/page.tsx` -- calcul de `soirComplete`, restructuration JSX
8. `components/checklist/sac-checklist.tsx`, `revisions-checklist.tsx`, `components/homework/devoirs-list.tsx` -- dépouillement de la carte/landmark propre, hiérarchie de titres
