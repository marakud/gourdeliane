---
title: 'Story 1.3 — Voir ma journée et mon lendemain'
type: 'feature'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '3c04f483280a77c0c5315fd0c6ae54a6a0c7c9b3'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'écran Emploi du temps (Story 1.2) n'a qu'une vue semaine complète -- l'enfant doit chercher dans un tableau pour savoir ce qu'il a aujourd'hui ou demain, alors que c'est l'usage le plus fréquent au quotidien.

**Approach:** Ajouter deux vues "Aujourd'hui" et "Demain" à `app/edt/page.tsx` (onglets à côté de "Semaine"), calculées côté serveur à partir du jour scolaire courant (AD-4, fuseau Europe/Paris fixe), affichant les créneaux du jour concerné ou un message neutre si ce jour est "sans cours".

## Boundaries & Constraints

**Always:**
- "Aujourd'hui" et "demain" se calculent côté serveur en fuseau `Europe/Paris` fixe, jamais depuis l'heure locale du client (AD-4) -- fonction pure dans `domain/`, `now: Date` passé en paramètre explicite (jamais lu en interne) pour rester testable sans horloge système.
- "Demain" désigne le jour calendaire suivant immédiat (pas le prochain jour ayant des créneaux) : si demain est un jour marqué "sans cours" (ou un jour de la semaine sans aucun créneau saisi), la vue "Demain" l'indique tel quel par un message neutre -- elle ne saute pas plus loin dans le calendrier (cf. Design Notes).
- Un jour affiché ("Aujourd'hui" ou "Demain") sans créneau -- qu'il soit explicitement marqué `NoSchoolDay` ou simplement un jour de la semaine sans créneau saisi -- affiche un message neutre et positif, jamais une liste vide qui ressemble à un bug (ton PRD, UX-DR10).
- La vue "Semaine" existante (Story 1.2) reste accessible et inchangée dans son comportement.
- Chaque créneau affiché montre sa pastille de matière colorée (UX-DR7, `SubjectTag` déjà existant, réutilisé tel quel).
- Respecter le plancher d'accessibilité déjà en place (tap ≥44px, texte ≥16px).

**Ask First:** Aucune.

**Never:** Calculer "aujourd'hui"/"demain" côté client (AD-4). Modifier le modèle de données (`Subject`/`ScheduleSlot`/`NoSchoolDay` restent inchangés -- cette story est une lecture, pas une écriture). Implémenter la logique de sac/révisions du soir (Epic 2, dépend de cette vue mais n'en fait pas partie).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Demain a des créneaux | Créneaux saisis pour le jour de semaine correspondant à demain, non marqué sans-cours | Liste des matières/horaires de demain, triée par heure, pastilles de couleur | N/A |
| Demain est marqué "sans cours" | Date de demain présente dans `NoSchoolDay` | Message neutre, pas de liste vide | N/A |
| Demain n'a aucun créneau saisi (mais pas marqué sans-cours) | Jour de semaine sans `ScheduleSlot` | Même message neutre que "sans cours" (l'enfant s'en fiche de la raison) | N/A |
| Aujourd'hui : mêmes trois cas | Symétrique à "Demain" | Comportement identique, appliqué à la date du jour | N/A |
| Changement de jour pendant la nuit | `now` calculé côté serveur passe minuit Europe/Paris | "Aujourd'hui"/"Demain" se recalculent au prochain chargement de page (pas de temps réel requis) | N/A |

</frozen-after-approval>

## Code Map

- `domain/school-day.ts` (nouveau) -- fonctions pures : jour calendaire Europe/Paris pour un instant donné, jour suivant, jour de la semaine (`Weekday`) correspondant ; tout prend `now: Date` en paramètre explicite
- `domain/school-day.test.ts` -- tests unitaires : passage de minuit, fin de mois, fin d'année, autour d'un changement d'heure DST
- `data/schedule.ts` -- probablement inchangé (`getScheduleForUser` retourne déjà créneaux + `noSchoolDays`, suffisant pour dériver les vues jour côté page)
- `components/schedule/day-view.tsx` (nouveau) -- affiche les créneaux d'un jour donné (triés par heure, `SubjectTag` réutilisé) ou le message neutre
- `components/schedule/edt-view-tabs.tsx` (nouveau, ou intégré à `week-schedule.tsx`) -- bascule Aujourd'hui / Demain / Semaine
- `app/edt/page.tsx` -- calcule aujourd'hui/demain via `domain/school-day.ts` (server-side, AD-4), dérive leurs créneaux/statut sans-cours à partir des données déjà chargées, passe le tout aux nouveaux composants

## Tasks & Acceptance

**Execution:**
- [x] `domain/school-day.ts`, `domain/school-day.test.ts` -- calcul pur aujourd'hui/demain en Europe/Paris + jour de semaine correspondant, avec tests couvrant les changements de jour/mois/année/DST -- couvre AD-4
- [x] `components/schedule/day-view.tsx` -- vue d'un jour (liste triée par heure + pastilles, ou message neutre) -- couvre la matrice I/O
- [x] `components/schedule/edt-view-tabs.tsx` (ou équivalent), `app/edt/page.tsx` -- intégrer Aujourd'hui/Demain/Semaine comme onglets de l'écran EDT existant -- couvre FR-2

**Acceptance Criteria:**
- Given un EDT saisi avec des créneaux pour demain, when j'ouvre la vue "Demain", then je vois la liste des matières et horaires du jour scolaire suivant, triée par heure, avec pastille de couleur
- Given demain est marqué "sans cours" (ou n'a aucun créneau saisi), when j'ouvre la vue "Demain", then un message neutre l'indique, pas une liste vide
- Given l'EDT complet de la semaine, when j'ouvre la vue "Semaine", then tous les créneaux s'affichent comme avant (Story 1.2), organisés par jour et horaire avec pastille de couleur

## Spec Change Log

- Ajout non prévu au Code Map : `app/edt/page.tsx` appelle désormais `connection()` (`next/server`) avant tout calcul/requête. Sans cet appel, Next.js (modèle de cache "component-level" par défaut, cf. AGENTS.md) prérendrait la page au moment du `build` -- ni `new Date()` ni la requête Prisma (pilote `better-sqlite3` synchrone en dev) ne sont des "Request-time APIs" qui la rendraient dynamique d'elles-mêmes -- et "aujourd'hui"/"demain" resteraient figés au jour du déploiement au lieu de se recalculer à chaque chargement de page (AD-4, cf. I/O matrix "Changement de jour pendant la nuit"). Vérifié via `npm run build` : la route `/edt` passe de `○ (Static)` à `ƒ (Dynamic)` après l'ajout.

## Design Notes

FR-2 (PRD) dit "la vue Demain reflète le jour scolaire suivant, en sautant les jours marqués sans cours" -- lu à première vue comme "cherche le prochain jour AVEC cours". Ce n'est pas l'interprétation retenue ici : l'AC de la story 1.3 (epics.md) est explicite -- si demain est sans cours, on affiche un message neutre pour demain, on ne saute pas au jour suivant. C'est aussi la lecture qui a du sens produit : dire à l'enfant vendredi soir "pas cours samedi" est l'information utile, pas lui montrer par erreur l'EDT de lundi en le présentant comme "demain". La phrase FR-2 concerne plutôt la logique de dérivation du sac/révisions (Epic 2), pas cet écran.

**Revue post-implémentation (blind hunter / edge-case hunter / verification-gap) :** `deriveDaySlots` vivait dans `app/edt/page.tsx` (logique de dérivation pure -- filtre par jour + annulation "sans cours" -- mais placée hors de `domain/`) et n'avait aucun test. Déplacée dans `domain/schedule.ts` (AD-1) avec 4 tests dédiés. La bascule d'onglets (`edt-view-tabs.tsx`) n'avait que la souris -- ajout de la navigation clavier standard (flèches gauche/droite, Home/End, roving `tabIndex`) attendue du pattern ARIA `tablist`/`tab`, vérifiée en dispatchant les événements clavier directement dans le navigateur.

**Note (pas un bug) :** les messages "Pas cours aujourd'hui"/"Pas cours demain" reprennent tels quels le ton établi par EXPERIENCE.md ("Pas cours demain, profite de ta soirée.") -- volontairement sans "de", conforme à la copie produit existante.

**Note (pas un bug, comportement volontaire) :** un jour de fin de semaine sans aucun créneau saisi (WEEKDAYS couvre les 7 jours) affiche naturellement le même message neutre qu'un jour "sans cours" explicite -- comportement voulu par l'I/O matrix, pas une conséquence accidentelle d'un tableau de jours incomplet.

## Verification

**Commands:**
- `npx vitest run` -- expected: tests de `domain/school-day.ts` et `domain/schedule.ts` (dont `deriveDaySlots`) passent
- `npm run build`, `npx tsc --noEmit`, `npm run lint` -- expected: aucune erreur
- Après tout changement futur à `app/edt/page.tsx` : revérifier dans la sortie de `npm run build` que la route `/edt` reste `ƒ (Dynamic)`, pas `○ (Static)` -- pas de garde automatisée pour cette régression précise (pas d'infra e2e dans ce projet, cf. architecture Deferred), c'est une vérification manuelle à refaire à chaque fois que cette page est touchée.

**Résultats (session d'implémentation + revue) :**
- `npx vitest run` -- OK, 29/29 tests passent (`domain/schedule.test.ts` 15, `domain/school-day.test.ts` 12, `data/schedule.test.ts` 2).
- `npm run build` -- OK, `/edt` confirmé `ƒ (Dynamic)`.
- Vérifié dans le navigateur : rendu des 3 onglets, navigation clavier flèches/Home/End fonctionnelle (testée en dispatchant les événements clavier directement dans le DOM).

**Manual checks (if no CLI):**
- Ouvrir l'onglet "Aujourd'hui" et "Demain", vérifier les créneaux affichés correspondent à l'EDT saisi
- Marquer demain "sans cours" (Story 1.2), vérifier que la vue "Demain" affiche le message neutre
- Vérifier que la vue "Semaine" existante n'a pas régressé

## Suggested Review Order

**Calcul du jour scolaire (AD-4, Europe/Paris fixe)**

- Point d'entrée : conversion de l'instant `now` vers le jour calendaire réellement vécu à Paris via `Intl.DateTimeFormat`, jamais de décalage calculé à la main.
  [`school-day.ts:24`](../../domain/school-day.ts#L24)

- "Demain" calculé par arithmétique de date à midi UTC (jamais minuit) pour rester loin de toute frontière de changement d'heure.
  [`school-day.ts:51`](../../domain/school-day.ts#L51)

- Jour de la semaine dérivé du triplet année/mois/jour déjà résolu, indépendamment de tout fuseau.
  [`school-day.ts:66`](../../domain/school-day.ts#L66)

- Tests couvrant minuit, fin de mois/année, et les deux transitions DST 2026 (dates vérifiées manuellement).
  [`school-day.test.ts:9`](../../domain/school-day.test.ts#L9)

**Dérivation des créneaux d'un jour (déplacée en domain/ pendant la revue)**

- Filtre par jour de semaine + trie par heure, sauf annulation si la date est "sans cours" -- pure, testée indépendamment de la page.
  [`schedule.ts:128`](../../domain/schedule.ts#L128)

**Rendre la page dynamique (sinon "aujourd'hui" se fige au build)**

- `connection()` force le rendu par requête -- sans ça, Next.js pourrait prérendre `/edt` une fois pour toutes au build.
  [`app/edt/page.tsx:21`](../../app/edt/page.tsx#L21)

**Bascule d'onglets accessible (ajouté pendant la revue)**

- Navigation clavier standard du pattern ARIA tablist (flèches, Home/End) + roving `tabIndex`.
  [`edt-view-tabs.tsx:44`](../../components/schedule/edt-view-tabs.tsx#L44)
