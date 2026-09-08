---
title: 'Story 2.4 — Noter et suivre mes devoirs'
type: 'feature'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 2
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'ddf868a9db5bfd3abc607c0ec863fdc7aa4a6024'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rien ne permet aujourd'hui à Léo de noter un devoir donné en classe et de le suivre jusqu'à ce qu'il soit fait -- aucun modèle `Devoir`, aucune saisie rapide, aucun affichage.

**Approach:** Nouveau modèle `Devoir` (matière + description obligatoires, "à rendre"/échéance/créneau EDT optionnels, `done` qui ne se réinitialise jamais -- AD-7). Saisie via un FAB persistant (Accueil + EDT) ouvrant un modal de saisie rapide, fermé immédiatement après validation. Bloc "Devoirs" sur Accueil (toujours rendu, y compris vide) : chaque ligne affiche matière, échéance et jours restants, coche/décoche par tap (bidirectionnel, ne disparaît jamais), suppression explicite via une icône dédiée. Un devoir peut être rattaché à un créneau EDT existant ; il s'affiche alors en lecture seule sous ce créneau dans les vues "Aujourd'hui"/"Demain".

**Renégocié (retour utilisateur après premier déploiement production) :** l'itération initiale faisait disparaître un devoir coché de la liste (mécanisme calqué sur Matin/Retour). L'utilisateur a explicitement demandé l'inverse -- coché = reste visible, affiché comme fait -- plus un bouton supprimer, l'affichage matière/échéance/jours restants, et le rattachement à un créneau EDT existant. Cette section reflète l'intent renégocié, pas l'intent original.

## Boundaries & Constraints

**Always:**
- Création : matière + description seules obligatoires ; "à rendre", échéance et créneau EDT restent optionnels, aucune validation ne les rend requis. Apparition immédiate dans "Devoirs", sans écran de confirmation.
- `Devoir.done` bascule bidirectionnellement par tap explicite (AD-7) -- aucune tâche planifiée ne le réinitialise ni ne purge la ligne ; un devoir fait reste affiché (coché), jamais retiré du rendu par un filtre.
- Suppression définitive uniquement via le bouton dédié (icône) -- jamais automatique, jamais liée à la bascule `done`.
- Bloc "Devoirs" toujours affiché sur Accueil, y compris vide -- jamais absent (contrairement à Sac). Vide → message positif ("Rien à faire ce soir, bravo !").
- Jamais de couleur d'alerte (rouge) liée à l'ancienneté ou à une échéance dépassée -- ton neutre/positif uniquement, aucune logique de retard/tri par urgence.
- Toute mutation passe par une Server Action dans `actions/homework.ts`, appelant une fonction pure de `domain/homework.ts` avant `data/homework.ts` (AD-1). Réutilise `SubjectTag` pour la pastille matière.
- Un devoir rattaché à un créneau EDT (choix libre, indépendant de sa matière) s'affiche en lecture seule sous ce créneau dans "Aujourd'hui"/"Demain" -- cocher/supprimer reste réservé au bloc "Devoirs" d'Accueil, jamais dupliqué dans l'EDT.
- FAB dupliqué sur Accueil et EDT (pas de layout partagé existant pour ces deux routes).
- `prisma/schema.prisma` et `prisma/production/schema.prisma` restent synchronisés manuellement ; toute migration de schéma requiert les deux migrations (dev sqlite + production postgres générée hors-ligne).

**Ask First:** Aucune.

**Never:** Lier un devoir "à rendre" au sac du lendemain (Story 2.5). Écran "Ce soir" à 3 blocs (Story 2.7). Logique de retard/couleur d'alerte. Modifier la description/matière d'un devoir après création (seules `done` et la suppression sont mutables).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Création minimale | matière + description seules | Devoir créé, `aRendre=false`, `echeance=null`, `scheduleSlotId=null`, visible immédiatement | Description vide → rejet, message d'erreur |
| Création avec échéance et créneau | tous champs renseignés | Devoir créé avec ces valeurs, affiché avec échéance/jours-restants sur Accueil et sous le créneau en EDT | Échéance calendairement invalide (ex. 30 février) → rejet |
| Devoir coché fait | Tap sur une ligne | `done=true`, ligne reste affichée (coché, mise à jour optimiste) | Échec réseau → annule l'optimisme |
| Devoir redécoché | Tap sur une ligne déjà faite | `done=false`, reste affichée (mise à jour optimiste) | Échec réseau → annule l'optimisme |
| Devoir supprimé | Tap sur l'icône supprimer | Ligne retirée du rendu, ligne supprimée en base définitivement | Échec réseau → réaffiche la ligne |
| Aucun devoir | Aucun devoir créé, ou tous supprimés | Bloc affiché avec message positif, jamais absent | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma`, `prisma/production/schema.prisma` -- modèle `Devoir` (id, userId+user Cascade, subjectId+subject Cascade, description, aRendre, echeance, done, createdAt, `scheduleSlotId`+`scheduleSlot` optionnel `SetNull`), `@@index([userId, done])`, back-relations `User.devoirs`/`ScheduleSlot.devoirs`
- `domain/homework.ts` -- `computeDaysRemaining(echeanceIso, todayIso)` pure (`domain/homework.ts:19`) ; `attachDevoirsToSlots(slots, devoirs)` pure, regroupe les devoirs rattachés par `scheduleSlotId` (`domain/homework.ts:57`), testé
- `domain/schedule.ts` -- `formatSlotLabel(slot)` pure (`domain/schedule.ts:43`), factorisée pour éviter la duplication entre Accueil et EDT
- `data/homework.ts` -- `createDevoir(userId, subjectId, description, aRendre?, echeance?, scheduleSlotId?)` (`data/homework.ts:14`), `toggleDevoirDone(id, userId, done)` bidirectionnel (`data/homework.ts:36`), `deleteDevoir(id, userId)` (`data/homework.ts:52`), `listDevoirs(userId)` (`data/homework.ts:65`, include `scheduleSlot`)
- `actions/homework.ts` -- `createDevoirAction` (`actions/homework.ts:95`), `toggleDevoirDoneAction` (`actions/homework.ts:144`, bidirectionnel), `deleteDevoirAction` (`actions/homework.ts:177`) ; `revalidateAccueil()`+`revalidateEdt()` après chaque mutation
- `actions/schedule.ts` -- `createSlot`/`updateSlot` revalident aussi `/` (`revalidateAccueil`, `actions/schedule.ts:51`), car ils peuvent faire naître une `Subject` que le sélecteur du FAB doit voir sans délai
- `components/homework/devoirs-list.tsx` -- bloc "Devoirs" (`devoirs-list.tsx:57`) : bascule bidirectionnelle + bouton supprimer, `pendingIds`/`errorIds` par ligne (`Set<string>`, pas un scalaire unique), resynchronisation `doneById` depuis les props pendant le rendu (`devoirs-list.tsx:72`) ; affiche matière/échéance/jours-restants/créneau par ligne
- `components/homework/add-homework-fab.tsx` -- FAB + Dialog (`add-homework-fab.tsx:62`), sélecteur "Créneau" optionnel (n'apparaît que si l'utilisateur a des créneaux)
- `components/schedule/day-view.tsx` -- `DayView` (`day-view.tsx:37`) affiche les devoirs rattachés sous leur créneau, icône `NotebookPen`/`Check` selon `done`, matière du devoir précisée seulement si différente de celle du créneau
- `app/(accueil)/page.tsx` -- fetch `listDevoirs`, construit `devoirsView` (échéance/jours-restants/créneau formatés serveur, AD-4) et `homeworkScheduleSlots` (via `formatSlotLabel`)
- `app/edt/page.tsx` -- fetch `listDevoirs`, `attachDevoirsToSlots` pour "Aujourd'hui"/"Demain", `homeworkScheduleSlots` pour le FAB

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma`, `prisma/production/schema.prisma` -- modèle `Devoir` + `scheduleSlotId` + migrations dev/production (2 migrations : création initiale, puis ajout du lien créneau)
- [x] `domain/homework.ts` -- `computeDaysRemaining`, `attachDevoirsToSlots` + tests unitaires
- [x] `domain/schedule.ts` -- `formatSlotLabel` factorisé
- [x] `data/homework.ts` -- CRUD complet (création/bascule bidirectionnelle/suppression/listing) + tests d'intégration
- [x] `actions/homework.ts` -- actions création/toggle/suppression + tests d'intégration
- [x] `components/homework/add-homework-fab.tsx` -- FAB + modal, sélecteur créneau optionnel
- [x] `components/homework/devoirs-list.tsx` -- bloc "Devoirs", bascule bidirectionnelle sans disparition, suppression, affichage matière/échéance/jours-restants/créneau
- [x] `components/schedule/day-view.tsx` -- affichage des devoirs rattachés sous leur créneau
- [x] `app/(accueil)/page.tsx`, `app/edt/page.tsx` -- intégration complète

**Acceptance Criteria:**
- Given le FAB ouvert sur Accueil ou EDT, when je saisis matière + description (+ échéance/créneau optionnels) et valide, then le devoir apparaît immédiatement sur Accueil, sans écran de confirmation
- Given un devoir affiché, when je tape dessus, then il bascule coché/décoché sans jamais disparaître du rendu
- Given un devoir affiché, when je tape sur l'icône supprimer, then il est retiré définitivement de la base
- Given un devoir rattaché à un créneau EDT, when j'ouvre "Aujourd'hui"/"Demain" pour ce jour, then il apparaît en lecture seule sous ce créneau
- Given aucun devoir, when j'ouvre Accueil, then le bloc "Devoirs" est affiché avec un message positif, jamais absent

## Spec Change Log

**Itération 1 (implémentation initiale) :** aucun écart au Code Map. `data/homework.ts::toggleDevoirDone(id, userId, done)` prévu au Code Map a été temporairement renommé `markDevoirDone(id, userId)` (sans paramètre `done`) pendant la revue, pour fermer un écart entre le Never de la spec d'alors ("seule la bascule done est mutable, jamais de redécochage") et la couche données qui l'exposait quand même. Revue (3-layer) : 3 correctifs réels (validation calendaire de `parseEcheance`, ce renommage `markDevoirDone`, ajout de `revalidateAccueil()` dans `actions/schedule.ts`). 5 constats hors-scope loggés dans `deferred-work.md`.

**Itération 2 (renégociation -- retour utilisateur après déploiement production) :** l'utilisateur a testé la production et demandé un changement de comportement fondamental : un devoir coché ne doit plus disparaître (contredit `<frozen-after-approval>` d'origine), doit rester visible avec bascule bidirectionnelle, doit être supprimable explicitement (bouton icône), doit afficher matière/échéance/jours-restants, et doit pouvoir être rattaché à un créneau EDT existant ("programmer le devoir dans l'EDT"). Frozen block réécrit en conséquence (Intent/Boundaries/I-O matrix ci-dessus). KEEP de l'itération 1 : le modèle `Devoir`, la structure `domain`/`data`/`actions`, `parseEcheance` et sa validation calendaire, le pattern `revalidateAccueil`/`revalidateEdt`, tout ça reste valide et a été étendu plutôt que réécrit.

Changements de code : `markDevoirDone` re-devient `toggleDevoirDone(id, userId, done)` (bidirectionnel, le renommage de l'itération 1 est annulé -- la contrainte qui le justifiait n'existe plus) ; nouveau `deleteDevoir`/`deleteDevoirAction` ; `Devoir.scheduleSlotId` (optionnel, `SetNull`) + migration ; `filterDevoirsAFaire` supprimé (plus de filtre "à faire", tous les devoirs restent affichés) ; nouveau `computeDaysRemaining` et `attachDevoirsToSlots` (domain/homework.ts) ; `DevoirsList` réécrit (bascule bidirectionnelle visible, bouton supprimer, affichage étendu) ; `AddHomeworkFab` gagne un sélecteur de créneau optionnel ; `DayView` affiche les devoirs rattachés sous leur créneau.

**Revue (3-layer, itération 2) :** 7 correctifs réels appliqués :
- `DevoirsList` : `pendingId`/`errorId` (scalaires uniques) → `pendingIds`/`errorIds` (`Set<string>`, par ligne) -- un devoir coché ne disparaissant plus, l'interaction concurrente sur plusieurs lignes est désormais le chemin normal, pas un cas limite ; l'ancien scalaire unique laissait une ligne en cours d'enregistrement se faire re-taper pendant que son appel réseau était encore en vol.
- `DevoirsList` : `doneById` (état optimiste local) ne se resynchronisait jamais depuis les props après le montage -- inoffensif quand un devoir coché disparaissait (aucune divergence possible), redevenu un risque réel avec la bascule bidirectionnelle et persistante. Corrigé par ajustement d'état pendant le rendu (`if (devoirs !== prevDevoirs) { ... }`, pattern React recommandé pour dériver un état depuis des props qui changent -- pas de `useEffect`, qui aurait déclenché un rendu supplémentaire évitable et un avertissement de lint `react-hooks/set-state-in-effect`).
- `components/schedule/day-view.tsx` : devoir rattaché affiché avec un emoji (`📝`), seule utilisation d'emoji du dossier `components/`, non annoncé `aria-hidden`. Remplacé par les icônes `lucide-react` déjà utilisées partout ailleurs (`NotebookPen`/`Check` selon `done`), `aria-hidden="true"`.
- `components/schedule/day-view.tsx` : un devoir fait rattaché à un créneau s'affichait identiquement à un devoir en attente (aucune distinction visuelle). Ajout du style barré/atténué + icône `Check` quand `done`.
- `components/schedule/day-view.tsx` : un devoir peut être rattaché à un créneau d'une matière différente de la sienne (rien ne les lie), et rien n'affichait la matière du devoir -- ambiguïté possible ("Maths" listé sous un créneau "EPS" sans le préciser). Ajout d'un préfixe matière, uniquement quand elle diffère de celle du créneau.
- `domain/homework.ts::computeDaysRemaining` -- commentaire inexact affirmant un ancrage "midi UTC" alors que la fonction ancre à minuit (résultat correct malgré tout, les deux opérandes étant ancrés identiquement) ; corrigé pour décrire la technique réelle.
- Duplication de la construction du libellé de créneau (`${slot.subject.name} -- ...`) identique dans `app/(accueil)/page.tsx` et `app/edt/page.tsx` -- extraite en `domain/schedule.ts::formatSlotLabel`, réutilisée aux deux endroits. Une verification-gap review a aussi signalé que le regroupement devoirs-par-créneau (`app/edt/page.tsx`) n'avait aucune couverture de test à aucune couche -- extrait en `domain/homework.ts::attachDevoirsToSlots` (pure, testée : 6 tests couvrant le regroupement correct, l'absence de fuite inter-créneaux, `undefined` vs `[]`, les devoirs sans/avec créneau invalide, et la préservation de l'état `done` par devoir).

7 constats réels mais hors-scope loggés dans `deferred-work.md` (voir aussi les mises à jour de 3 entrées de l'itération 1, devenues obsolètes ou résolues par cette itération) : `scheduleSlotId` non vérifié comme appartenant à l'utilisateur (même mirror que `subjectId`) ; pas de garde runtime `typeof` sur `deleteDevoirAction`/`toggleDevoirDoneAction` (même catégorie que Story 2.1) ; `computeDaysRemaining` sans garde contre une ISO malformée (même précédent que Story 1.3) ; suppression sans confirmation à 44px de la bascule (tradeoff de convention déjà existant dans l'app, pas nouveau) ; liste de créneaux figée à l'ouverture du FAB (course rare si le créneau est supprimé avant soumission) ; `createDevoir` à 6 paramètres positionnels (refactor futur en objet suggéré) ; le lien EDT ne s'affiche que dans "Aujourd'hui"/"Demain", jamais dans "Semaine".

Vérification indépendante (relecture complète des fichiers changés + re-exécution locale de `npx vitest run`/`npx tsc --noEmit`/`npm run lint`/`npm run build` + test manuel dans le navigateur, 3 subagents de revue en parallèle par itération) menée séparément de la session d'implémentation, pour les deux itérations.

## Design Notes

FAB dupliqué (pas de layout partagé Accueil+EDT existant -- `app/layout.tsx` est le seul layout, commun à toutes les routes) plutôt qu'un wrapper client conditionnel sur `usePathname()` : plus simple, zéro risque de fuite sur d'autres routes (Réglages, Progression). `SubjectTag` documente déjà en commentaire être prévu pour les devoirs.

Lien EDT scopé à "Aujourd'hui"/"Demain" (pas "Semaine") pour rester dans le budget de cette itération -- la vue Semaine (`week-schedule.tsx`/`slot-row.tsx`) n'a pas été touchée, loggé en hors-scope.

## Verification

**Commands:**
- `npx vitest run` -- expected: tests domain/data/actions passent, y compris non-régression Sac/Matin/Retour
- `npm run build`, `npx tsc --noEmit`, `npm run lint` -- expected: aucune erreur

**Manual checks:**
- Ouvrir Accueil et EDT, vérifier le FAB présent sur les deux, absent ailleurs (Réglages, Progression)
- Créer un devoir minimal, avec échéance, avec rattachement à un créneau -- vérifier l'apparition immédiate et l'affichage correct de chaque champ
- Cocher/décocher un devoir plusieurs fois -- vérifier qu'il ne disparaît jamais
- Supprimer un devoir -- vérifier son retrait définitif
- Vérifier le devoir rattaché sous son créneau en EDT ("Aujourd'hui"/"Demain"), avec l'état fait/pas-fait visuellement distinct
- Vérifier le message positif à vide, et l'absence de toute couleur d'alerte

**Résultats (itération 1, implémentation + revue indépendante) :**
- `npx vitest run` -- 81/81 tests passent.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- OK, `/` et `/edt` toujours `ƒ (Dynamic)`.

**Résultats (itération 2, implémentation + revue indépendante, après les 7 correctifs) :**
- `npx vitest run` -- OK, 95/95 tests passent (+6 `attachDevoirsToSlots`, +8 nouveaux tests data/actions pour la bascule bidirectionnelle et la suppression).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- OK, aucune erreur, `/` et `/edt` toujours `ƒ (Dynamic)`.
- Vérifié dans le navigateur (dev server + Browser pane) : devoir créé avec échéance + rattaché à un créneau -- affiche matière/échéance/jours-restants/créneau correctement sur Accueil ; tap coche (checkmark vert, texte barré) sans disparaître, tap à nouveau décoche -- bidirectionnel confirmé ; suppression retire définitivement la ligne (confirmé aussi en base) ; sur EDT, le devoir rattaché apparaît en lecture seule sous son créneau, avec préfixe matière quand celle-ci diffère du créneau (testé délibérément avec un devoir "Maths" rattaché à un créneau "EPS"), icône `NotebookPen`/`Check` selon l'état fait, style barré/atténué quand fait.

## Suggested Review Order

**Modèle de données**

- `scheduleSlotId` optionnel, `onDelete: SetNull` (jamais `Cascade` -- AD-7).
  [`schema.prisma:201`](../../prisma/schema.prisma#L201)

**Règles métier (pures, domain/)**

- Jours restants : ancrage minuit UTC, commentaire corrigé en revue.
  [`domain/homework.ts:19`](../../domain/homework.ts#L19)

- Regroupement devoirs-par-créneau, extrait et testé suite à la verification-gap review (itération 2).
  [`domain/homework.ts:57`](../../domain/homework.ts#L57)

- Libellé de créneau factorisé (`formatSlotLabel`), corrige une duplication Accueil/EDT.
  [`domain/schedule.ts:43`](../../domain/schedule.ts#L43)

**Données & mutation**

- `toggleDevoirDone` redevenu bidirectionnel (annule le renommage `markDevoirDone` de l'itération 1).
  [`data/homework.ts:36`](../../data/homework.ts#L36)

- Nouvelle suppression définitive, scopée `{id, userId}`.
  [`data/homework.ts:52`](../../data/homework.ts#L52)

- Bascule bidirectionnelle exposée côté action (accepte `done` en entrée).
  [`actions/homework.ts:144`](../../actions/homework.ts#L144)

- Nouvelle action suppression.
  [`actions/homework.ts:177`](../../actions/homework.ts#L177)

**UI -- correctifs de revue (itération 2)**

- `pendingIds`/`errorIds` par ligne (`Set`), plus un scalaire unique -- interaction concurrente multi-lignes désormais réelle.
  [`devoirs-list.tsx:101`](../../components/homework/devoirs-list.tsx#L101)

- Resynchronisation de l'état optimiste depuis les props pendant le rendu (pas de `useEffect`).
  [`devoirs-list.tsx:72`](../../components/homework/devoirs-list.tsx#L72)

- Devoir rattaché : icône lucide (pas d'emoji) + distinction visuelle fait/pas-fait + matière précisée si différente du créneau.
  [`day-view.tsx:86`](../../components/schedule/day-view.tsx#L86)

**Intégration pages**

- Regroupement par créneau + libellés de créneau pour le FAB.
  [`app/edt/page.tsx:82`](../../app/edt/page.tsx#L82)

- Échéance/jours-restants/créneau formatés côté serveur (AD-4).
  [`app/(accueil)/page.tsx:190`](../../app/(accueil)/page.tsx#L190)

**Peripherals**

- Tests `attachDevoirsToSlots` (regroupement, clé de jointure, cas vides).
  [`domain/homework.test.ts`](../../domain/homework.test.ts)
