---
title: 'Retour utilisateur — Accueil : afficher un seul moment contextuel'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-7-voir-ma-soiree-organisee-en-3-blocs.md'
baseline_commit: 'c0eb365fb920024f96a56b0b0540ab178ed32c16'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Retour utilisateur direct : "il ya beaucoup d'information [sur Accueil]... l'app sera utilisé par un enfant." Accueil affiche aujourd'hui "Ce soir" (Sac+Devoirs à faire+Révisions), "Ce matin" et "Retour" TOUS empilés et dépliés en permanence, quelle que soit l'heure -- alors que l'intention UX d'origine (EXPERIENCE.md §"Repris des apps de check-in minimalistes") était un écran "contextuel qui montre ce qu'il y a à faire maintenant", une seule moment card à la fois (confirmé par les Flows 1/2/3 : "l'Accueil affiche automatiquement la moment card 'Ce soir'/'Ce matin'/'Retour'").

**Approach:** Accueil détermine LE moment pertinent selon l'heure (America/Guadeloupe fixe, AD-4) et affiche seulement son contenu par défaut. Les deux autres moments restent accessibles en un tap via un petit sélecteur d'onglets (même pattern que `EdtViewTabs`, déjà utilisé sur /edt) -- rien n'est supprimé, seulement replié par défaut derrière l'onglet actif.

## Boundaries & Constraints

**Always:**
- Une nouvelle fonction pure `domain/school-day.ts::getCurrentMoment(now)` détermine le moment actif à partir de fenêtres horaires fixes en `SCHOOL_TIME_ZONE` (jamais depuis l'heure locale du client, AD-4) : Matin [04h00-12h00), Retour [12h00-18h00), Soir [18h00-04h00) (chevauche minuit). Valeurs par défaut non configurables pour l'instant -- même "choix assumé, personnalisable plus tard" que `DEFAULT_MATIN_ITEMS` (Epic 3 story 3.4 permettra un jour de régler ces heures).
- Accueil affiche un sélecteur à 3 onglets ("Ce matin" / "Retour" / "Ce soir"), onglet actif par défaut = celui retourné par `getCurrentMoment`, cochable/navigable exactement comme aujourd'hui une fois un onglet affiché -- aucun changement de comportement des checklists elles-mêmes (Sac, Révisions, Devoirs à faire, Matin, Retour), seulement leur visibilité par défaut.
- Les trois panneaux restent montés simultanément dans le DOM (`hidden` sur les deux non actifs, même pattern que `EdtViewTabs`/`DayView`) -- jamais démontés/remontés au changement d'onglet, pour ne pas perdre l'état optimiste local d'un panneau déjà interagi pendant la session.
- Changer d'onglet est un choix 100% client (aucun rechargement, aucun appel serveur) -- même mécanique que `EdtViewTabs`.
- Le titre "Ce soir" affiché par `MomentSoirCard` devient redondant avec le libellé de l'onglet du même nom -- retiré (garde uniquement le badge de complétude), même logique que le nettoyage des landmarks fait en Story 2.7 pour Sac/Devoirs/Révisions.

**Ask First:** Aucune.

**Never:**
- Rendre les heures de bascule configurables dans cette story -- valeurs fixes, personnalisation explicitement hors périmètre (Epic 3, story 3.4, pas commencée).
- Masquer/supprimer un moment qui a déjà été traité (ex. "Ce matin" entièrement coché) -- reste accessible via son onglet même après complétude, seule la sélection PAR DÉFAUT change selon l'heure.
- Changer la logique de complétude, de persistance, ou les données de chaque checklist -- uniquement leur présentation (repliée derrière un onglet plutôt que toujours dépliée).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ouverture à 7h30 | `now` = 07:30 America/Guadeloupe | Onglet "Ce matin" actif par défaut | N/A |
| Ouverture à 13h00 | `now` = 13:00 | Onglet "Retour" actif par défaut | N/A |
| Ouverture à 20h00 | `now` = 20:00 | Onglet "Ce soir" actif par défaut | N/A |
| Ouverture à 1h00 du matin | `now` = 01:00 (après minuit) | Onglet "Ce soir" actif par défaut (la soirée déborde après minuit) | N/A |
| Limites exactes | `now` = 04:00 / 12:00 / 18:00 | Bascule précisément sur la borne (Matin/Retour/Soir respectivement) | N/A |
| Enfant tape sur un autre onglet | Tap sur "Retour" alors que "Ce matin" est actif par défaut | Bascule instantanée, aucun rechargement, l'état de "Ce matin" (déjà coché/pas coché) reste intact au retour sur cet onglet | N/A |
| "Ce matin" déjà entièrement coché, toujours dans sa fenêtre horaire | 4/4 coché, `now` encore dans [04h,12h) | Reste l'onglet actif par défaut malgré la complétude (pas de bascule automatique post-complétude) | N/A |

</frozen-after-approval>

## Code Map

- `domain/school-day.ts` -- nouveau type `DayMoment = "MATIN" | "RETOUR" | "SOIR"` et fonction pure `getCurrentMoment(now: Date): DayMoment` (fenêtres horaires fixes, même fuseau que le reste du fichier).
- `domain/school-day.test.ts` -- tests des fenêtres horaires et de leurs bornes.
- `components/moment/moment-tabs.tsx` (nouveau) -- client, mirror exact du pattern `EdtViewTabs` (`components/schedule/edt-view-tabs.tsx`) : sélecteur à 3 onglets, navigation clavier WAI-ARIA APG identique, panneaux toujours montés (`hidden`). Reçoit le contenu de chaque panneau déjà construit par `app/(accueil)/page.tsx` (Sac/Devoirs/Révisions pour "soir", listes Matin/Retour pour les deux autres) -- aucune logique de données ici, uniquement l'état d'onglet actif.
- `components/moment/moment-soir-card.tsx` -- retire son propre titre "Ce soir" (devenu redondant avec le libellé de l'onglet) et son `<section>` (landmark redondant avec le `tabpanel` désormais parent) ; garde uniquement le badge de complétude.
- `app/(accueil)/page.tsx` -- calcule `currentMoment` via `getCurrentMoment(now)`, restructure le JSX pour passer par `<MomentTabs>` à la place des 3 blocs empilés (`MomentSoirCard`, `FixedChecklist` × 2).

## Tasks & Acceptance

**Execution:**
- [ ] `domain/school-day.ts` + tests -- `getCurrentMoment`
- [ ] `components/moment/moment-tabs.tsx` -- sélecteur d'onglets (mirror `EdtViewTabs`)
- [ ] `components/moment/moment-soir-card.tsx` -- retrait du titre/section redondants
- [ ] `app/(accueil)/page.tsx` -- branchement de `currentMoment` + restructuration JSX
- [ ] Vérification manuelle : un seul moment affiché par défaut selon l'heure réelle, bascule manuelle vers les deux autres fonctionne, aucune régression sur les checklists elles-mêmes (coche/décoche, célébration "Soirée prête !", persistance)

**Acceptance Criteria:** (reprises de l'intent ci-dessus)

## Spec Change Log

- **Post-review :** le Code Map étendait le retrait du titre redondant (frozen Boundaries, initialement scopé à `MomentSoirCard`/"Ce soir" seul) à `components/checklist/fixed-checklist.tsx` (Matin/Retour, via un nouveau prop `hideTitle`) -- même principe ("titre redondant avec le libellé de l'onglet parent"), pas explicitement nommé dans le frozen Boundaries d'origine. Documenté ici après coup plutôt que ré-ouvert (changement cohérent, bas risque, cf. `deferred-work.md` pour la note complète).
- **Post-review (3-layer adversarial review) :** `MomentSoirCard`/`FixedChecklist` (hideTitle) avaient d'abord entièrement supprimé leur `<h2>`/`<section>` -- correctif : un `<h2>`/`<h2 id={headingId}>` reste présent mais visuellement masqué (`sr-only`), pour préserver la hiérarchie de titres de la page (`<h1>` Accueil -> `<h2>` moment -> `<h3>` sous-blocs, au lieu de sauter un niveau) sans réintroduire de redondance visuelle.
- **Post-review :** `MomentTabs` gardait `active` initialisé une seule fois depuis `initialActive` (`useState`), sans jamais suivre un changement ultérieur de moment (ex. l'heure franchit une frontière pendant que l'app reste ouverte). Corrigé : un `useEffect` resynchronise `active` sur `initialActive` tant que l'enfant n'a pas lui-même choisi un onglet -- dès qu'il tape sur un onglet, cette synchronisation s'arrête pour le reste de la session (jamais de retour en arrière forcé sur un choix explicite).
- **Post-review (bug réel trouvé) :** le badge "Soirée prête !" de `MomentSoirCard` pouvait rejouer son animation d'apparition chaque fois que l'enfant quittait puis revenait sur l'onglet "Ce soir" -- `MomentTabs` garde les 3 panneaux montés en permanence (`hidden`, jamais démontés), et une animation CSS reprend du début quand un élément redevient visible après un `display:none`. Corrigé : `justCompleted` repasse à `false` ~500ms après la transition (durée de l'animation elle-même), donc les classes `animate-in` ont disparu du DOM bien avant qu'un changement d'onglet puisse les rejouer.
- **Retour utilisateur (après confirmation) :** ordre des sous-blocs du panneau "Ce soir" changé -- Révisions du jour, puis Devoirs à faire, puis Avant d'aller se coucher (Sac), au lieu de Sac/Devoirs/Révisions. Réordonnancement pur dans `app/(accueil)/page.tsx` (les séparateurs `border-t` suivent le nouvel ordre) ; aucun changement de logique.

## Design Notes

- `getCurrentMoment` vit dans `domain/school-day.ts` (pas un nouveau fichier `domain/moment.ts`) -- même fuseau fixe (`SCHOOL_TIME_ZONE`) et même infrastructure `Intl.DateTimeFormat` que le reste du fichier, cohérent avec son rôle "tout ce qui dépend de l'heure/du jour scolaire en America/Guadeloupe fixe".
- `MomentTabs` reçoit le contenu de chacun des 3 panneaux déjà construit (`ReactNode`) par `app/(accueil)/page.tsx`, plutôt que d'importer et instancier lui-même `SacChecklist`/`DevoirsList`/`RevisionsChecklist`/`FixedChecklist` -- ce composant reste une pure coquille de navigation, aucune connaissance des données/actions sous-jacentes.
- `FixedChecklist.hideTitle=false` (défaut) redevient un chemin mort dans l'app telle que livrée aujourd'hui (ses deux seuls appelants passent tous deux `hideTitle`) -- gardé pour une éventuelle réutilisation future de ce composant hors des onglets Accueil, pas un oubli.

## Verification

**Commands:**
- `npx vitest run domain/school-day.test.ts` -- expected: nouvelles fenêtres horaires couvertes
- `npm run build` / `npx tsc --noEmit` / `npx eslint .` -- expected: aucune erreur

**Manual checks (if no CLI):**
- Vérifier quel onglet est actif par défaut à l'heure réelle d'ouverture
- Basculer manuellement entre les 3 onglets, vérifier qu'aucune donnée ne se perd
- Revérifier que les checklists (Sac/Révisions/Devoirs/Matin/Retour) et la célébration "Soirée prête !" fonctionnent toujours normalement une fois affichées

**Résultats (session d'implémentation) :**

- `npx vitest run` -- 208 tests passent (domain/school-day.test.ts : 21, dont les nouveaux cas `getCurrentMoment` et la borne minuit).
- `npx tsc --noEmit` -- aucune erreur.
- `npx eslint .` -- aucune erreur.
- `npm run build` -- build de production réussi.
- Vérification manuelle en conditions réelles (dev.db) via le navigateur, à 16h (fenêtre Retour) :
  - Onglet "Retour" actif par défaut à l'ouverture -- un seul bloc affiché, bien plus léger que les 3 blocs empilés d'avant.
  - Bascule manuelle vers "Ce matin" et "Ce soir" -- fonctionne, aucune donnée perdue (coche Révisions, reste cochée en revenant sur l'onglet).
  - Hiérarchie de titres vérifiée (`document.querySelectorAll('h1,h2,h3,h4')`) : `<h1>` Accueil -> `<h2>` (Ce matin/Retour/Ce soir, masqués visuellement) -> `<h3>` (sous-blocs) -> `<h4>` (Devoirs pour demain) -- plus de saut de niveau.
  - Complété la soirée (Sac + Révisions + 2 devoirs à rendre) -> badge "Soirée prête !" avec animation. Changé d'onglet vers "Ce matin", attendu 2s, revenu sur "Ce soir" -> badge toujours affiché, SANS rejouer l'animation (classes `animate-in` absentes, confirmé via `element.className`).
  - "Ce matin"/"Retour" avec `hideTitle` : aucun espace vide visible au-dessus du compteur ou du message "Aucun item...".
  - État restauré à l'identique après vérification (0/1, 0/2, 0/1).
- 3-layer adversarial review (blind-hunter, edge-case-hunter, verification-gap) exécutée en parallèle sur le diff complet (511 lignes). Corrigé : régression de hiérarchie de titres (`<h1>` -> `<h3>`, niveau manquant), perte de landmark sans alternative accessible (titre `sr-only` réintroduit), un vrai bug de rejeu d'animation de célébration causé par le montage permanent des panneaux d'onglets, `MomentTabs` ne suivait jamais un changement de moment après le montage initial, espace vide au-dessus du message "Aucun item" quand `hideTitle` et liste vide. Différé vers `deferred-work.md` (hors périmètre ou risque déjà accepté ailleurs) : absence de test sur le branchement `getCurrentMoment` -> `page.tsx` -> `MomentTabs` (gap déjà loggé pour tout le repo), risque de permutation de props `ReactNode` sur `MomentTabs` (même catégorie que `FixedChecklist`/`FixedItemsManager`), garde-fou `% 24` non testé (cas ICU jamais observé en pratique), extension de `hideTitle` à `FixedChecklist` non explicitement nommée dans le frozen Boundaries d'origine.

**Confirmé en production par l'utilisateur ("ca marche").**

## Suggested Review Order

1. `domain/school-day.ts` -- `getCurrentMoment` (logique pure, testée, y compris la borne minuit)
2. `domain/school-day.test.ts` -- fenêtres horaires et bornes
3. `components/moment/moment-tabs.tsx` -- sélecteur d'onglets, resynchronisation tant que non choisi manuellement
4. `components/moment/moment-soir-card.tsx` -- titre `sr-only`, correctif de rejeu d'animation
5. `components/checklist/fixed-checklist.tsx` -- `hideTitle`, titre `sr-only`, correctif de l'espace vide
6. `app/(accueil)/page.tsx` -- calcul de `currentMoment`, branchement dans `MomentTabs`
