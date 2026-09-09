---
title: 'Story 1.4 — Alterner mes semaines A et B'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '54c40df0b371823746d77cdaf6fb63b668d16b1'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'EDT actuel (Story 1.2) suppose qu'un créneau (`ScheduleSlot`) vaut à l'identique toutes les semaines, identifié uniquement par `weekday` + horaires — décision explicitement actée à l'époque ("Pas d'alternance A/B, PRD confirmé, Deferred par l'architecture"). Or le collège de l'utilisateur fonctionne en alternance semaine A / semaine B : à un même jour+horaire, la matière peut différer selon la semaine. Cette story lève cette limitation, désormais demandée explicitement par l'utilisateur.

**Approach:** Ajouter une parité optionnelle (`weekParity: "A" | "B" | null`, `null` = "toutes les semaines", rétrocompatible) sur `ScheduleSlot`, plus un réglage utilisateur (`weekAReferenceMonday`) permettant de calculer, pour une date donnée, si elle tombe en semaine A ou B. Les vues "Aujourd'hui"/"Demain" (Story 1.3) filtrent désormais aussi par la parité du jour concerné ; la vue "Semaine" (récurrente, Story 1.2) continue d'afficher tous les créneaux mais désambiguïse ceux qui partagent un jour+horaire via une étiquette de parité. Un nouveau réglage dans Réglages permet de déclarer "cette semaine est la semaine A/B", point de référence pour tout calcul futur.

**Hors périmètre volontaire (découplé à la demande explicite de l'utilisateur) :** la refonte visuelle de l'EDT en grille horaire type "vrai emploi du temps" est un chantier séparé, traité après celui-ci. Cette story ne touche donc pas la mise en page de `week-schedule.tsx`/`day-view.tsx`, seulement les données et le filtrage.

## Boundaries & Constraints

**Always:**
- `ScheduleSlot.weekParity` est optionnel (`null` = toutes les semaines) — tout créneau existant reste inchangé en comportement (migration purement additive, aucun backfill nécessaire).
- La parité d'une date donnée se calcule côté pur (`domain/`) à partir d'une seule référence stockée : `User.weekAReferenceMonday` (un lundi connu appartenant à la semaine A). Aucune dépendance à un calendrier scolaire externe (cohérent avec `NoSchoolDay`, saisie manuelle uniquement, PRD confirmé en 1.2).
- Tant que `weekAReferenceMonday` n'est pas configuré, créer/modifier un créneau en "Semaine A" ou "Semaine B" est rejeté avec un message clair invitant à configurer la référence dans Réglages d'abord — jamais de parité "silencieusement ignorée".
- "Aujourd'hui" et "Demain" (Story 1.3) calculent chacun leur propre parité à partir de leur propre date — ne jamais réutiliser une parité "du jour" pour "demain" (cas limite : aujourd'hui dimanche, demain lundi = nouvelle semaine, parité potentiellement différente).
- La vue "Semaine" (récurrente) continue d'afficher l'ensemble des créneaux (toutes parités confondues) groupés par jour, comme aujourd'hui ; un créneau avec parité affiche une étiquette textuelle "Sem. A"/"Sem. B" (jamais la seule couleur, plancher d'accessibilité déjà en place) pour désambiguïser deux matières au même horaire.
- Toute mutation de créneau ou du réglage de référence passe par une Server Action retournant `{ ok: true, data } | { ok: false, error }` (AD-1), toute règle de validation vit dans `domain/`, pure.
- Migrations dev (SQLite) et prod (Postgres) évoluent toutes les deux, chacune dans son propre dossier, générées sans connexion à une base réelle (convention établie).

**Ask First:** Aucune.

**Never:** Refonte visuelle de la grille EDT (chantier séparé, demandé explicitement après celui-ci). Parité appliquée aux devoirs programmés (Story 2.4) — `filterDevoirsForWeekday`, `computeWeeklyFreeGaps` et le picker de créneaux libres restent volontairement agnostiques de la parité (calcul conservateur sur l'union des deux semaines, cf. Design Notes) : les devoirs n'ont pas de date, seulement un jour+horaire récurrent, et ce n'est pas la demande de cette story. Import/calcul automatique de la parité depuis un calendrier scolaire officiel. Validation de chevauchement entre deux créneaux (aucun contrôle de ce type n'existe aujourd'hui, hors périmètre).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Créer un créneau "Toutes les semaines" | Formulaire créneau, parité non sélectionnée | `ScheduleSlot.weekParity = null`, comportement identique à avant cette story | N/A |
| Créer un créneau "Semaine A" sans référence configurée | Formulaire créneau, parité "A", `User.weekAReferenceMonday` = null | Rejeté par la Server Action | `{ ok:false, error }` invitant à configurer la référence dans Réglages |
| Créer un créneau "Semaine A" puis "Semaine B" au même jour+horaire (référence configurée) | Deux créneaux, même `weekday`+`startTime`, parités différentes | Les deux coexistent en base, chacun affiché seulement les semaines concernées | N/A |
| Vue "Aujourd'hui", référence configurée | Date du jour tombant en semaine B | Seuls les créneaux `weekParity = null` ou `= "B"` de ce jour s'affichent | N/A |
| "Demain" à cheval sur un changement de semaine | Aujourd'hui = dimanche (dernier jour semaine A), demain = lundi (semaine B) | La parité de "demain" est recalculée indépendamment de celle d'"aujourd'hui" | N/A |
| Vue "Semaine" (récurrente) | Créneaux A et B au même jour+horaire | Les deux lignes s'affichent, chacune étiquetée "Sem. A"/"Sem. B" | N/A |
| Déclarer "cette semaine = semaine A" dans Réglages | Aucune référence, ou référence déjà existante | `weekAReferenceMonday` mis à jour au lundi de la semaine en cours ; Aujourd'hui/Demain recalculés au prochain chargement, sans toucher aux créneaux existants | N/A |
| Déclarer "cette semaine = semaine B" | idem | `weekAReferenceMonday` mis au lundi de la semaine précédente (pour que la semaine en cours calcule bien "B") | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` + `prisma/production/schema.prisma` + nouvelles migrations (additives uniquement) — nouvel enum `WeekParity { A B }`, `ScheduleSlot.weekParity WeekParity?`, `User.weekAReferenceMonday DateTime?` ; mise à jour du commentaire au-dessus de `Weekday` qui documentait à tort l'absence d'alternance A/B
- `domain/schedule.ts` — `computeWeekParity(dateIso, weekAReferenceMondayIso): "A" | "B"` pure (ancrage UTC minuit, cohérent avec `computeDaysRemaining`), `deriveDaySlots` gagne un 5e paramètre optionnel `weekParity?: "A" | "B" | null` (rétrocompatible, signature existante à 4 arguments inchangée), `validateSlot`/`ScheduleSlotInput` gagnent `weekParity?: string | null`
- `data/schedule.ts` — `CreateSlotData`/`UpdateSlotData` gagnent `weekParity: "A" | "B" | null`, transmis dans `createScheduleSlot`/`updateScheduleSlot`
- `data/user.ts` (existant, `ensureSeedUser`) — lecture/écriture de `weekAReferenceMonday`
- `actions/schedule.ts` — `SlotFormInput.weekParity?: string` ("" = toutes les semaines), validation "référence requise si A/B" avant `createSlot`/`updateSlot`
- `actions/settings.ts` (nouveau, ou extension d'un fichier existant équivalent) — `setCurrentWeekParity({ parity: "A" | "B" })`, calcule le lundi de la semaine en cours côté serveur et dérive `weekAReferenceMonday`
- `app/edt/page.tsx`, `app/(accueil)/page.tsx` — calculent la parité de chaque date concernée (aujourd'hui, demain — séparément) via `computeWeekParity`, la passent à `deriveDaySlots`
- `app/reglages/page.tsx` + nouveau composant (ex. `components/settings/week-parity-card.tsx`) — affiche la parité actuelle calculée (ou invite à configurer), boutons "Cette semaine = Semaine A/B"
- `components/schedule/slot-form-dialog.tsx` — nouveau `Select` "Cette matière a lieu :" (Toutes les semaines / Semaine A / Semaine B)
- `components/schedule/week-schedule.tsx`, `slot-row.tsx` — tri stable par horaire puis parité, étiquette "Sem. A"/"Sem. B" sur `SlotRow` quand `weekParity` non nul ; **pas de changement de mise en page/grille** (hors périmètre, cf. Boundaries)

## Tasks & Acceptance

**Execution:**
- [ ] `prisma/schema.prisma`, migration dev — `WeekParity` enum, `ScheduleSlot.weekParity`, `User.weekAReferenceMonday` — pose le modèle de données
- [ ] `prisma/production/schema.prisma`, migration prod générée offline — même évolution Postgres
- [ ] `domain/schedule.ts` — `computeWeekParity` pure + tests unitaires (semaine A, semaine B, changement de semaine dimanche→lundi, semaines négatives/antérieures à la référence)
- [ ] `deriveDaySlots` — filtrage optionnel par parité + tests (rétrocompatibilité 4-arg, filtrage 5-arg)
- [ ] `data/schedule.ts`, `data/user.ts`, `actions/schedule.ts`, `actions/settings.ts` — flux complet `weekParity` + réglage de référence, avec le rejet "référence non configurée"
- [ ] `app/reglages/page.tsx` — carte "Semaine A/B"
- [ ] `components/schedule/slot-form-dialog.tsx` — sélecteur de parité
- [ ] `app/edt/page.tsx`, `app/(accueil)/page.tsx`, `week-schedule.tsx`, `slot-row.tsx` — branchement du filtrage Aujourd'hui/Demain + étiquette vue Semaine
- [ ] Vérification manuelle : créer deux créneaux A/B au même horaire, configurer la référence, vérifier Aujourd'hui/Demain/Semaine

**Acceptance Criteria:**
- Given aucun réglage de référence, when je crée un créneau "Semaine A", then c'est rejeté avec un message m'invitant à configurer la référence dans Réglages
- Given la référence configurée et deux créneaux (A et B) au même jour+horaire, when je consulte "Aujourd'hui", then seul le créneau de la parité du jour s'affiche (ou le créneau "toutes les semaines" s'il existe)
- Given aujourd'hui dimanche (fin de semaine A) et demain lundi (début semaine B), when je consulte "Demain", then la parité affichée est bien B, indépendamment de celle d'aujourd'hui
- Given la vue "Semaine", when deux créneaux partagent jour+horaire avec des parités différentes, then les deux s'affichent, chacun étiqueté sans ambiguïté

## Spec Change Log

**Itération 1 (revue post-implémentation)** — implémentation initiale conforme au spec gelé, sans renégociation d'intent/boundaries. Revue adversariale à 3 couches (blind-hunter, edge-case-hunter, verification-gap) en parallèle sur le diff complet ; correctifs appliqués : ajout de tests d'intégration manquants pour le garde-fou "référence requise" (`actions/schedule.test.ts`, nouveau), pour `setCurrentWeekParity` (`actions/settings.test.ts`, nouveau) et pour la validation de `weekParity` dans `validateSlot` (`domain/schedule.test.ts`) -- signal convergent des 3 revues sur ce point précis. Correctifs d'accessibilité additionnels : `aria-pressed` sur les boutons Semaine A/B de Réglages, expansion accessible ("Semaine A"/"Semaine B" complet, pas seulement l'abrégé "Sem. A"/"Sem. B") sur l'étiquette de la vue Semaine, garde anti-double-clic sur les boutons de bascule. Trois pistes réelles mais hors périmètre ou à risque non-atteignable aujourd'hui loguées dans `deferred-work.md` plutôt que corrigées : pas de moyen de réinitialiser `weekAReferenceMonday` une fois configuré, le bloc "Devoirs programmés" reste volontairement agnostique de la parité (déjà écrit dans le Never du spec gelé), et l'absence de validation de format sur les chaînes ISO internes à `computeWeekParity` (aucun appelant réel n'atteint ce chemin aujourd'hui).

## Design Notes

Le calcul de parité (`domain/schedule.ts::computeWeekParity`) ancre la comparaison sur le **lundi** de chaque semaine calendaire plutôt que sur la date brute -- ainsi n'importe quel jour d'une même semaine calendaire renvoie la même parité, et le nombre de semaines d'écart (potentiellement négatif si la date est antérieure à la référence) est ramené dans `[0, 2)` via un modulo signé-safe.

`User.weekAReferenceMonday` est dérivé, jamais saisi directement par l'utilisateur : Réglages n'expose que "cette semaine = semaine A/B" (`actions/settings.ts::setCurrentWeekParity`), qui calcule le lundi de la semaine en cours côté serveur (jamais côté client) et le décale d'une semaine en arrière pour la déclaration "B" -- garde le concept "un lundi appartenant à la semaine A" comme unique représentation stockée, plutôt que de stocker la parité choisie telle quelle.

`computeWeeklyFreeGaps` (Story 2.4, calcul des trous libres pour programmer un devoir) n'a délibérément **pas** été rendu sensible à la parité : un devoir programmé porte sur un jour+horaire récurrent, pas une date précise, donc le calcul continue de traiter l'union des créneaux des deux semaines comme "occupé" -- décision conservatrice (peut sous-estimer la disponibilité réelle d'une semaine donnée) mais qui évite de jamais proposer un trou en réalité occupé une semaine sur deux. Documenté explicitement dans le Never du spec gelé.

## Verification

**Commands:**
- `npx prisma migrate dev` — expected: migration additive appliquée sans erreur (SQLite)
- `npx prisma validate --schema=prisma/production/schema.prisma` — expected: schéma Postgres valide
- `npm run build` — expected: build de production réussit
- `npx vitest run` (`domain/schedule.test.ts`) — expected: couvre `computeWeekParity` et le filtrage par parité de `deriveDaySlots`

**Manual checks (if no CLI):**
- Configurer "cette semaine = semaine A" dans Réglages, créer un créneau "Semaine A" et un "Semaine B" au même jour+horaire, vérifier qu'Aujourd'hui/Demain n'affichent que le bon
- Vérifier la vue Semaine : les deux créneaux coexistent avec étiquette de parité
- Basculer le réglage sur "semaine B", vérifier que l'affichage change en conséquence sans recréer de créneaux

**Résultats (session d'implémentation) :**
- `npx prisma migrate dev` -- OK, migration `20260908200933_add_week_parity` appliquée sans erreur (SQLite, additive pure, aucun backfill nécessaire). Une réinitialisation de `dev.db` a été requise au préalable (checksum d'une migration Story 2.4 antérieure modifiée après application) -- confirmé sans risque (base locale, non suivie par git) et exécutée avec l'accord explicite de l'utilisateur.
- `npx prisma validate --schema=prisma/production/schema.prisma` -- OK, schéma Postgres valide ; migration prod générée offline via `prisma migrate diff` (`CREATE TYPE "WeekParity"`, deux `ALTER TABLE` additifs).
- `npx tsc --noEmit` -- OK, aucune erreur.
- `npx eslint .` -- OK, aucun avertissement.
- `npm run build` -- OK, build de production réussit.
- `npx vitest run` -- OK, 134/134 tests passent (11 fichiers), incluant `computeWeekParity`/`mondayOfIso`/`shiftIsoDays`/filtrage par parité de `deriveDaySlots` (nouveaux, `domain/schedule.test.ts`), les cas `weekParity` de `validateSlot`, et deux nouveaux fichiers d'intégration (`actions/schedule.test.ts`, `actions/settings.test.ts`) ajoutés en revue pour couvrir le garde-fou "référence requise" et `setCurrentWeekParity`.
- Revue adversariale à 3 couches (blind-hunter, edge-case-hunter, verification-gap) en parallèle sur le diff complet -- voir Spec Change Log pour le détail des correctifs appliqués et des pistes déférées.
- Vérifié dans le navigateur (`npm run dev`) : création d'un créneau "Semaine A" et d'un créneau "Semaine B" au même jour+horaire (Lundi 08:00, Mardi 08:00) -- les deux coexistent en vue Semaine avec étiquette "Sem. A"/"Sem. B" désambiguïsante ; "Aujourd'hui" (mardi, semaine A déclarée dans Réglages) n'affiche que le créneau de parité A et exclut correctement celui de parité B au même horaire ; la carte Réglages affiche "Cette semaine est la semaine A" après un clic sur le bouton correspondant.
- Confirmé en production par l'utilisateur ("ca marche") après déploiement, en même temps que les correctifs/fonctionnalités des commits suivants (fuseau horaire America/Guadeloupe, édition d'un devoir, message d'accueil).

## Suggested Review Order

**Calcul de parité ancré sur le lundi (correction des cas limites de fuseau/semaine)**

- La comparaison se fait entre les lundis des deux semaines calendaires (jamais les dates brutes), avec un modulo signé-safe pour gérer une date antérieure à la référence.
  [`domain/schedule.ts:83`](../../domain/schedule.ts#L83)

**Filtrage par parité rétrocompatible**

- 5e paramètre optionnel : omis, aucun filtrage (signature à 4 arguments préservée) ; fourni (y compris `null`), ne garde que "toutes les semaines" + la parité exacte.
  [`domain/schedule.ts:151`](../../domain/schedule.ts#L151)

**Parité calculée séparément pour aujourd'hui et demain**

- Jamais réutilisée telle quelle -- un changement de semaine peut tomber entre les deux jours.
  [`app/edt/page.tsx:75`](../../app/edt/page.tsx#L75)

**Garde-fou "référence requise" avant toute parité A/B**

- Rejet explicite si `weekAReferenceMonday` n'est pas configuré, plutôt qu'une parité silencieusement ignorée.
  [`actions/schedule.ts:74`](../../actions/schedule.ts#L74)

**Dérivation de la référence depuis "cette semaine = A/B"**

- La déclaration "B" décale le lundi de la semaine en cours d'une semaine en arrière pour garder `weekAReferenceMonday` comme unique représentation stockée.
  [`actions/settings.ts:60`](../../actions/settings.ts#L60)

**Migration additive (contraste avec le risque de backfill de la Story 2.4)**

- Aucune donnée existante touchée : `weekParity`/`weekAReferenceMonday` nullable, comportement historique intégralement préservé.
  [`prisma/migrations/20260908200933_add_week_parity/migration.sql`](../../prisma/migrations/20260908200933_add_week_parity/migration.sql)

**Tests d'intégration ajoutés en revue (garde-fou et dérivation)**

- Couvre le rejet sans référence, l'acceptation une fois configurée, et que "B" dérive bien une référence différente de "A".
  [`actions/schedule.test.ts:44`](../../actions/schedule.test.ts#L44), [`actions/settings.test.ts:32`](../../actions/settings.test.ts#L32)
