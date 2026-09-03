# Epic 1 Context: Emploi du temps

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Léo (et son parent) doit pouvoir saisir l'emploi du temps hebdomadaire et voir en un coup d'œil ce qu'il a aujourd'hui et demain. Cet epic pose aussi les fondations techniques du projet (scaffold Next.js, base de données, premier déploiement) puisqu'il est le tout premier de la roadmap : tout ce qui suit (checklists, devoirs, notifications, streak) se construit sur cette base.

## Stories

- Story 1.1: Initialisation du projet et premier déploiement
- Story 1.2: Gérer mon emploi du temps
- Story 1.3: Voir ma journée et mon lendemain

## Requirements & Constraints

- Le parent ou l'enfant peut créer, modifier et supprimer un créneau d'EDT (jour, heure, matière) ; une matière est créée à la volée si elle n'existe pas encore.
- Une date (ex. demain) peut être marquée "sans cours" (jour férié/vacances), indépendamment des créneaux hebdomadaires ; ce marquage est mémorisé et consultable.
- L'enfant peut consulter une vue "Aujourd'hui", "Demain" et une vue semaine complète ; un jour "sans cours" affiche un message neutre plutôt qu'une liste vide.
- Aucune authentification n'est requise pour l'usage de base (pas de compte, pas de mot de passe) — une unique ligne `User` est créée automatiquement au premier déploiement/migration, et toute entité s'y rattache via `userId`.
- Contraintes d'accessibilité dès le scaffold : zones de tap ≥44px (iOS)/48px (Android), texte ≥16px, `prefers-reduced-motion` respecté, l'état coché/complété n'est jamais indiqué par la seule couleur.
- Confidentialité : données d'un mineur, usage strictement familial, aucun partage tiers ni fonctionnalité sociale.
- Performance : chargement rapide visé sur mobile d'entrée/milieu de gamme.
- Coût d'infrastructure limité aux paliers gratuits (Vercel Hobby, Supabase gratuit).
- PWA installable, responsive mobile et tablette, iOS et Android sans plateforme privilégiée.

## Technical Decisions

- Stack imposée : Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.3 + shadcn/ui (dernière CLI, compatible Next 16/React 19/Tailwind v4). Pas de starter officiel nommé — scaffold construit à la main.
- Architecture en couches strictes avec noyau de domaine isolé : `app/` (routes/UI) → `actions/` (Server Actions, seule frontière de mutation) → `domain/` (TypeScript pur, aucune dépendance à Next.js/Prisma) et `data/` (accès Prisma). Toute mutation passe par une Server Action dans `actions/` ; jamais d'accès Prisma direct depuis un Client Component ni de route API REST parallèle.
- Structure de dossiers attendue : `app/(accueil)/`, `app/edt/`, `app/progression/`, `app/reglages/`, `app/api/cron/[moment]/`, `actions/`, `domain/`, `data/`, `prisma/schema.prisma`, `public/sw.js` (généré par Serwist), `vercel.json`.
- Base de données : Postgres via Supabase obligatoire en production (le système de fichiers Vercel serverless est éphémère) ; SQLite acceptable uniquement en dev local via le provider Prisma alternatif.
- Prisma 7.8. Schéma initial pour Story 1.1 : uniquement le modèle `User` (les autres modèles — Subject, ScheduleSlot, SubjectItem, etc. — arrivent avec les stories qui en ont besoin, dès Story 1.2 pour Subject/ScheduleSlot).
- `Subject` porte un index de couleur assigné une fois à sa création et jamais recalculé, même si d'autres matières sont supprimées ensuite (couleurs catégorielles subject-1 à subject-8 dans DESIGN.md).
- Toute notion de "jour scolaire", "demain" ou de bascule de moment se calcule côté serveur en fuseau Europe/Paris — jamais depuis l'heure locale du client. Dates stockées en UTC.
- Convention de nommage : identifiants de code en anglais (`Subject`, `ScheduleSlot`, …) même si le produit est en français ; les libellés affichés à l'enfant restent en français.
- Les Server Actions retournent un résultat typé `{ ok: true, data } | { ok: false, error }`, jamais une exception non gérée remontée à l'UI.
- Déploiement Vercel (Hobby) avec Supabase Postgres connecté ; variables d'environnement pour la chaîne de connexion DB (les clés VAPID ne sont nécessaires qu'à partir de l'Epic 3).
- PWA via Serwist (`@serwist/next`), pas `next-pwa` (non maintenu) — la mise en place complète du service worker n'est pas requise dès l'Epic 1 mais la dépendance/structure peut être posée au scaffold.
- Tokens de couleur et typographies à déclarer en variables Tailwind/CSS dès le scaffold : primary violet `#7C5CFF`, accent ambre `#FFB020`, success vert, neutral-pending gris (jamais de rouge pour un état incomplet), palette subject-1 à subject-8 ; polices Baloo 2 (display/heading) et Nunito (body/meta) chargées via `next/font`.

## UX & Interaction Patterns

- Navigation par barre du bas à 3 onglets (Accueil, Emploi du temps, Progression) ; Réglages en accès secondaire, hors barre principale. Le scaffold (Story 1.1) met en place cette coquille de navigation vide, prête à accueillir les écrans des epics suivants.
- Écran Emploi du temps : vue semaine complète avec créneaux organisés par jour/horaire, chaque matière affichée avec sa pastille de couleur (subject tag, disque coloré 32px). Sur tablette, cette vue peut passer en grille semaine complète ; les checklists restent en colonne centrée (pas de multi-colonnes forcé).
- Vue "Demain" : liste des matières/horaires du jour scolaire suivant, en sautant les jours "sans cours" ; si demain est "sans cours", message neutre affiché (jamais une liste vide qui ressemble à un bug).
- Formes très arrondies partout, palette saturée mais maîtrisée (violet de marque, pas de camaïeu arc-en-ciel) ; le violet sert aux actions/éléments actifs, jamais à indiquer un état fait/pas fait.
- Ton et voix : phrases courtes, tutoiement, présent, jamais culpabilisant (ex. "Rien à préparer ce soir — pas cours demain." plutôt qu'une liste vide silencieuse).

## Cross-Story Dependencies

- Story 1.2 dépend du scaffold Next.js/Prisma/déploiement livré par la Story 1.1 (modèles `Subject` et `ScheduleSlot` s'ajoutent au schéma posé en 1.1).
- Story 1.3 dépend des créneaux et du marquage "sans cours" saisis en Story 1.2 pour construire les vues Aujourd'hui/Demain/Semaine.
- Le calcul du "jour scolaire" et le modèle `ScheduleSlot`/`Subject` posés dans cet epic sont réutilisés directement par l'Epic 2 (déduction du sac et des révisions à partir de l'EDT réel, AD-2/AD-3) — toute incohérence de modélisation ici se répercute sur l'Epic 2.
