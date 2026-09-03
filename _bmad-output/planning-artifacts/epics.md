---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-college-6eme-2026-09-02/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-college-6eme-2026-09-02/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-college-6eme-2026-09-02/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-college-6eme-2026-09-02/EXPERIENCE.md
---

# CartableFlow - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for CartableFlow, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

```
FR-1: Le parent ou l'enfant peut créer, modifier et supprimer un créneau (jour, heure, matière) dans l'EDT hebdomadaire.
FR-2: L'enfant peut consulter une vue "Aujourd'hui" et "Demain" listant matières et horaires, en plus de la vue semaine.
FR-3: Le système génère automatiquement une checklist d'objets déduite des matières du jour scolaire suivant (recalculée en direct depuis l'EDT courant, jamais figée).
FR-4: L'enfant ou le parent peut modifier la liste d'objets par défaut associée à une matière.
FR-5: L'enfant peut cocher/décocher chaque objet de la checklist du soir.
FR-6: Le système propose une checklist matin fixe et personnalisable.
FR-7: La checklist matin se réinitialise automatiquement chaque jour scolaire.
FR-8: Le système propose une checklist retour fixe et personnalisable.
FR-9: La checklist retour se réinitialise automatiquement chaque jour scolaire.
FR-10: Le système envoie une notification à des heures configurables pour chacun des trois moments (soir, matin, retour).
FR-11: Un repli visuel in-app signale une checklist non complétée, indépendamment de la notification système.
FR-12: L'app guide l'ajout à l'écran d'accueil sur iOS lors de la première utilisation.
FR-13: Le système compte le nombre de jours scolaires consécutifs où les trois moments du jour ont été entièrement traités (Streak).
FR-14: Le système débloque un badge visuel lorsque le streak atteint certains paliers.
FR-15: L'enfant peut consulter son streak actuel et son meilleur streak sur un écran dédié.
FR-16: L'enfant peut créer un devoir à tout moment de la journée (matière, description, "à rendre" optionnel, échéance optionnelle).
FR-17: Un devoir reste visible dans "devoirs à faire" jusqu'à être marqué fait — ne se réinitialise pas chaque soir.
FR-18: Un devoir "à rendre" dont l'échéance est le jour scolaire suivant apparaît comme objet spécifique dans la checklist sac.
FR-19: Le système génère chaque soir un rappel "Revoir le cours de [matière]" pour chaque matière suivie le jour scolaire même (recalculé en direct comme FR-3).
FR-20: L'écran "Ce soir" organise trois blocs indépendamment progressables : Sac, Devoirs à faire, Révisions du jour ; le streak du soir n'est complet que si les trois le sont.
```

### NonFunctional Requirements

```
NFR-1 (Confidentialité) : données concernant un mineur, usage strictement familial — aucun partage à des tiers, aucune fonctionnalité sociale/publique.
NFR-2 (Fiabilité) : la checklist du soir et le bloc révisions doivent toujours refléter fidèlement l'EDT réellement saisi (recalcul en direct, jamais une copie figée — voir Architecture AD-2/AD-3).
NFR-3 (Performance) : chargement rapide sur mobile d'entrée/milieu de gamme, l'app étant consultée dans des moments courts.
NFR-4 (Accessibilité) : contrastes et tailles de police adaptés à une lecture rapide par un enfant ; zones de tap ≥44/48px ; état coché jamais indiqué par la seule couleur ; respect de prefers-reduced-motion.
NFR-5 (Coût) : infrastructure dans les paliers gratuits (Vercel Hobby, Supabase gratuit) — pas de budget d'hébergement.
NFR-6 (Plateforme) : PWA installable, responsive mobile et tablette, iOS et Android sans plateforme privilégiée ; fonctionnement offline pour consulter/cocher les checklists déjà chargées, synchronisation à la reconnexion.
NFR-7 (Simplicité d'accès) : pas de compte tiers ni d'identifiant externe requis pour l'usage de base (EDT, checklists) en v1.
```

### Additional Requirements

```
- Pas de starter officiel nommé par l'Architecture, mais scaffold de base attendu pour Epic 1 Story 1 : Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.3 + shadcn/ui.
- Schéma Prisma initial couvrant : User, Subject, ScheduleSlot, SubjectItem, FixedChecklistItem, Devoir, ChecklistItemState, DayCompletion, PushSubscription (voir Architecture, Structural Seed).
- Base de données : Supabase Postgres en production (obligatoire, AD-9) ; SQLite acceptable uniquement en dev local via le provider alternatif Prisma.
- Déploiement Vercel (Hobby) ; variables d'environnement pour la chaîne de connexion DB et les clés VAPID.
- 3 Vercel Cron Jobs distincts (un par moment : soir/matin/retour) déclarés dans vercel.json, invoquant une route de dispatch push protégée par CRON_SECRET (AD-8). Limite connue du plan gratuit : 1 exécution/jour par job, précision ±59min.
- Intégration PWA via Serwist (@serwist/next) pour le service worker et le manifest — pas next-pwa (non maintenu).
- Envoi des notifications Web Push signées VAPID via le paquet `web-push`.
- Toute mutation passe exclusivement par des Server Actions (`actions/`) ; la logique de dérivation (checklist, streak, badges) vit dans un noyau `domain/` sans dépendance à Next.js/Prisma (AD-1).
- Le "jour scolaire" (aujourd'hui/demain, bascule des moments) est calculé côté serveur en fuseau Europe/Paris, jamais depuis l'heure locale du client (AD-4).
- L'UI ne réimplémente jamais le calcul de complétude d'un moment : elle affiche l'état retourné par la Server Action (convention Architecture).
```

### UX Design Requirements

```
UX-DR1: Système de tokens de couleur (primary violet #7C5CFF, accent ambre #FFB020, success vert, neutral-pending gris, palette catégorielle subject-1 à subject-8, variantes -dark) à implémenter en variables Tailwind/CSS — jamais de rouge pour un état incomplet/oublié.
UX-DR2: Typographies Baloo 2 (display/heading) + Nunito (body/meta) chargées via next/font.
UX-DR3: Composant Checklist item — pastille de matière + libellé + case à cocher circulaire, animation de coche courte (<300ms).
UX-DR4: Composant Moment card — variante à 3 blocs (Sac/Devoirs/Révisions) pour le soir, variante liste simple pour matin/retour.
UX-DR5: Composant Streak badge/chip — icône flamme + compteur, visible en permanence sur l'Accueil.
UX-DR6: Composant Badge tile — état débloqué (rempli) vs verrouillé (silhouette, jamais invisible) pour l'écran Progression.
UX-DR7: Composant Subject tag — pastille colorée réutilisée entre EDT, checklist du soir et devoirs, couleur assignée une fois à la création (jamais recalculée).
UX-DR8: FAB "Ajouter un devoir" persistant sur Accueil et Emploi du temps + modal de saisie rapide (matière + description obligatoires, "à rendre"/échéance optionnels).
UX-DR9: Navigation par barre du bas à 3 onglets (Accueil, Emploi du temps, Progression) ; Réglages en accès secondaire (pas dans la barre).
UX-DR10: États spécifiques à implémenter — jour sans cours (message neutre, pas de liste vide), bloc devoirs vide (message positif "Rien à faire ce soir, bravo !"), devoir en retard (aucune couleur d'alerte), célébration à la complétion des 3 blocs (animation courte <1,5s), hors-ligne (pas de bannière d'erreur intrusive, sync silencieuse au retour).
UX-DR11: Accessibilité — zones de tap ≥44px iOS/48dp Android, état coché toujours accompagné d'une icône (jamais couleur seule), `prefers-reduced-motion` respecté, texte ≥16px pour le corps.
UX-DR12: Écran d'onboarding iOS dédié expliquant l'ajout à l'écran d'accueil comme condition pour recevoir les rappels.
UX-DR13: Responsive tablette — vue Emploi du temps en grille semaine complète, checklists restent en colonne centrée (pas de layout multi-colonnes forcé).
```

### FR Coverage Map

```
FR-1 à FR-2 : Epic 1 — EDT et vue du jour
FR-3 à FR-9, FR-16 à FR-20 : Epic 2 — Routines quotidiennes (sac, devoirs, révisions, matin, retour)
FR-10 à FR-12 : Epic 3 — Notifications
FR-13 à FR-15 : Epic 4 — Motivation
```

## Epic List

### Epic 1: Emploi du temps
Léo (et son parent) peut saisir l'emploi du temps hebdomadaire et voir en un coup d'œil ce qu'il a aujourd'hui et demain. Inclut la mise en place du projet (Next.js + Prisma + déploiement) en tant que premier epic.
**FRs covered:** FR-1, FR-2

### Epic 2: Routines quotidiennes intelligentes
Léo sait quoi mettre dans son sac (déduit automatiquement de l'EDT), quels devoirs faire, quoi réviser le soir même, et coche ses routines fixes du matin et du retour. Regroupe sac/devoirs/révisions/matin/retour dans un seul epic car ils partagent le même mécanisme technique (case à cocher recalculée en direct, AD-2/AD-3) et le même écran Accueil — les séparer créerait des allers-retours inutiles sur les mêmes fichiers.
**FRs covered:** FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-16, FR-17, FR-18, FR-19, FR-20

### Epic 3: Rappels et notifications
Léo est prévenu au bon moment (soir/matin/retour) même sans ouvrir l'app de lui-même, avec un repli visuel si la notification ne se déclenche pas (contrainte iOS). Isolé car techniquement le plus délicat (notifications cross-plateforme) ; l'app reste utilisable sans le temps de le stabiliser.
**FRs covered:** FR-10, FR-11, FR-12

### Epic 4: Motivation — streak et badges
Léo voit sa progression et débloque des badges quand il tient ses routines dans la durée. Vient après l'Epic 2, dont il consomme les données de complétion.
**FRs covered:** FR-13, FR-14, FR-15

## Epic 1: Emploi du temps

Léo (et son parent) peut saisir l'emploi du temps hebdomadaire et voir en un coup d'œil ce qu'il a aujourd'hui et demain. Couvre aussi la mise en place du projet.

### Story 1.1: Initialisation du projet et premier déploiement

As a développeur de l'app (moi-même, via l'agent de dev),
I want un projet Next.js fonctionnel avec la stack retenue configurée et déployé sur Vercel,
So that les fonctionnalités suivantes se construisent sur une base saine plutôt que sur du code ad hoc.

**Acceptance Criteria:**

**Given** un dossier de projet vide
**When** le scaffold est exécuté
**Then** le projet utilise Next.js 16 (App Router), TypeScript, Tailwind CSS 4.3 et shadcn/ui initialisé
**And** les tokens de couleur et typographies de DESIGN.md (violet #7C5CFF, ambre #FFB020, succès vert, neutre gris, Baloo 2 + Nunito via next/font) sont déclarés comme variables Tailwind/CSS (UX-DR1, UX-DR2)

**Given** le schéma Prisma initial
**When** `prisma migrate dev` est exécuté en local
**Then** la base SQLite locale se crée sans erreur avec le modèle `User` uniquement (les autres modèles arrivent avec les stories qui en ont besoin)

**Given** le projet poussé sur le dépôt Git du projet
**When** il est déployé sur Vercel avec une base Supabase Postgres connectée
**Then** une page d'accueil minimale ("CartableFlow") s'affiche en production sur l'URL Vercel, confirmant que le pipeline base de données + déploiement fonctionne de bout en bout

**Given** aucune ligne `User` en base
**When** la première migration s'exécute (dev ou prod)
**Then** une unique ligne `User` est créée automatiquement (seed) — pas d'écran de connexion, pas de mot de passe ; toutes les entités créées par les stories suivantes s'y rattachent via `userId` sans qu'aucune action de l'enfant ne soit nécessaire pour "se connecter" (cohérent avec NFR-7)

**Given** la structure de navigation à 3 onglets définie dans EXPERIENCE.md
**When** le scaffold est en place
**Then** la barre de navigation basse (Accueil, Emploi du temps, Progression) existe déjà comme coquille vide, prête à accueillir chaque écran au fil des epics suivants (UX-DR9)

**Given** les tailles d'écran mobile et tablette
**When** la coquille de navigation est affichée
**Then** le layout reste utilisable sur les deux formats (colonne unique mobile, grille disponible pour les vues qui en ont besoin plus tard) et respecte le plancher d'accessibilité (zones de tap ≥44/48px, texte ≥16px, `prefers-reduced-motion` pris en compte dès les premiers composants) (UX-DR11, UX-DR13)

### Story 1.2: Gérer mon emploi du temps

As a parent ou enfant,
I want créer, modifier et supprimer les créneaux de mon emploi du temps hebdomadaire, et marquer un jour comme "sans cours",
So that l'app connaisse mes matières et mes horaires réels pour tout ce qui en dépend ensuite.

**Acceptance Criteria:**

**Given** aucun créneau saisi
**When** j'ajoute un créneau (jour, heure de début/fin, matière)
**Then** le créneau est enregistré et une nouvelle `Subject` est créée si la matière n'existait pas encore, avec un index de couleur assigné une fois pour toutes (AD-6)

**Given** un créneau existant
**When** je le modifie ou le supprime
**Then** le changement est reflété immédiatement, sans affecter l'index de couleur des autres matières

**Given** une date comme demain
**When** je la marque "sans cours" (jour férié/vacances)
**Then** ce marquage est mémorisé et consultable, indépendamment des créneaux hebdomadaires (FR-1)

### Story 1.3: Voir ma journée et mon lendemain

As a enfant,
I want consulter une vue "Aujourd'hui" et "Demain" en plus de la vue semaine complète,
So that je sache vite ce qui m'attend sans chercher dans un tableau.

**Acceptance Criteria:**

**Given** un EDT saisi avec des créneaux pour demain
**When** j'ouvre la vue "Demain"
**Then** je vois la liste des matières et horaires du jour scolaire suivant, en sautant les jours marqués "sans cours" (FR-2)

**Given** demain est marqué "sans cours"
**When** j'ouvre la vue "Demain"
**Then** un message neutre l'indique, pas une liste vide

**Given** l'EDT complet de la semaine
**When** j'ouvre la vue semaine
**Then** tous les créneaux s'affichent, organisés par jour et horaire, avec la pastille de couleur de chaque matière (UX-DR7)

## Epic 2: Routines quotidiennes intelligentes

Léo sait quoi mettre dans son sac, quels devoirs faire, quoi réviser, et coche ses routines fixes du matin et du retour.

### Story 2.1: Voir et personnaliser mon sac du soir

As a enfant,
I want que la checklist de mon sac se génère automatiquement à partir de mes matières de demain, et pouvoir personnaliser les objets par matière,
So that je ne dépende pas de ma mémoire pour savoir quoi préparer.

**Acceptance Criteria:**

**Given** demain j'ai Maths et EPS dans mon EDT
**When** j'ouvre le bloc "Sac pour demain"
**Then** je vois les objets par défaut associés à chaque matière (ex. cahier de maths, tenue de sport), groupés par matière avec sa pastille de couleur (FR-3, UX-DR3, UX-DR7)

**Given** la liste d'objets par défaut d'une matière
**When** j'ajoute, modifie ou supprime un objet dans les Réglages
**Then** la modification s'applique à toutes les occurrences futures de cette matière (FR-4)

**Given** la checklist du sac affichée
**When** je coche ou décoche un objet
**Then** l'état se met à jour immédiatement avec une animation de coche courte, et reste keyé par l'objet (pas par son libellé) pour survivre à une future édition (FR-5, AD-3, UX-DR3)

**Given** demain est marqué "sans cours"
**When** j'ouvre le bloc Sac
**Then** aucune checklist n'est générée, un message neutre s'affiche à la place

**Given** l'EDT de demain est modifié après que j'ai déjà coché des objets ce soir
**When** je rouvre le bloc Sac
**Then** les objets encore valables gardent leur état coché, les nouveaux apparaissent décochés, ceux qui ne correspondent plus disparaissent (PRD FR-3, AD-2/AD-3)

### Story 2.2: Cocher mes routines fixes du matin

As a enfant,
I want une checklist fixe et personnalisable de ce que je dois vérifier avant de partir,
So that je n'oublie rien dans la précipitation du matin.

**Acceptance Criteria:**

**Given** une liste par défaut (clés, goûter, carnet, chargeur)
**When** j'ouvre le moment "Ce matin"
**Then** je vois cette checklist, personnalisable dans les Réglages (ajout/retrait d'éléments) (FR-6)

**Given** la checklist du matin cochée hier
**When** un nouveau jour scolaire commence
**Then** elle est automatiquement décochée (FR-7)

### Story 2.3: Cocher mes routines fixes du retour

As a enfant,
I want une checklist fixe et personnalisable de ce que je dois faire en rentrant,
So that je n'oublie pas de sortir le carnet ou de traiter mes devoirs faits.

**Acceptance Criteria:**

**Given** une liste par défaut (sortir le carnet/mot, ranger le sac, devoirs faits)
**When** j'ouvre le moment "Retour"
**Then** je vois cette checklist, personnalisable dans les Réglages (FR-8)

**Given** la checklist du retour cochée hier
**When** un nouveau jour scolaire commence
**Then** elle est automatiquement décochée (FR-9)

### Story 2.4: Noter et suivre mes devoirs

As a enfant,
I want noter un devoir à tout moment de la journée (matière, description, "à rendre" et échéance optionnels) et le marquer fait quand c'est terminé,
So that je n'oublie pas ce que les professeurs ont donné, même si je le note en pleine journée au collège.

**Acceptance Criteria:**

**Given** le bouton flottant "+" visible sur Accueil et Emploi du temps
**When** je le tape et remplis matière + description (les seuls champs obligatoires)
**Then** le devoir apparaît immédiatement dans "Devoirs à faire", sans écran de confirmation séparé (FR-16, UX-DR8)

**Given** un devoir non terminé
**When** plusieurs jours passent sans que je le marque fait
**Then** il reste visible dans "Devoirs à faire" — il ne se réinitialise jamais tout seul (FR-17)

**Given** un devoir affiché
**When** je le marque fait
**Then** il disparaît de "Devoirs à faire" et son statut `done` est enregistré définitivement

**Given** aucun devoir en attente
**When** j'ouvre le bloc "Devoirs à faire"
**Then** un message positif s'affiche ("Rien à faire ce soir, bravo !"), pas une absence silencieuse (UX-DR10)

### Story 2.5: Lier un devoir à rendre à mon sac du lendemain

As a enfant,
I want qu'un devoir marqué "à rendre" pour demain apparaisse aussi dans mon sac,
So that je n'oublie pas de le ramener, en plus de le faire.

**Acceptance Criteria:**

**Given** un devoir de maths marqué "à rendre" avec échéance demain
**When** j'ouvre le bloc Sac de ce soir
**Then** un objet spécifique apparaît (ex. "Feuille d'exercices de maths à rendre"), en plus du matériel générique de la matière (FR-18)

**Given** un devoir "à rendre" sans échéance renseignée
**When** j'ouvre le bloc Sac
**Then** aucun objet n'est ajouté au sac pour ce devoir — il reste seulement visible dans "Devoirs à faire"

**Given** un devoir "à rendre" avec échéance dans plus d'une semaine
**When** j'ouvre le bloc Sac de ce soir
**Then** aucun objet n'est ajouté ce soir (seulement le soir précédant l'échéance)

### Story 2.6: Revoir mes cours du jour

As a enfant,
I want un rappel pour revoir chaque matière que j'ai eue aujourd'hui,
So that je prenne l'habitude de réviser le jour même plutôt que d'attendre un contrôle.

**Acceptance Criteria:**

**Given** j'ai eu SVT et Français aujourd'hui
**When** j'ouvre le bloc "Révisions du jour" ce soir
**Then** je vois un rappel "Revoir le cours de SVT" et "Revoir le cours de Français", cochables comme les autres checklists (FR-19)

**Given** aujourd'hui était un jour "sans cours"
**When** j'ouvre le bloc Révisions
**Then** aucun rappel n'est généré (pas de bloc vide qui interroge)

**Given** l'EDT du jour même est corrigé après que j'ai déjà coché des révisions
**When** je rouvre le bloc Révisions
**Then** il se recalcule comme le bloc Sac (AD-2/AD-3) — pas une copie figée

### Story 2.7: Voir ma soirée organisée en 3 blocs et savoir quand elle est terminée

As a enfant,
I want voir mon sac, mes devoirs et mes révisions comme trois blocs clairs dans l'écran "Ce soir", et savoir quand j'ai fini,
So that je traite chaque partie sans confusion et que ma soirée compte pour mon streak.

**Acceptance Criteria:**

**Given** les blocs Sac, Devoirs à faire et Révisions du jour
**When** j'ouvre l'écran "Ce soir"
**Then** les trois blocs s'affichent distinctement dans une seule moment card, cochables dans n'importe quel ordre (FR-20, UX-DR4)

**Given** le bloc Sac et le bloc Révisions entièrement cochés, et tout devoir "à rendre" échéant demain marqué fait
**When** je coche le dernier élément
**Then** l'écran affiche une célébration courte ("Soirée prête !") et le moment "soir" est considéré complet pour le calcul du streak (FR-20, Epic 4)

**Given** un devoir sans échéance ou échéant dans plusieurs jours encore non fait
**When** j'ai coché tout le reste
**Then** ma soirée est quand même considérée complète — seuls les devoirs "à rendre" échéant demain comptent (PRD §9 assumption confirmée)

## Epic 3: Rappels et notifications

Léo est prévenu au bon moment, avec un filet de sécurité visuel si la notification système ne se déclenche pas.

### Story 3.1: Recevoir mes rappels quotidiens

As a enfant,
I want recevoir une notification à des heures configurables pour le soir, le matin et le retour,
So that je pense à ouvrir l'app même si je n'y pense pas spontanément.

**Acceptance Criteria:**

**Given** l'app installée et l'autorisation de notification accordée
**When** l'heure configurée pour un moment arrive
**Then** une notification Web Push est reçue, déclenchée par une route serveur invoquée par un Vercel Cron Job dédié à ce moment (FR-10, AD-8)

**Given** le plan Vercel Hobby (gratuit)
**When** un rappel est programmé
**Then** il se déclenche une fois par jour scolaire, avec une précision de ±59 minutes autour de l'heure configurée (limite connue du plan, documentée dans l'architecture)

**Given** un enfant sur Android avec Chrome
**When** la notification est envoyée
**Then** elle s'affiche de façon fiable, sans prérequis particulier

### Story 3.2: Voir un repli visuel si la notification n'est pas arrivée

As a enfant,
I want voir dans l'app ce qu'il me reste à faire, même si je n'ai reçu aucune notification,
So that l'absence de notification ne me fasse pas complètement oublier une checklist.

**Acceptance Criteria:**

**Given** un moment (soir/matin/retour) dont la checklist n'est pas encore complète
**When** j'ouvre l'app, quelle que soit la raison (notification reçue ou non)
**Then** un signal visuel (bannière) indique la checklist en attente, calculé depuis l'état réel des items — jamais depuis une confirmation de réception push (FR-11, AD-8)

### Story 3.3: Activer les rappels sur iPhone/iPad

As a enfant sur iOS,
I want être guidé pour ajouter l'app à mon écran d'accueil,
So that mes notifications fonctionnent malgré la restriction d'iOS sur les PWA non installées.

**Acceptance Criteria:**

**Given** une première ouverture sur Safari iOS
**When** l'app détecte qu'elle n'est pas installée sur l'écran d'accueil
**Then** un écran d'onboarding explique pourquoi l'ajouter et comment faire (FR-12)

**Given** iOS < 16.4 ou l'app non installée sur l'écran d'accueil
**When** un rappel est programmé
**Then** aucune notification système n'est envoyée, mais le repli visuel (Story 3.2) continue de fonctionner normalement

### Story 3.4: Choisir mes heures de rappel

As a enfant ou parent,
I want choisir à quelle heure chaque rappel (soir, matin, retour) se déclenche,
So that les notifications tombent au bon moment de notre routine plutôt qu'à une heure imposée par défaut.

**Acceptance Criteria:**

**Given** l'écran Réglages
**When** j'ouvre la section rappels
**Then** je vois une heure configurable pour chacun des trois moments, avec des valeurs par défaut raisonnables déjà proposées (ex. 20h/7h/17h) (FR-10)

**Given** une heure modifiée pour un moment
**When** j'enregistre
**Then** le prochain déclenchement de ce rappel utilise la nouvelle heure, dans la limite de précision du plan gratuit Vercel (±59min, déjà documentée en Story 3.1)

**Given** aucune heure n'a encore été configurée par l'enfant
**When** l'app est utilisée pour la première fois
**Then** les valeurs par défaut s'appliquent sans qu'aucune action ne soit requise (Story 3.1 fonctionne dès l'installation, ce réglage est une amélioration, pas un prérequis)

## Epic 4: Motivation — streak et badges

Léo voit sa progression et débloque des badges quand il tient ses routines dans la durée.

### Story 4.1: Construire mon streak au fil des jours

As a enfant,
I want que l'app compte mes jours consécutifs où j'ai tout fait,
So that je sois motivé à continuer plutôt que de tout laisser tomber après un oubli isolé.

**Acceptance Criteria:**

**Given** les moments soir (3 blocs), matin et retour tous complets un jour scolaire donné
**When** la journée se termine
**Then** ce jour est enregistré comme complet dans `DayCompletion`, et le streak courant se recalcule en remontant cette table (FR-13, AD-5)

**Given** un jour scolaire où au moins un moment n'est pas complet
**When** le streak est recalculé
**Then** il repart à zéro à partir du jour suivant, sans pénalité rétroactive ni message négatif (ton du PRD)

**Given** un jour marqué "sans cours"
**When** le streak est recalculé
**Then** ce jour est neutre — ni compté, ni cassant (FR-13)

### Story 4.2: Débloquer des badges

As a enfant,
I want débloquer des badges quand j'atteins certains paliers de streak,
So that j'aie une petite récompense visuelle pour ma régularité.

**Acceptance Criteria:**

**Given** mon meilleur streak atteint un palier défini (ex. 3, 7, 30 jours)
**When** j'ouvre l'écran Progression
**Then** le badge correspondant apparaît débloqué — sans table séparée d'unlock, uniquement dérivé de `bestStreak` (FR-14, AD-5)

**Given** un palier non encore atteint
**When** j'ouvre l'écran Progression
**Then** le badge apparaît en silhouette verrouillée, jamais invisible, avec sa condition d'obtention visible au tap (UX-DR6)

### Story 4.3: Voir ma progression

As a enfant,
I want consulter mon streak actuel et mon meilleur streak sur un écran dédié,
So that je visualise mes efforts dans la durée.

**Acceptance Criteria:**

**Given** un streak courant et un meilleur streak enregistrés
**When** j'ouvre l'écran Progression
**Then** les deux valeurs s'affichent clairement via le composant streak badge/chip (icône flamme + compteur), avec la grille de badges (FR-15, UX-DR5)

**Given** aucun classement ni comparaison avec d'autres enfants
**When** j'ouvre l'écran Progression
**Then** seules mes propres données apparaissent — pas de fonctionnalité sociale (NON-GOAL confirmé)
