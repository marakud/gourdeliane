---
title: 'Story 2.4 — Noter et suivre mes devoirs'
type: 'feature'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 4
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'ddf868a9db5bfd3abc607c0ec863fdc7aa4a6024'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rien ne permet aujourd'hui à Léo de noter un devoir donné en classe et de le suivre jusqu'à ce qu'il soit fait -- aucun modèle `Devoir`, aucune saisie rapide, aucun affichage.

**Approach:** Nouveau modèle `Devoir` (matière + description obligatoires, "à rendre"/échéance/placement EDT optionnels, `done` qui ne se réinitialise jamais -- AD-7). Saisie via un FAB persistant (Accueil + EDT) ouvrant un modal de saisie rapide, fermé immédiatement après validation. Bloc "Devoirs" sur Accueil (toujours rendu, y compris vide) : chaque ligne affiche matière, échéance et jours restants, coche/décoche par tap (bidirectionnel, ne disparaît jamais), suppression explicite via une icône dédiée. Un devoir peut être programmé dans un trou libre de la semaine (lundi-dimanche, 8h-22h) ; il s'affiche alors en lecture seule dans "Aujourd'hui"/"Demain".

**Renégocié deux fois (retour utilisateur après déploiements production successifs) :**
1. L'itération initiale faisait disparaître un devoir coché de la liste (mécanisme calqué sur Matin/Retour). L'utilisateur a demandé l'inverse -- coché = reste visible, affiché comme fait -- plus un bouton supprimer, l'affichage matière/échéance/jours restants, et un rattachement à un créneau EDT existant.
2. Après avoir vu ce rattachement en production, l'utilisateur a précisé que l'objectif n'est PAS d'attacher un devoir à un cours existant, mais de le placer dans un trou LIBRE de la semaine ("il faut que les créneaux proposés soient des créneaux disponibles... placer ce créneau là où il y a de la dispo dans l'EDT"), sur toute la semaine (lundi-dimanche, 8h-22h), avec la possibilité de paramétrer l'heure précise. Le rattachement par `scheduleSlotId` (FK vers `ScheduleSlot`) a été entièrement abandonné et remplacé par un simple couple `plannedWeekday`/`plannedStartTime`, sans lien vers aucun créneau/cours.

Cette section reflète l'intent final (disponibilité), pas les intents intermédiaires.

## Boundaries & Constraints

**Always:**
- Création : matière + description seules obligatoires ; "à rendre", échéance et placement EDT restent optionnels, aucune validation ne les rend requis. Apparition immédiate dans "Devoirs", sans écran de confirmation.
- `Devoir.done` bascule bidirectionnellement par tap explicite (AD-7) -- aucune tâche planifiée ne le réinitialise ni ne purge la ligne ; un devoir fait reste affiché (coché), jamais retiré du rendu par un filtre.
- Suppression définitive uniquement via le bouton dédié (icône) -- jamais automatique, jamais liée à la bascule `done`.
- Bloc "Devoirs" toujours affiché sur Accueil, y compris vide -- jamais absent (contrairement à Sac). Vide → message positif ("Rien à faire ce soir, bravo !").
- Jamais de couleur d'alerte (rouge) liée à l'ancienneté ou à une échéance dépassée -- ton neutre/positif uniquement, aucune logique de retard/tri par urgence.
- Toute mutation passe par une Server Action dans `actions/homework.ts`, appelant une fonction pure de `domain/homework.ts`/`domain/schedule.ts` avant `data/homework.ts` (AD-1). Réutilise `SubjectTag` pour la pastille matière.
- Le placement EDT propose exclusivement de la disponibilité réelle : la fenêtre lundi-dimanche 8h-22h, moins les créneaux (cours) déjà posés ce jour-là -- jamais les créneaux eux-mêmes, jamais un simple rattachement à un cours existant. L'heure précise dans le trou choisi reste paramétrable par l'enfant (pas figée au début du trou).
- Un devoir programmé s'affiche en lecture seule dans "Aujourd'hui"/"Demain" (jamais nested sous un créneau puisqu'il n'y en a plus) -- indépendamment d'un jour marqué "sans cours" (le temps personnel programmé par l'enfant n'est pas annulé par un jour férié). Cocher/supprimer reste réservé au bloc "Devoirs" d'Accueil, jamais dupliqué dans l'EDT.
- FAB dupliqué sur Accueil et EDT (pas de layout partagé existant pour ces deux routes).
- `prisma/schema.prisma` et `prisma/production/schema.prisma` restent synchronisés manuellement ; toute migration de schéma requiert les deux migrations (dev sqlite + production postgres générée hors-ligne) ; une migration qui supprime une colonne contenant des données doit les préserver par un backfill plutôt que les perdre silencieusement.

**Ask First:** Aucune.

**Never:** Lier un devoir "à rendre" au sac du lendemain (Story 2.5). Écran "Ce soir" à 3 blocs (Story 2.7). Logique de retard/couleur d'alerte. Modifier la description/matière d'un devoir après création (seules `done` et la suppression sont mutables). Proposer un créneau déjà occupé par un cours comme "disponible".

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Création minimale | matière + description seules | Devoir créé, `aRendre=false`, `echeance=null`, `plannedWeekday=null`, visible immédiatement | Description vide → rejet, message d'erreur |
| Création avec échéance et placement | tous champs renseignés | Devoir créé avec ces valeurs, affiché avec échéance/jours-restants sur Accueil et dans "Devoirs programmés" en EDT le jour concerné | Échéance calendairement invalide (ex. 30 février), jour/heure invalide, ou heure hors 8h-22h → rejet |
| Devoir coché fait | Tap sur une ligne | `done=true`, ligne reste affichée (coché, mise à jour optimiste) | Échec réseau → annule l'optimisme |
| Devoir redécoché | Tap sur une ligne déjà faite | `done=false`, reste affichée (mise à jour optimiste) | Échec réseau → annule l'optimisme |
| Devoir supprimé | Tap sur l'icône supprimer | Ligne retirée du rendu, ligne supprimée en base définitivement | Échec réseau → réaffiche la ligne |
| Aucun devoir | Aucun devoir créé, ou tous supprimés | Bloc affiché avec message positif, jamais absent | N/A |
| Jour avec cours (trou partiel) | Une ou plusieurs `ScheduleSlot` ce jour-là | Sélecteur ne propose que les trous restants (avant/entre/après les cours), jamais les horaires de cours | N/A |
| Jour sans aucun cours | Aucune `ScheduleSlot` ce jour-là | Sélecteur propose la fenêtre 8h-22h entière comme un seul trou | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma`, `prisma/production/schema.prisma` -- modèle `Devoir` (id, userId+user Cascade, subjectId+subject Cascade, description, aRendre, echeance, done, createdAt, `plannedWeekday` `Weekday?`, `plannedStartTime` `String?` -- aucune FK, contrairement à l'itération précédente)
- `domain/schedule.ts` -- `TIME_PATTERN` exportée (`domain/schedule.ts:79`) ; `computeFreeGaps(daySlots, windowStart?, windowEnd?)` pure, trous libres d'UN jour, rogne les créneaux qui débordent la fenêtre (`domain/schedule.ts:204`, testé) ; `computeWeeklyFreeGaps(allSlots, ...)` -- même calcul pour les 7 jours (`domain/schedule.ts:238`, testé)
- `domain/homework.ts` -- `computeDaysRemaining(echeanceIso, todayIso)` pure (`domain/homework.ts:21`) ; `filterDevoirsForWeekday(devoirs, weekday)` pure, filtre + trie par `plannedStartTime` (`domain/homework.ts:58`, testé) -- remplace l'ancien `attachDevoirsToSlots` (basé sur `scheduleSlotId`, supprimé)
- `data/homework.ts` -- `createDevoir(userId, subjectId, description, aRendre?, echeance?, plannedWeekday?, plannedStartTime?)` (`data/homework.ts:16`), `toggleDevoirDone(id, userId, done)` bidirectionnel (`data/homework.ts:47`), `deleteDevoir(id, userId)` (`data/homework.ts:63`), `listDevoirs(userId)` (`data/homework.ts:76`)
- `actions/homework.ts` -- `createDevoirAction` valide format + fenêtre 8h-22h (`actions/homework.ts:108`), `toggleDevoirDoneAction` (`actions/homework.ts:176`, bidirectionnel), `deleteDevoirAction` (`actions/homework.ts:209`) ; `revalidateAccueil()`+`revalidateEdt()` après chaque mutation
- `actions/schedule.ts` -- `createSlot`/`updateSlot` revalident aussi `/` (`revalidateAccueil`), car ils peuvent faire naître une `Subject` que le sélecteur du FAB doit voir sans délai
- `components/homework/devoirs-list.tsx` -- bloc "Devoirs" : bascule bidirectionnelle + bouton supprimer, `pendingIds`/`errorIds` par ligne (`Set<string>`), resynchronisation `doneById` depuis les props pendant le rendu ; affiche matière/échéance/jours-restants/placement par ligne
- `components/homework/free-time-picker.tsx` (nouveau) -- `FreeTimePicker` (`free-time-picker.tsx:43`), mini grille type EDT des trous libres, `gapContaining` bornes inclusives des deux côtés (`free-time-picker.tsx:35`) ; tap un trou -> `<input type="time">` borné `min`/`max` pour paramétrer l'heure précise -- remplace `schedule-slot-picker.tsx` (liste de créneaux existants, supprimé)
- `components/homework/add-homework-fab.tsx` -- FAB + Dialog (`add-homework-fab.tsx:69`), `weeklyGaps` mémoïsé (`useMemo`, `add-homework-fab.tsx:81`) via `computeWeeklyFreeGaps`
- `components/schedule/day-view.tsx` -- `DayView` (`day-view.tsx:40`) affiche les devoirs programmés du jour dans une section "Devoirs programmés" (`day-view.tsx:74`) indépendante des créneaux/cours, icône `NotebookPen`/`Check` selon `done`
- `components/schedule/edt-view-tabs.tsx` -- `plannedDevoirs` day-level thread vers `DayView` pour "Aujourd'hui"/"Demain"
- `app/edt/page.tsx` -- fetch `listDevoirs`, `filterDevoirsForWeekday` pour "Aujourd'hui"/"Demain" (`app/edt/page.tsx:80-81`), indépendant de `noSchoolDayIsoSet`
- `app/(accueil)/page.tsx` -- fetch `listDevoirs`, construit `devoirsView` (échéance/jours-restants/placement formatés serveur, AD-4, `app/(accueil)/page.tsx:189-206`)

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma`, `prisma/production/schema.prisma` -- modèle `Devoir` + migrations (création initiale, lien créneau abandonné, placement libre avec backfill)
- [x] `domain/schedule.ts` -- `computeFreeGaps`/`computeWeeklyFreeGaps` + tests unitaires (bornage de fenêtre inclus)
- [x] `domain/homework.ts` -- `computeDaysRemaining`, `filterDevoirsForWeekday` + tests unitaires
- [x] `data/homework.ts` -- CRUD complet (création/bascule bidirectionnelle/suppression/listing) + tests d'intégration
- [x] `actions/homework.ts` -- actions création/toggle/suppression (validation fenêtre 8h-22h) + tests d'intégration
- [x] `components/homework/free-time-picker.tsx` -- mini grille des trous libres + heure paramétrable
- [x] `components/homework/add-homework-fab.tsx` -- FAB + modal
- [x] `components/homework/devoirs-list.tsx` -- bloc "Devoirs", bascule bidirectionnelle sans disparition, suppression, affichage complet
- [x] `components/schedule/day-view.tsx`, `edt-view-tabs.tsx` -- section "Devoirs programmés" par jour
- [x] `app/(accueil)/page.tsx`, `app/edt/page.tsx` -- intégration complète

**Acceptance Criteria:**
- Given le FAB ouvert sur Accueil ou EDT, when je saisis matière + description (+ échéance/placement optionnels) et valide, then le devoir apparaît immédiatement sur Accueil, sans écran de confirmation
- Given un devoir affiché, when je tape dessus, then il bascule coché/décoché sans jamais disparaître du rendu
- Given un devoir affiché, when je tape sur l'icône supprimer, then il est retiré définitivement de la base
- Given un jour avec des cours, when j'ouvre le sélecteur de placement, then seuls les trous libres (jamais les horaires de cours) sont proposés
- Given un devoir programmé un jour donné, when j'ouvre "Aujourd'hui"/"Demain" pour ce jour, then il apparaît en lecture seule, même si ce jour est marqué "sans cours"
- Given aucun devoir, when j'ouvre Accueil, then le bloc "Devoirs" est affiché avec un message positif, jamais absent

## Spec Change Log

**Itération 1 (implémentation initiale) :** aucun écart au Code Map. Revue (3-layer) : 3 correctifs réels (validation calendaire de `parseEcheance`, renommage temporaire `markDevoirDone`, ajout de `revalidateAccueil()` dans `actions/schedule.ts`). 5 constats hors-scope loggés dans `deferred-work.md`.

**Itération 2 (renégociation -- retour utilisateur après 1er déploiement) :** un devoir coché ne doit plus disparaître, doit rester visible avec bascule bidirectionnelle, doit être supprimable explicitement, doit afficher matière/échéance/jours-restants, et doit pouvoir être rattaché à un créneau EDT existant. Revue (3-layer) : 7 correctifs réels (`pendingIds`/`errorIds` par ligne, resynchronisation `doneById`, icônes lucide au lieu d'un emoji, distinction visuelle fait/pas-fait, matière précisée si différente du créneau, commentaire `computeDaysRemaining` corrigé, `formatSlotLabel`/`attachDevoirsToSlots` extraits et testés). 7 constats hors-scope loggés dans `deferred-work.md`.

**Itération 3 (raffinement UI, retour utilisateur) :** le sélecteur "Programmer dans l'EDT" (liste déroulante de texte) jugé "pas assez visuel" -- remplacé par une mini grille type EDT (`schedule-slot-picker.tsx`, supprimé depuis, voir itération 4). Revue solo (changement présentationnel contenu, interaction déjà éprouvée ailleurs dans l'app).

**Itération 4 (renégociation -- retour utilisateur après 2e déploiement, pivot majeur) :** l'utilisateur a précisé que l'objectif n'est pas d'attacher un devoir à un cours existant mais de le placer dans un trou LIBRE de la semaine complète (lundi-dimanche, 8h-22h), avec une heure paramétrable. Frozen block entièrement réécrit (Intent/Boundaries/I-O matrix ci-dessus). KEEP : le modèle `Devoir` de base (hors placement), `parseEcheance`, le pattern `revalidateAccueil`/`revalidateEdt`, la bascule bidirectionnelle + suppression de l'itération 2, tout ça reste valide.

Changements de code : `Devoir.scheduleSlotId`/`scheduleSlot` (FK) supprimés, remplacés par `plannedWeekday`/`plannedStartTime` (simple couple, aucune FK) ; nouveaux `domain/schedule.ts::computeFreeGaps`/`computeWeeklyFreeGaps` (soustraction des créneaux occupés à une fenêtre 8h-22h) ; `domain/homework.ts::attachDevoirsToSlots` supprimé, remplacé par `filterDevoirsForWeekday` (plus de notion de créneau) ; `components/homework/schedule-slot-picker.tsx` supprimé, remplacé par `free-time-picker.tsx` (trous libres + heure paramétrable via `<input type="time">` borné) ; `components/schedule/day-view.tsx` réécrit : les devoirs ne sont plus nested sous un créneau (il n'y en a plus) mais affichés dans une section "Devoirs programmés" au niveau du jour, indépendante de `noSchoolDayIsoSet`.

**Revue (3-layer, itération 4) :** 8 correctifs réels appliqués :
- `domain/schedule.ts::computeFreeGaps` -- un créneau débordant `windowEnd` (ex. cours à 23h avec fenêtre finissant à 22h) produisait un trou qui s'étendait au-delà de `windowEnd` au lieu d'être rogné -- corrigé en filtrant les créneaux entièrement hors fenêtre et en rognant ceux qui la chevauchent à ses bornes ; 4 tests de régression ajoutés (créneau après la fenêtre, avant la fenêtre, chevauchant chaque borne).
- `components/homework/free-time-picker.tsx::gapContaining` -- bornes `[start, end)` (fin exclusive) alors que le navigateur traite le `max` d'un `<input type="time">` comme inclusif : choisir exactement l'heure de fin d'un trou faisait disparaître le bloc "Heure précise" au rendu suivant (le trou ne se retrouvait plus). Corrigé en rendant les deux bornes inclusives.
- `components/homework/free-time-picker.tsx` -- état `openDay` redondant avec `value.weekday`, risque de désynchronisation si le composant reste monté entre deux ouvertures du dialogue. Supprimé, dérivé directement de `value`.
- Migration production (et dev) -- la version auto-générée supprimait `scheduleSlotId` sans backfill, perdant silencieusement le lien de tout devoir déjà créé avec cette conception (brièvement en production avant ce remplacement). Corrigée pour copier `ScheduleSlot.weekday`/`startTime` dans `plannedWeekday`/`plannedStartTime` avant de supprimer la colonne.
- `actions/homework.ts` -- doc-comment faisant encore référence à `ScheduleSlotPicker` (composant supprimé) -- corrigé pour citer `FreeTimePicker`.
- `actions/homework.ts::createDevoirAction` -- validait le format de `plannedStartTime` mais jamais son appartenance à la fenêtre 8h-22h annoncée -- ajout d'une vérification de plage (toujours pas de vérification de chevauchement réel avec un `ScheduleSlot`, loggé en hors-scope).
- Duplication de `TIME_PATTERN` entre `domain/schedule.ts` et `actions/homework.ts` -- la seconde copie supprimée, `actions/homework.ts` réutilise l'export de `domain/schedule.ts`.
- `components/homework/add-homework-fab.tsx` -- `computeWeeklyFreeGaps` recalculé à chaque frappe (description, échéance) faute de mémoïsation -- ajout d'un `useMemo` dépendant de `scheduleSlots`.

5 constats réels mais hors-scope loggés dans `deferred-work.md` (voir aussi les mises à jour de plusieurs entrées des itérations précédentes, devenues obsolètes ou étendues par ce pivot) : pas de vérification serveur qu'un placement correspond à un trou réellement libre (confiance au sélecteur client, même catégorie que les autres Server Actions non blindées) ; `computeWeeklyFreeGaps` ignore silencieusement un `weekday` non reconnu (non-problème de typage vu l'enum Prisma) ; le champ heure du sélecteur ne gère pas un effacement complet (petit accroc UX, "Aucun créneau" reste la voie de sortie) ; absence de test de rendu de page pour l'indépendance devoir-programmé/jour-sans-cours (même lacune que le reste du repo, confirmée par verification-gap).

Vérification indépendante (relecture complète des fichiers changés + re-exécution locale de `npx vitest run`/`npx tsc --noEmit`/`npm run lint`/`npm run build` + test manuel dans le navigateur, 3 subagents de revue en parallèle par itération) menée séparément de la session d'implémentation, pour toutes les itérations.

## Design Notes

FAB dupliqué (pas de layout partagé Accueil+EDT existant -- `app/layout.tsx` est le seul layout, commun à toutes les routes) plutôt qu'un wrapper client conditionnel sur `usePathname()`. `SubjectTag` documente déjà en commentaire être prévu pour les devoirs.

Le placement EDT ne s'affiche que dans "Aujourd'hui"/"Demain" (pas "Semaine") pour rester dans le budget de chaque itération -- `week-schedule.tsx`/`slot-row.tsx` n'ont pas été touchés, loggé en hors-scope.

Aucune vérification serveur que l'heure choisie tombe réellement dans un trou libre (juste que c'est dans la fenêtre 8h-22h) -- le sélecteur ne propose que des trous libres au moment de l'affichage, la fenêtre entre chargement et soumission est étroite pour une app mono-utilisateur, choix assumé (voir Design Notes des itérations précédentes pour la même logique appliquée à `subjectId`).

## Verification

**Commands:**
- `npx vitest run` -- expected: tests domain/data/actions passent, y compris non-régression Sac/Matin/Retour
- `npm run build`, `npx tsc --noEmit`, `npm run lint` -- expected: aucune erreur

**Manual checks:**
- Ouvrir Accueil et EDT, vérifier le FAB présent sur les deux, absent ailleurs (Réglages, Progression)
- Créer un devoir minimal, avec échéance, avec placement dans un trou libre -- vérifier l'apparition immédiate et l'affichage correct de chaque champ
- Vérifier qu'un jour avec cours ne propose que les trous restants (jamais les horaires de cours), et qu'un créneau débordant la fenêtre 8h-22h ne produit pas un trou hors fenêtre
- Cocher/décocher un devoir plusieurs fois -- vérifier qu'il ne disparaît jamais
- Supprimer un devoir -- vérifier son retrait définitif
- Vérifier le devoir programmé dans "Aujourd'hui"/"Demain" (section "Devoirs programmés"), y compris un jour marqué "sans cours"
- Vérifier le message positif à vide, et l'absence de toute couleur d'alerte

**Résultats (itérations 1-3) :** voir Spec Change Log -- 81/81, puis 95/95 tests, `tsc`/`lint`/`build` propres à chaque itération, vérifications navigateur détaillées dans les itérations correspondantes.

**Résultats (itération 4, implémentation + revue indépendante, après les 8 correctifs) :**
- `npx vitest run` -- OK, 112/112 tests passent (+15 `domain/schedule.test.ts` pour `computeFreeGaps`/`computeWeeklyFreeGaps` dont 4 de régression sur le bornage de fenêtre, `domain/homework.test.ts` migré de `attachDevoirsToSlots` vers `filterDevoirsForWeekday`).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- OK, aucune erreur, `/` et `/edt` toujours `ƒ (Dynamic)`.
- Vérifié dans le navigateur : sélecteur affiche les trous libres réels par jour (ex. "09:00–22:00" un jour avec un cours 08h-09h, "08:00–22:00" les jours sans cours) ; tap un trou révèle "Heure précise" bornée à ce trou, heure paramétrée puis devoir créé avec cette heure exacte, confirmé sur Accueil ("Maths · Jeudi 17:30") ; devoir programmé pour aujourd'hui apparaît dans la section "Devoirs programmés" en EDT même si le jour est marqué "sans cours" (comportement voulu, confirmé visuellement) ; correctif de bornage vérifié explicitement : un cours ajouté à 23h ne fait plus déborder le trou proposé au-delà de 22h.

## Suggested Review Order

**Calcul des trous libres (pure, domain/ -- cœur du pivot)**

- Rognage aux bornes de fenêtre (correctif de revue -- bug le plus significatif de cette itération).
  [`domain/schedule.ts:204`](../../domain/schedule.ts#L204)

- Même calcul pour les 7 jours de la semaine.
  [`domain/schedule.ts:238`](../../domain/schedule.ts#L238)

- Filtre + tri des devoirs programmés par jour (remplace l'ancien rattachement par créneau).
  [`domain/homework.ts:58`](../../domain/homework.ts#L58)

**Modèle de données**

- `plannedWeekday`/`plannedStartTime` -- plus de FK vers `ScheduleSlot`.
  [`schema.prisma`](../../prisma/schema.prisma)

- Migration avec backfill (correctif de revue -- préserve les données d'un design déjà passé en production).
  [`migration.sql`](../../prisma/production/migrations/20260908151855_replace_devoir_slot_link_with_planned_time/migration.sql)

**Sélecteur visuel (UI)**

- Bornes inclusives des deux côtés (correctif de revue -- corrige une désynchronisation d'état à la borne d'un trou).
  [`free-time-picker.tsx:35`](../../components/homework/free-time-picker.tsx#L35)

- Composant complet : grille de trous + heure paramétrable.
  [`free-time-picker.tsx:43`](../../components/homework/free-time-picker.tsx#L43)

**Validation & mutation**

- Format + fenêtre 8h-22h validés (correctif de revue -- la fenêtre ne l'était pas).
  [`actions/homework.ts:108`](../../actions/homework.ts#L108)

**Intégration pages**

- Devoirs programmés du jour, indépendants d'un jour "sans cours" (intent explicite).
  [`app/edt/page.tsx:80`](../../app/edt/page.tsx#L80)

- Section "Devoirs programmés" au niveau du jour, plus nested sous un créneau.
  [`day-view.tsx:74`](../../components/schedule/day-view.tsx#L74)

**Peripherals**

- Tests de régression du bornage de fenêtre.
  [`domain/schedule.test.ts`](../../domain/schedule.test.ts)
