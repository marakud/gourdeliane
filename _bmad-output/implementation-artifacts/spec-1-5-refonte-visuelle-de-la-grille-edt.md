---
title: 'Story 1.5 — Refonte visuelle de la grille EDT'
type: 'feature'
created: '2026-09-08'
status: 'review'
review_loop_iteration: 1
context: []
baseline_commit: '2604b44dc2f572968038a6df4011a8ad305917a3'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La vue "Semaine" de l'EDT (`components/schedule/week-schedule.tsx`, Story 1.2) affiche 7 cartes empilées (une par jour), chacune listant ses créneaux verticalement sans notion d'heure visuelle — aucune ressemblance avec un vrai emploi du temps scolaire (grille horizontale jours × grille verticale horaires, cases positionnées et dimensionnées selon leur durée réelle). L'utilisateur a explicitement demandé ce style après avoir partagé une photo de son emploi du temps réel (grille colorée, une colonne par jour, cases positionnées par horaire).

**Approach:** Remplacer, à partir de la largeur tablette (≥768px, seuil déjà utilisé par la vue actuelle), le rendu "cartes empilées" par une vraie grille horaire positionnée : colonnes = jours (Lundi→Dimanche), axe vertical = heures, chaque créneau devient une case colorée par matière positionnée et dimensionnée proportionnellement à son horaire réel (comme un calendrier). La vue mobile (<768px, liste par jour) n'est pas concernée par cette story -- elle continue de fonctionner exactement comme avant, jour par jour, écran trop étroit pour une grille lisible. La fenêtre horaire affichée (bornes haute/basse) se calcule dynamiquement à partir des créneaux réellement saisis (jamais figée), avec un minimum par défaut raisonnable pour rester lisible même avec peu de données.

## Boundaries & Constraints

**Always:**
- Le seuil de bascule liste/grille reste exactement celui déjà en place (`md`, 768px, UX-DR13) -- aucune régression sur mobile, la vue liste actuelle (`WeekSchedule` telle quelle) continue de servir sous ce seuil.
- La grille est purement une **nouvelle présentation** des mêmes données (`ScheduleSlot` + `Subject`) -- aucun changement de modèle, de Server Action, ni de la logique métier existante (`domain/schedule.ts`, `validateSlot`, `computeWeekParity`, etc.).
- Chaque case affiche au minimum le nom de la matière et l'horaire (début-fin) en texte lisible -- jamais la seule couleur pour distinguer deux matières (plancher d'accessibilité déjà en place, UX-DR).
- Deux créneaux qui se chevauchent en horaire le même jour avec des parités différentes (Semaine A / Semaine B, Story 1.4) se partagent visuellement la même case (divisée, ex. moitié haute/basse ou gauche/droite) plutôt que de se superposer illisiblement -- même intention que l'étiquette "Sem. A"/"Sem. B" déjà en place dans la vue liste, transposée à la grille.
- Ajouter un créneau reste possible depuis la grille (un déclencheur par colonne de jour, mirror du bouton "+" actuel par carte de jour). Modifier/supprimer un créneau reste possible en tapant sur sa case -- ouvre `SlotFormDialog` en mode édition (déjà existant), qui gagne un bouton "Supprimer" dans son pied de page pour cette story (les cases de la grille étant trop petites pour porter deux icônes séparées modifier/supprimer comme la vue liste actuelle).
- Chaque case a une hauteur minimale garantissant un tap confortable même pour un créneau très court (ex. 30 min), quitte à exagérer légèrement sa taille visuelle par rapport à sa durée réelle.
- Palette et pastille de matière réutilisées telles quelles (`--subject-{1..8}`, `domain/schedule.ts::assignNextColorIndex`, AD-6) -- aucune nouvelle couleur introduite.
- Respecter le plancher d'accessibilité déjà en place (texte ≥16px pour le contenu principal de la case ; les métadonnées secondaires -- horaire, étiquette de parité -- peuvent rester en corps réduit comme déjà pratiqué ailleurs, ex. `SlotRow`).

**Ask First:** Aucune.

**Never:** Glisser-déposer pour déplacer/redimensionner un créneau directement dans la grille (hors périmètre, interaction complexe non demandée). Modifier le comportement de la vue mobile (liste). Changer le seuil responsive existant. Modifier le modèle de données ou les Server Actions (`actions/schedule.ts`) au-delà de l'ajout du bouton "Supprimer" dans `SlotFormDialog`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Écran ≥768px, créneaux existants | Semaine avec créneaux variés | Grille 7 colonnes, chaque créneau positionné/dimensionné selon son horaire réel | N/A |
| Écran <768px | Idem | Vue liste actuelle inchangée (aucune grille) | N/A |
| Aucun créneau saisi | Semaine vide | Grille vide avec fenêtre horaire par défaut (ex. 8h-18h), message neutre par colonne ou global | N/A |
| Créneau très tôt/tard (ex. 7h ou 19h) | Un créneau hors de la fenêtre par défaut | La fenêtre horaire de la grille s'élargit pour l'inclure entièrement | N/A |
| Créneau très court (ex. 30 min) | Un créneau de courte durée | Case affichée avec une hauteur minimale tapable, pas rognée/illisible | N/A |
| Deux créneaux Semaine A / Semaine B au même jour+horaire | Chevauchement exact (Story 1.4) | Case divisée en deux, chaque moitié étiquetée et tapable indépendamment vers son propre `SlotFormDialog` d'édition | N/A |
| Tap sur une case | Créneau existant | Ouvre `SlotFormDialog` pré-rempli (édition) | N/A |
| Bouton "Supprimer" dans `SlotFormDialog` en mode édition | Créneau existant | Supprime le créneau (même action que l'icône corbeille actuelle de `SlotRow`), ferme le dialogue | Message d'erreur affiché si l'action échoue, dialogue reste ouvert |
| Tap sur le déclencheur "+" d'une colonne de jour | Aucun créneau sélectionné | Ouvre `SlotFormDialog` en création, jour pré-rempli (mirror du comportement actuel) | N/A |

</frozen-after-approval>

## Code Map

- `domain/schedule.ts` -- nouvelles fonctions pures : `timeToMinutes(time: string): number` (parse "HH:mm" -> minutes depuis minuit, réutilise `TIME_PATTERN`) ; `computeGridWindow(slots, defaultStart="08:00", defaultEnd="18:00"): {start: string; end: string}` (élargit la fenêtre par défaut pour englober tout créneau qui déborderait, arrondi à l'heure) ; `computeSlotLayout(slot, windowStart, windowEnd): {topPercent: number; heightPercent: number}` (position/hauteur en pourcentage de la fenêtre, hauteur plancher appliquée en CSS plutôt qu'ici pour rester une fonction pure indépendante du rendu)
- `domain/schedule.test.ts` -- tests unitaires des 3 nouvelles fonctions (bornes exactes, créneau débordant, créneau à cheval sur une heure)
- `components/schedule/week-grid.tsx` (nouveau) -- la grille elle-même : en-tête des 7 jours, axe des heures (libellés `8h`, `9h`, ... calculés depuis la fenêtre), une colonne par jour en position relative contenant les cases positionnées en absolu ; gère le regroupement/division des créneaux Semaine A/B qui se chevauchent (même tri stable horaire+parité déjà utilisé par `week-schedule.tsx`)
- `components/schedule/week-schedule.tsx` -- gagne le rendu conditionnel : `WeekGrid` à partir de `md` (768px), vue liste actuelle en dessous (media query CSS via classes Tailwind `hidden md:block` / `md:hidden`, comme le fait déjà implicitement la grille CSS existante -- pas de détection JS de largeur, cohérent avec l'absence de logique responsive côté client ailleurs dans l'app)
- `components/schedule/slot-form-dialog.tsx` -- ajoute un bouton "Supprimer" dans `DialogFooter`, visible uniquement en mode édition (`isEdit`), appelant `deleteSlot` (déjà existant, `actions/schedule.ts`) puis fermant le dialogue au succès
- `components/schedule/slot-row.tsx` -- inchangé (reste le rendu de la vue liste mobile)

## Tasks & Acceptance

**Execution:**
- [ ] `domain/schedule.ts`, `domain/schedule.test.ts` -- `timeToMinutes`/`computeGridWindow`/`computeSlotLayout` purs + tests -- pose le calcul de positionnement
- [ ] `components/schedule/week-grid.tsx` -- grille 7 colonnes avec cases positionnées, division des chevauchements Semaine A/B, déclencheurs "+"/tap-pour-éditer
- [ ] `components/schedule/slot-form-dialog.tsx` -- bouton "Supprimer" en mode édition
- [ ] `components/schedule/week-schedule.tsx` -- bascule liste/grille au seuil `md` existant
- [ ] Vérification manuelle responsive : mobile (liste inchangée), tablette/desktop (grille), créneau très court, chevauchement A/B, ajout/édition/suppression depuis la grille

**Acceptance Criteria:**
- Given un écran ≥768px avec des créneaux variés, when j'ouvre l'onglet "Semaine", then je vois une grille avec un jour par colonne et mes créneaux positionnés selon leur horaire réel, comme un vrai emploi du temps
- Given un écran <768px, when j'ouvre l'onglet "Semaine", then le comportement est identique à avant cette story (liste par jour)
- Given deux créneaux Semaine A et Semaine B au même jour+horaire, when je consulte la grille, then les deux sont visibles et distinguables dans la même case, chacun modifiable indépendamment
- Given une case de la grille, when je tape dessus, then je peux modifier le créneau ou le supprimer directement depuis le dialogue

## Spec Change Log

**Itération 1 (revue post-implémentation)** — implémentation initiale conforme au spec gelé, sans renégociation d'intent/boundaries. Revue adversariale à 3 couches (blind-hunter relancé une fois après un échec technique, edge-case-hunter, verification-gap) en parallèle sur le diff complet ; correctifs appliqués : compensation du plancher de hauteur pour qu'un créneau court en fin de fenêtre ne déborde jamais de sa colonne ; largeur plancher pour les cases divisées à 3+ créneaux ; largeur minimale des colonnes de jour + défilement horizontal de secours ; `aria-label` du déclencheur de case incluant désormais la parité (le `aria-label` d'un bouton remplace tout texte descendant, rendant le `sr-only` de parité inatteignable tel quel) ; contraste du badge de parité renforcé (fond quasi opaque plutôt qu'un voile clair, insuffisant sur les couleurs de matière claires) ; tri chronologique explicite des créneaux avant regroupement (cohérence avec la vue liste) ; message "Aucun créneau cette semaine" ajouté (manquait, pourtant déjà requis par l'I/O matrix gelée) ; **le bouton "Supprimer" est devenu strictement opt-in** (`showDeleteButton`, activé uniquement par la grille) après qu'une revue a découvert qu'il apparaissait aussi dans le dialogue de la vue liste (`SlotRow`), redondant avec son icône corbeille existante et avec des erreurs non remontées à la bannière de la page ; défilement vertical de secours (max-height) ajouté sans plafonner le calcul de la fenêtre horaire elle-même (qui reste dynamique, conformément au Boundaries gelé) ; formule de palette cyclique dédupliquée entre `SubjectTag` et la grille (`domain/schedule.ts::normalizeSubjectColorIndex`, testée). Pistes réelles mais hors périmètre ou déjà couvertes par un gap pré-existant loguées dans `deferred-work.md` : fermeture du dialogue pendant une requête en cours (pattern déjà accepté ailleurs dans l'app), absence de test de composant pour la logique de regroupement de la grille (aucun harnais de test de composant n'existe nulle part dans ce dépôt), collision visuelle pour un chevauchement non-exact (hors du périmètre explicite de l'I/O matrix, qui ne couvre que le chevauchement exact).

## Design Notes

La fenêtre horaire de la grille (`domain/schedule.ts::computeGridWindow`) n'est volontairement jamais plafonnée (Boundaries gelé) même si un créneau aberrant (faute de frappe, ex. 05h au lieu de 15h) peut produire une grille très haute -- un défilement vertical de secours (`max-h-[720px] overflow-y-auto`) absorbe ce cas sans jamais rogner ni fausser le calcul de fenêtre lui-même, qui reste la source de vérité.

Le bouton "Supprimer" ajouté à `SlotFormDialog` est strictement opt-in (`showDeleteButton`, jamais activé par défaut) : seule la grille (dont les cases n'ont pas la place pour une icône corbeille séparée) l'active. La vue liste (`SlotRow`) garde son icône corbeille existante inchangée, sans second bouton redondant dans le dialogue.

## Verification

**Commands:**
- `npx vitest run domain/schedule.test.ts` -- expected: nouvelles fonctions de positionnement couvertes
- `npm run build` -- expected: build de production réussit
- `npx tsc --noEmit` / `npx eslint .` -- expected: aucune erreur

**Manual checks (if no CLI):**
- Redimensionner à 375px (mobile) : vue liste inchangée
- Redimensionner à 1024px (desktop) : grille avec créneaux positionnés correctement, en-tête des heures lisible
- Ajouter un créneau de 30 min : case tapable, pas illisible
- Créer un créneau Semaine A et un Semaine B au même horaire : case divisée, les deux modifiables
- Modifier puis supprimer un créneau directement depuis la grille (tap → dialogue → Supprimer)

**Résultats (session d'implémentation) :**
- `npx vitest run` -- OK, 159/159 tests passent, incluant les nouvelles fonctions pures (`timeToMinutes`, `computeGridWindow`, `computeSlotLayout`, `normalizeSubjectColorIndex`).
- `npx tsc --noEmit` / `npx eslint .` -- OK, aucune erreur.
- `npm run build` -- OK, build de production réussit.
- Revue adversariale à 3 couches (blind-hunter, edge-case-hunter, verification-gap) en parallèle sur le diff complet -- voir Spec Change Log pour le détail des correctifs appliqués et des pistes déférées.
- Vérifié dans le navigateur (`npm run dev`) : à 1200px, la grille affiche les créneaux positionnés par horaire réel, avec les cases Semaine A/B divisées et étiquetées ; à 375px, la vue liste reste identique à avant cette story (vérifié par inspection directe du DOM : wrapper grille `display:none`, wrapper liste `display:flex`) ; le dialogue ouvert depuis une case de la grille contient "Supprimer", celui ouvert depuis l'icône crayon de la vue liste ne le contient pas.

## Suggested Review Order

**Compensation du plancher de hauteur (correction du débordement)**

- Le plancher de hauteur (créneau court) grandit vers le bas ; `top` est remonté d'autant que nécessaire pour ne jamais déborder de la colonne.
  [`components/schedule/week-grid.tsx:132`](../../components/schedule/week-grid.tsx#L132)

**`aria-label` porte la parité (le `sr-only` descendant était inatteignable)**

- Un `aria-label` sur un déclencheur remplace tout texte descendant pour le nom accessible -- la parité doit donc y être incluse directement.
  [`components/schedule/week-grid.tsx:149`](../../components/schedule/week-grid.tsx#L149)

**Bouton "Supprimer" strictement opt-in**

- `showDeleteButton` (défaut `false`) évite qu'il apparaisse aussi dans le dialogue de la vue liste, redondant avec l'icône corbeille de `SlotRow`.
  [`components/schedule/slot-form-dialog.tsx:46`](../../components/schedule/slot-form-dialog.tsx#L46)

**Fenêtre horaire jamais plafonnée, défilement de secours à la place**

- `computeGridWindow` reste dynamique et sans borne haute (Boundaries gelé) ; `max-h-[720px] overflow-y-auto` absorbe le cas d'un créneau aberrant sans fausser le calcul.
  [`domain/schedule.ts:618`](../../domain/schedule.ts#L618), [`components/schedule/week-grid.tsx:67`](../../components/schedule/week-grid.tsx#L67)

**Bascule liste/grille purement CSS, seuil inchangé**

- `hidden md:block` / `flex flex-col gap-4 md:hidden` -- aucune détection JS de largeur, cohérent avec le reste de l'app.
  [`components/schedule/week-schedule.tsx:52`](../../components/schedule/week-schedule.tsx#L52)
