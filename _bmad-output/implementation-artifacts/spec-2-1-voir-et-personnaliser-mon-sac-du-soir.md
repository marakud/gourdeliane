---
title: 'Story 2.1 — Voir et personnaliser mon sac du soir'
type: 'feature'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: '3469caab5d57d72983786c3d735b8d628f695b2e'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'écran Accueil n'est qu'une coquille vide (Story 1.1) -- rien ne dit encore à l'enfant quoi préparer pour demain, alors que c'est le cœur différenciant du produit.

**Approach:** Ajouter un modèle `SubjectItem` (objets par défaut par matière, gérables dans Réglages) et `ChecklistItemState` (état coché, clé par identité stable, AD-3), une couche `domain/checklist.ts` qui dérive en direct la checklist du sac à partir de l'EDT de demain (AD-2 -- jamais stockée), et afficher ce bloc "Sac pour demain" sur l'écran Accueil avec case à cocher par objet.

## Boundaries & Constraints

**Always:**
- Le contenu du sac est calculé à la lecture à partir de `ScheduleSlot`/`Subject` de demain + `SubjectItem`, jamais persisté comme liste générée à l'avance (AD-2).
- L'état coché (`ChecklistItemState`) est keyé par `(userId, date, checklistType="SAC", sourceType="SUBJECT_ITEM", sourceId=SubjectItem.id)` -- jamais par le libellé de l'objet (AD-3, FR-5) : éditer le libellé d'un `SubjectItem` ne doit jamais faire perdre son état coché tant que son `id` ne change pas.
- "Demain" est le jour calendaire suivant déjà calculé par `domain/school-day.ts` (Story 1.3, AD-4) -- réutilisé tel quel, jamais recalculé différemment ici.
- Si demain est "sans cours" (ou n'a aucun créneau), aucune checklist n'est générée -- message neutre, pas de liste vide (UX-DR10, cohérent avec Story 1.3).
- Objets groupés par matière avec la pastille de couleur de la matière (`SubjectTag` déjà existant, réutilisé tel quel, UX-DR3/UX-DR7).
- Éditer/ajouter/supprimer un `SubjectItem` dans Réglages s'applique à toutes les occurrences futures de cette matière (FR-4) -- ne modifie jamais un `ChecklistItemState` existant directement.
- Toute mutation passe par une Server Action dans `actions/` (`{ ok, data } | { ok, error }`, AD-1) ; toute dérivation vit dans `domain/`, pure.
- Plancher d'accessibilité déjà en place (tap ≥44px, texte ≥16px, jamais la seule couleur pour un état coché).

**Ask First:** Aucune.

**Never:** Stocker une copie de "la checklist du sac du 14/10" (AD-2). Implémenter Matin/Retour/Révisions/Devoirs ou l'écran "Ce soir" à 3 blocs (stories 2.2-2.7). Réinitialiser automatiquement `ChecklistItemState` (pas de cron dans cette story -- la réinitialisation quotidienne du sac vient du fait que la date change, pas d'un job).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Demain a des matières avec objets définis | `ScheduleSlot` demain + `SubjectItem` par matière | Checklist groupée par matière, pastilles de couleur, décochée par défaut | N/A |
| Matière sans `SubjectItem` défini | `ScheduleSlot` demain, matière sans objet | La matière apparaît sans objet à cocher (pas d'erreur) | N/A |
| Demain "sans cours" ou sans créneau | `NoSchoolDay` ou jour de semaine vide | Message neutre, pas de checklist | N/A |
| Cocher/décocher un objet | Tap sur une case | `ChecklistItemState` créé/mis à jour immédiatement, persiste après rechargement | `{ ok: false, error }` si échec |
| Édition du libellé d'un `SubjectItem` déjà coché ce soir | Objet coché, puis libellé modifié dans Réglages | L'état coché survit (même `sourceId`) | N/A |
| Ajout d'un nouvel objet à une matière après avoir déjà coché le sac | Nouveau `SubjectItem` créé | Apparaît décoché au prochain chargement, les autres gardent leur état | N/A |
| Suppression d'un `SubjectItem` déjà coché | Objet supprimé de Réglages | Disparaît de la checklist ; son `ChecklistItemState` orphelin n'est pas activement purgé (simplement plus rendu, AD-3) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` + `prisma/production/schema.prisma` (+ migrations séparées, leçon Story 1.1) -- ajouter `SubjectItem` (id, userId, subjectId, label) et `ChecklistItemState` (id, userId, date, checklistType, sourceType, sourceId, checked, `@@unique([userId, date, checklistType, sourceType, sourceId])`)
- `domain/checklist.ts` (nouveau) -- fonction pure `deriveSacChecklist(subjectsWithItemsForTomorrow, checkedStates)` : groupe par matière, croise avec l'état coché existant par `sourceId`
- `data/checklist.ts` (nouveau) -- requêtes : lister `SubjectItem` d'un user (avec matière), lister `ChecklistItemState` pour une date/type donnés, upsert d'un état coché, CRUD `SubjectItem`
- `actions/checklist.ts` (nouveau) -- Server Actions : `toggleChecklistItem`, `createSubjectItem`, `updateSubjectItem`, `deleteSubjectItem`
- `app/(accueil)/page.tsx` -- remplace la coquille par le bloc "Sac pour demain" : calcule demain (réutilise `domain/school-day.ts`), charge et affiche la checklist dérivée
- `app/reglages/page.tsx` -- remplace la coquille par la gestion des objets par matière (liste des matières existantes, ajout/édition/suppression de leurs `SubjectItem`)
- `components/checklist/` (nouveau dossier probable) -- composant checklist item (case à cocher circulaire + pastille + libellé), section Sac sur Accueil, formulaire objets par matière dans Réglages

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma`, `prisma/production/schema.prisma` -- ajouter `SubjectItem`/`ChecklistItemState`, migrations dev + prod -- pose le modèle de données
- [x] `domain/checklist.ts` -- dérivation pure de la checklist sac, avec tests unitaires -- couvre la matrice I/O
- [x] `data/checklist.ts`, `actions/checklist.ts` -- CRUD `SubjectItem` + cochage en Server Actions -- couvre AD-1
- [x] `app/(accueil)/page.tsx`, `components/checklist/*` -- bloc Sac réel sur Accueil -- couvre FR-3, FR-5, UX-DR3/UX-DR7
- [x] `app/reglages/page.tsx` -- gestion des objets par matière -- couvre FR-4
- [x] Vérification manuelle responsive -- mobile/tablette, tap ≥44px

**Acceptance Criteria:**
- Given demain j'ai des matières dans mon EDT, when j'ouvre l'Accueil, then je vois les objets par défaut associés à chaque matière, groupés avec pastille de couleur
- Given la liste d'objets d'une matière, when j'ajoute/modifie/supprime un objet dans Réglages, then la modification s'applique à toutes les occurrences futures de cette matière
- Given la checklist affichée, when je coche/décoche un objet, then l'état se met à jour immédiatement et reste keyé par l'objet, pas par son libellé
- Given demain est "sans cours", when j'ouvre l'Accueil, then aucune checklist n'est générée, message neutre affiché
- Given l'EDT de demain modifié après avoir coché des objets, when je rouvre l'Accueil, then les objets encore valables gardent leur état, les nouveaux sont décochés, ceux disparus ne s'affichent plus

## Spec Change Log

## Design Notes

`ChecklistItemState.date` correspond à la date pour laquelle la checklist est préparée (demain), pas la date de consultation -- cohérent avec "je coche ce soir pour demain". Le `checklistType="SAC"` est prévu en toute lettre (pas juste "le seul type possible") car Matin/Retour/Révisions (stories suivantes) partageront ce même modèle avec des valeurs différentes -- AD-3 le précise explicitement.

**Revue post-implémentation (blind hunter / edge-case hunter / verification-gap) :** la déduplication des matières de demain (une matière peut avoir plusieurs créneaux le même jour) vivait en ligne dans `app/(accueil)/page.tsx`, sans test. Extraite en `domain/schedule.ts::dedupeSubjectsFromSlots`, testée indépendamment. Aucun test n'existait non plus pour l'idempotence de `upsertChecklistItemState` (le mécanisme central de cochage) -- ajouté dans `data/checklist.ts` en miroir du test déjà existant sur `setNoSchoolDay`. Le bouton de cochage jetait le flag `isPending` d'un `useTransition()` partagé par toute la liste, sans retour visuel ni protection contre un double-tap rapide sur le même item -- corrigé avec un `pendingId` par item.

**Bug d'infrastructure de test trouvé et corrigé pendant la revue :** l'ajout d'un second fichier de test d'intégration (`data/checklist.test.ts`, en plus de `data/schedule.test.ts`) a révélé que Vitest lance les fichiers de test en parallèle par défaut -- deux connexions SQLite concurrentes vers le même `dev.db` provoquaient des timeouts ("Operation has timed out" / "record not found" selon le fichier qui perdait la course). Corrigé en forçant `fileParallelism: false` dans `vitest.config.ts` ; les deux fichiers d'intégration utilisent déjà des `userId` synthétiques distincts, donc cette désactivation n'était nécessaire que pour éviter la contention SQLite, pas une histoire d'isolation logique.

## Verification

**Commands:**
- `npx vitest run` -- expected: tests de `domain/checklist.ts` couvrent la matrice I/O
- `npm run build`, `npx tsc --noEmit`, `npm run lint` -- expected: aucune erreur

**Résultats (session d'implémentation + revue) :**
- `npx vitest run` -- OK, 41/41 tests passent (`domain/checklist.test.ts` 8, `domain/schedule.test.ts` 18 dont 3 nouveaux pour `dedupeSubjectsFromSlots`, `domain/school-day.test.ts` 12, `data/schedule.test.ts` 2, `data/checklist.test.ts` 1 nouveau).
- `npm run build` -- OK, `/` et `/reglages` confirmés `ƒ (Dynamic)`.
- Vérifié manuellement : ajout de créneaux + objets, cochage avec persistance après rechargement, édition de libellé avec survie de l'état coché, suppression d'objet, jour "sans cours" -> message neutre.

**Manual checks (if no CLI):**
- Ajouter des créneaux demain avec des objets définis, vérifier l'affichage groupé par matière sur Accueil
- Cocher un objet, modifier son libellé dans Réglages, vérifier que l'état coché survit
- Marquer demain "sans cours", vérifier le message neutre sur Accueil

## Suggested Review Order

**Dérivation pure de la checklist (AD-2/AD-3)**

- Point d'entrée : croise chaque objet avec son état coché existant par `sourceId`, jamais par libellé.
  [`checklist.ts:66`](../../domain/checklist.ts#L66)

- Déduplication des matières de demain (plusieurs créneaux, même matière) -- extraite en `domain/` pendant la revue, testée indépendamment.
  [`schedule.ts:158`](../../domain/schedule.ts#L158)

**Persistance de l'état coché (clé stable, idempotente)**

- Upsert sur la clé composée `(userId, date, checklistType, sourceType, sourceId)` -- jamais un lookup par libellé.
  [`checklist.ts:72`](../../data/checklist.ts#L72)

**Rendre les pages dynamiques (sinon figées au build, cf. Story 1.3)**

- `connection()` sur Accueil et Réglages, même raison que `app/edt/page.tsx`.
  [`app/(accueil)/page.tsx:26`](../../app/(accueil)/page.tsx#L26)

**Cochage optimiste avec protection par item (ajouté pendant la revue)**

- `pendingId` désactive uniquement l'item en cours d'enregistrement (pas toute la liste) et empêche un double-tap concurrent sur le même item.
  [`sac-checklist.tsx:51`](../../components/checklist/sac-checklist.tsx#L51)

**Infrastructure de test (bug trouvé pendant la revue)**

- Deux fichiers de test d'intégration contre `dev.db` en parallèle provoquaient des timeouts SQLite -- corrigé par exécution séquentielle des fichiers.
  [`vitest.config.ts:15`](../../vitest.config.ts#L15)
