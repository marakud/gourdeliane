---
title: 'Refonte visuelle -- CartableFlow'
type: 'feature'
created: '2026-09-10'
status: 'in-progress'
---

# Refonte visuelle CartableFlow -- suivi de progression

Pas une story d'epic classique (pas dans `epics.md`) -- initiative ad hoc demandée directement par l'utilisateur, suivie ici pour pouvoir reprendre le travail depuis une autre machine (mémoire de session non portable entre postes ; ce fichier + les commits Git le sont).

## Demande d'origine (résumé)

Moderniser l'interface de CartableFlow : plus dynamique/coloré/motivant pour un collégien de 6ème, sans tomber dans l'enfantin. Garder l'identité (violet + ambre, Baloo 2 / Nunito, organisation par moments Matin/Retour/Soir, nav Accueil/EDT/Progression). Ne jamais toucher aux règles métier/données/Prisma/Server Actions. Travailler écran par écran, avec validation de l'utilisateur entre chaque étape.

**Découverte clé** : le projet a déjà un système de design documenté et jamais complètement implémenté -- `_bmad-output/planning-artifacts/ux-designs/ux-college-6eme-2026-09-02/DESIGN.md` et `EXPERIENCE.md`. La refonte reprend ce socle plutôt que d'en inventer un nouveau.

## Plan en 8 étapes (ordre demandé par l'utilisateur)

1. Système visuel global
2. Carte d'accueil
3. Onglets des moments
4. Checklists et célébrations
5. Navigation supérieure et inférieure
6. États vides illustrés
7. Emploi du temps
8. Page Progression

Après chaque étape : fichiers modifiés annoncés, choix expliqués, responsive vérifié (Browser pane, desktop + mobile 375px), tests/tsc/eslint/build exécutés, **attendre la validation de l'utilisateur avant l'étape suivante**. Commits locaux après accord explicite (jamais de push automatique sans demande).

## Décisions actées (à respecter dans les étapes suivantes)

- Icônes lucide-react partout (pas d'emoji natif) -- confirmé par l'utilisateur via AskUserQuestion à l'étape 3.
- Page Progression (étape 8, pas encore commencée) : construire avec les vraies données déjà disponibles (`DayCompletion` uniquement -- pas de `Streak`/`Badge` en base), préparer visuellement les emplacements Streak/Badges sans données inventées, sans migration Prisma tant que l'utilisateur ne la demande pas explicitement.
- Couleur active de navigation reste violette uniquement (DESIGN.md : une seule couleur de marque pour la nav) -- ne jamais teinter un onglet actif avec la couleur d'ambiance du moment.
- Toute nouvelle icône passe par `lucide-react` (déjà installé) -- jamais de nouvelle dépendance pour une animation/icône simple.
- `components/ui/card.tsx` existe (étape 1) mais n'est PAS encore adopté par tous les écrans -- adoption progressive au fil des étapes qui touchent chaque écran, jamais un passage global forcé.

## Progression

### Étape 1 -- Système visuel global -- ✅ commit `42b094f`

- `app/globals.css` : rayons relevés (12/16/24px, matche DESIGN.md), `shadow-brand` (ombre teintée violet, définie mais pas encore appliquée partout), `prefers-reduced-motion` enfin implémenté globalement, 3 dégradés d'ambiance par moment (`--gradient-matin/retour/soir`) définis (pas encore utilisés à ce stade).
- `components/ui/card.tsx` créé (primitive réutilisable, pas encore adoptée).

### Étape 2 -- Carte d'accueil -- ✅ commit `cc86fb8`

- `components/moment/greeting-card.tsx` (nouveau) : remplace l'ancien header texte. Prénom, phrase d'ambiance (`MOMENT_GREETING`, domain/school-day.ts), missions restantes + jauge, icône cartable (`Backpack`, filigrane), fond dégradé par moment.
- `domain/day-completion.ts` : nouvelles fonctions pures testées (`countBlockProgress`, `countSoirProgress`, `selectCurrentMomentProgress`).
- **Décision utilisateur** : bannière de repli visuel séparée (Story 3.2) supprimée -- devenue redondante avec la carte, qui affiche déjà en permanence les missions restantes. La fonction `selectCurrentMomentCompletion` (Story 3.2) reste dans `domain/day-completion.ts`, testée, juste plus appelée depuis `page.tsx`.

### Étape 3 -- Onglets des moments -- ✅ commit `2aaa486`

- `components/moment/moment-tabs.tsx` : icônes lucide par onglet (`Sun`/`DoorOpen`/`Moon`). `DoorOpen` plutôt que `Home` pour Retour (déjà utilisée par la nav basse pour "Accueil", évite une ambiguïté de sens).

### Étape 4 -- Checklists et célébrations -- ✅ commit `526d0e6`

- `domain/subject-icon.ts` (nouveau, pur, testé) : `matchSubjectCategory(name)` -- correspondance tolérante accents/casse/variantes, 8 catégories + repli `GENERIC`.
- `components/schedule/subject-tag.tsx` : remplace les initiales par une icône (`CATEGORY_ICON`, mapping local au composant -- une icône est une dépendance UI, ne peut pas vivre dans `domain/`, AD-1). Aucun impact accessibilité (l'accessible name vient déjà de `aria-label`/`title`).
- `lib/use-just-toggled.ts` (nouveau hook partagé) : micro-animation de coche (pop + flash de couleur bref sur la ligne), appliquée à `FixedChecklist`, `SacChecklist`, `RevisionsChecklist`.
- `lib/use-just-completed.ts` + `components/moment/celebration-badge.tsx` (nouveaux, extraits de `MomentSoirCard`/Story 2.7) : célébration "Tout est prêt !" + étincelles, étendue à `FixedChecklist` (Matin/Retour n'avaient pas de "moment card" propre). Sac/Révisions ne gagnent pas leur propre badge -- déjà couverts par celui de `MomentSoirCard` (éviter la redondance).
- Toutes les animations respectent `prefers-reduced-motion` (étape 1, aucun code supplémentaire requis par composant).

### Étape 5 -- Navigation supérieure et inférieure -- ✅ commit à venir

- `components/nav/top-bar.tsx` : icône `Backpack` ajoutée avant le nom "CartableFlow" -- même icône que le filigrane de la carte d'accueil (`greeting-card.tsx`), pas une nouvelle icône d'identité.
- `components/nav/bottom-nav.tsx` : pastille (`bg-primary/10`, `rounded-full`) derrière l'icône de l'onglet actif plutôt qu'un simple changement de couleur de texte, cf. `.nav-pill` du mockup `key-screens.html`. Zone de tap ≥44px inchangée (le padding est sur la pastille interne, pas sur la zone cliquable). `padding-bottom: env(safe-area-inset-bottom)` ajouté pour la zone sûre iPhone.
- `app/layout.tsx` : export `viewport` avec `viewportFit: "cover"` -- requis pour que `env(safe-area-inset-bottom)` résolve une vraie valeur sur iPhone plutôt que 0.
- Vérifié : `tsc`/`next build`, `eslint`, 251 tests, responsive desktop + mobile 375px (Browser pane).

### Étape 6 -- États vides illustrés -- ✅ commit à venir

- `components/ui/empty-state.tsx` (nouveau) : icône + message, deux mises en page (`stacked` centré / `inline` en ligne) -- pas de décor de carte propre (les appelants imbriqués dans une carte existante en ont déjà une).
- Appliqué à 4 messages déjà existants (texte inchangé, EXPERIENCE.md) : `DayView` (EDT Aujourd'hui/Demain, icône `Sofa`), `WeekGrid` (EDT Semaine, `Sofa`), Sac sans cours demain (Accueil, `app/(accueil)/page.tsx`, `Sofa`), `DevoirsList` "Rien à faire ce soir, bravo !" (`Sparkles`, même icône que `CelebrationBadge`), `FixedChecklist` "Aucun item..." (`Settings`, même icône que le lien Réglages de la barre haute).
- Hors périmètre volontairement : le message vide par groupe de `SacChecklist` ("Aucun objet défini pour cette matière", déjà sous une pastille de matière) et l'écran de gestion Réglages (`subject-items-manager.tsx`) -- pas le même public/ton que les écrans collégien.
- **Bug préexistant corrigé en vérifiant cette étape** (pas introduit par la refonte) : le message vide de `WeekGrid` était invisible avant ce commit -- premier enfant `position: absolute` de la grille, entièrement recouvert par les colonnes de jours (`bg-card`, `position: relative`, plus tard dans le DOM, donc peintes par-dessus). `z-10` ajouté.
- Vérifié : `next build`, `eslint`, 251 tests, les 4 états vides contrôlés visuellement (Browser pane) après le correctif.

### Étape 7 -- Emploi du temps -- ✅ commit à venir

Note : `SubjectTag` (icônes par matière) et les rayons/ombres globaux impactent déjà visuellement l'EDT depuis les étapes 1 et 4 (composants partagés) -- cette étape a porté sur ce qui restait propre à l'écran EDT lui-même :

- `components/schedule/edt-view-tabs.tsx` : une icône par onglet Aujourd'hui/Demain/Semaine (`CalendarCheck`/`CalendarClock`/`CalendarRange`), même traitement que `MomentTabs` (étape 3).
- `components/schedule/week-schedule.tsx` : message "Aucun créneau." (vue liste mobile, un par jour de la semaine) passé par `EmptyState` (`Sofa`, étape 6), pour la même cohérence que `DayView`/`WeekGrid`.
- Hors périmètre volontairement : `NoSchoolDayPanel` ("Aucun jour marqué...") -- texte de configuration, pas un message adressé à l'enfant comme les autres états vides.
- Vérifié : `next build`, `eslint`, 251 tests, les 3 onglets + la vue liste mobile contrôlés visuellement (Browser pane, desktop + mobile 375px).

### Étape 8 -- Page Progression -- ⏳ pas commencée

Actuellement une coquille vide (`app/progression/page.tsx`). Voir "Décisions actées" ci-dessus pour le périmètre données réelles vs emplacements préparés.

## État Git

Étapes 1-7 commitées localement (`git log` fera foi de l'état réel -- ne pas se fier à ce fichier pour le SHA le plus récent, seulement pour le contexte). Pas de push automatique sans demande explicite. Prochaine étape à reprendre : **étape 8** (page Progression), en attente d'un feu vert utilisateur.
