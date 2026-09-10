# Epic 3 Context: Rappels et notifications

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Léo doit être prévenu au bon moment (soir, matin, retour) sans avoir à y penser lui-même et sans dépendre de sa propre initiative pour ouvrir l'app — avec un filet de sécurité visuel qui fonctionne même quand la notification système ne s'est pas déclenchée (contrainte connue sur iOS). Cet epic est volontairement isolé du reste : c'est la partie techniquement la plus délicate du produit (notifications cross-plateforme, limites d'un plan d'hébergement gratuit), et l'app reste pleinement utilisable pendant qu'elle se stabilise.

## Stories

- Story 3.1: Recevoir mes rappels quotidiens
- Story 3.2: Voir un repli visuel si la notification n'est pas arrivée
- Story 3.3: Activer les rappels sur iPhone/iPad
- Story 3.4: Choisir mes heures de rappel

## Requirements & Constraints

- Un rappel se déclenche à une heure configurable pour chacun des trois moments (soir/matin/retour), avec des valeurs par défaut raisonnables déjà proposées avant toute personnalisation.
- Sur Android/Chrome, la notification push se déclenche de façon fiable sans prérequis particulier.
- Sur iOS/iPadOS, aucune notification système n'est possible tant que l'app n'est pas ajoutée à l'écran d'accueil (mode standalone) sur iOS ≥ 16.4 ; en dessous ou sans cet ajout, aucun rappel système n'arrive.
- Un signal visuel in-app (bannière) doit toujours indiquer une checklist du jour non complétée à l'ouverture de l'app, quelle que soit la raison de l'absence de notification — jamais déduit d'un accusé de réception push, qu'aucune plateforme ne garantit.
- Lors de la première utilisation sur iOS, un écran dédié explique pourquoi et comment ajouter l'app à l'écran d'accueil, condition nécessaire pour recevoir les rappels.
- Pas de canal de notification alternatif (SMS, email) en v1.
- Limite connue et acceptée du plan Vercel gratuit : un déclenchement par jour scolaire par moment, précision ±59 minutes autour de l'heure configurée — pas une erreur à corriger, à documenter si besoin côté PM.
- Ton toujours neutre/positif dans les rappels et le repli visuel : jamais une formulation qui pointe un oubli ou une urgence, cohérent avec le reste du produit.

## Technical Decisions

- **AD-8 — Notifications programmées côté serveur, repli visuel indépendant de la livraison push.** Trois Vercel Cron Jobs distincts (un par moment) invoquent chacun leur propre route serveur qui envoie les Web Push aux abonnements enregistrés — jamais une seule route générique qui devine le moment. Le repli visuel se recalcule à chaque ouverture de l'app à partir de l'état réel des items en attente, jamais d'une confirmation de réception.
- **AD-4 — Jour scolaire et bascule de moment calculés côté serveur, fuseau fixe `America/Guadeloupe`** (corrigé après Story 1.4, ne pas réutiliser `Europe/Paris` malgré d'anciennes mentions) — s'applique à la fois au calcul de "quel moment/quelle heure" et au filtre jour scolaire (pas de rappel un week-end ou un jour marqué "sans cours").
- Un abonnement Web Push (`PushSubscription`) est scopé par `userId` comme le reste du modèle de données ; un abonnement qui échoue avec un statut indiquant qu'il n'est plus valide (410/404) est supprimé plutôt que retenté indéfiniment.
- Toute route cron vérifie un secret dédié avant d'envoyer quoi que ce soit — jamais un endpoint public invocable sans authentification.
- Envoi via `web-push` (VAPID) ; couche d'envoi/abonnement en dehors de `domain/` (dépend de `web-push`, donc pas pure) mais la logique de décision (quel moment, faut-il sauter ce jour) reste une fonction pure testable indépendamment de l'infra push, conforme à AD-1 (mutation/effets de bord uniquement via `actions/`, jamais de logique métier dupliquée côté client).
- Valeurs par défaut déjà arbitrées pour Story 3.1 : 20h (soir), 7h (matin), 17h (retour) — Story 3.4 les rend éditables sans changer ce mécanisme sous-jacent.
- Story 3.3 (onboarding iOS) ne construit que le flux d'explication/guidage ; elle ne modifie pas l'envoi push lui-même, qui reste géré par Story 3.1.

## UX & Interaction Patterns

- Repli visuel : bandeau discret (pas une bannière d'erreur intrusive) rappelant la checklist en attente, affiché à l'ouverture/premier plan de l'app.
- Écran d'onboarding iOS dédié à la première ouverture : explique explicitement pourquoi ajouter l'app à l'écran d'accueil est nécessaire pour recevoir les rappels, et comment le faire ; sans cet ajout, l'app reste pleinement utilisable, seul le repli visuel remplace la notification système.
- Réglage des heures de rappel dans l'écran Réglages (accès secondaire, hors barre de navigation principale).
- Banni explicitement : notifications de réengagement type "tu nous manques", et tout mécanisme qui pénalise visuellement (couleur rouge, icône d'échec) une checklist non complétée — y compris dans le contenu du rappel lui-même.
- Accessibilité : zones de tap ≥44px iOS/48dp Android, `prefers-reduced-motion` respecté pour toute animation liée à ces écrans.

## Cross-Story Dependencies

- Story 3.2 (repli visuel) lit l'état de complétude des checklists/moments produit par l'Epic 2 — elle n'invente pas son propre calcul, elle affiche celui déjà produit ailleurs (cohérent avec la convention "l'UI ne réimplémente jamais la complétude").
- Story 3.3 (onboarding iOS) est un prérequis fonctionnel pour que Story 3.1 produise un effet visible sur iOS, mais les deux se livrent et se testent indépendamment (Android n'a pas besoin de Story 3.3 pour que Story 3.1 fonctionne).
- Story 3.4 (heures configurables) s'appuie sur le mécanisme cron déjà en place via Story 3.1 ; elle ne le remplace pas, elle ajoute une couche de personnalisation par-dessus des valeurs par défaut déjà fonctionnelles.
- Le repli visuel de Story 3.2 et le calcul de complétude qu'il affiche seront aussi la base du calcul du streak en Epic 4 — toute divergence dans "qu'est-ce qu'un moment complet" doit rester cohérente entre les deux epics.
