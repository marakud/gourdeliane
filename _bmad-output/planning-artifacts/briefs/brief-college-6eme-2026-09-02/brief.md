---
title: "Product Brief: CartableFlow"
status: draft
created: 2026-09-02
updated: 2026-09-02
---

# Product Brief : CartableFlow [HYPOTHÈSE — nom à confirmer]

## Résumé exécutif

CartableFlow est une application web mobile/tablette (PWA) qui aide un enfant entrant en 6ème à gérer, seul, les nouvelles routines de l'organisation collège : savoir ce qu'il a cours demain, préparer le bon sac le soir, ne rien oublier en partant le matin, et faire ce qu'il faut en rentrant. Plutôt qu'une checklist générique, elle génère automatiquement la liste du sac du soir à partir de l'emploi du temps du lendemain — le cœur de sa valeur.

Le passage en 6ème change brutalement le niveau d'autonomie attendu d'un enfant : d'un instituteur unique qui gère tout, il passe à plusieurs professeurs, une matière différente par créneau, et la responsabilité de son propre matériel. C'est un moment classique d'oublis (cahiers, tenue de sport, matériel spécifique) et de charge mentale pour les parents qui doivent encore tout vérifier. CartableFlow déplace cette charge vers un outil que l'enfant utilise lui-même, avec un ton ludique adapté à son âge plutôt qu'un outil de productivité pensé pour un adulte.

C'est un projet personnel et familial : une seule famille utilisatrice pour l'instant, pas de visée commerciale. La priorité est que l'enfant l'adopte réellement dans sa routine quotidienne — pas la richesse fonctionnelle.

## Le problème

En primaire, un enfant n'a qu'un enseignant et une salle : l'organisation est portée par l'école. En 6ème, il doit suivre un emploi du temps qui change de matière (et donc de matériel nécessaire) à chaque heure, avec plusieurs professeurs qui n'attendent pas les mêmes choses. Concrètement :

- Le soir, il faut deviner ou se souvenir de ce qu'il faut mettre dans le sac pour le lendemain — et il est facile d'oublier un cahier ou une tenue de sport.
- Le matin, dans la précipitation, des objets essentiels (clés, goûter, carnet de correspondance) restent sur la table.
- Le soir en rentrant, les informations importantes (mot des parents, devoirs à faire) se perdent si personne n'y pense activement.

Aujourd'hui, c'est le parent qui compense : il vérifie le sac, rappelle les objets à prendre, relance pour les devoirs. Ça fonctionne, mais ça ne construit pas l'autonomie que le collège est censé développer, et ça demande une vigilance quotidienne au parent.

## La solution

Une PWA installée sur le téléphone ou la tablette de l'enfant, structurée autour de trois moments de la journée :

- **Le soir avant de dormir** : une checklist "sac du lendemain" générée automatiquement à partir de l'emploi du temps du jour suivant (ex. EPS demain → tenue de sport proposée dans la liste).
- **Le matin avant de partir** : une checklist fixe et récurrente (clés, goûter, carnet de correspondance, chargeur, etc.), qui se réinitialise chaque jour.
- **Le retour à la maison** : une checklist fixe (sortir le carnet/mot des parents, ranger le sac, devoirs faits).

Une couche de motivation légère (streaks, petits badges quand toutes les checklists du jour sont cochées) donne à l'enfant une raison d'y revenir seul, sans que ça tourne à la corvée numérique. Des notifications rappellent les moments clés, avec un repli visuel dans l'app pour les appareils où la notification système n'est pas fiable (contrainte détaillée dans l'addendum).

## Ce qui la différencie

Le vrai différenciateur n'est pas la checklist en elle-même — c'est une fonctionnalité banale — mais le fait qu'elle **se déduise de l'emploi du temps réel de l'enfant** plutôt que d'être une liste statique que l'enfant doit lui-même adapter chaque jour. C'est ce qui la rend utile à 11 ans : moins de charge cognitive, pas de liste à retenir par cœur.

Deuxième différenciateur, moins technique mais tout aussi important : c'est un outil taillé pour un enfant de cet âge précis (ton, animations, gratification immédiate), pas un gestionnaire de tâches d'adulte qu'on adapte tant bien que mal. Une appli générique de to-do list échouerait probablement pour la même raison qu'un agenda papier standard échoue souvent à cet âge : elle demande une discipline que l'enfant n'a pas encore.

Il n'y a pas de moat au sens produit — c'est un outil familial, pas un produit à défendre sur un marché.

## À qui ça s'adresse

**Utilisateur principal : l'enfant**, 11 ans, qui entre en 6ème. Il a besoin de savoir vite "qu'est-ce qu'il me faut demain", de checklists qui ne demandent pas d'effort de mémorisation, et d'un retour positif quand il fait bien les choses de lui-même. Le succès pour lui : moins d'oublis, moins de rappels parentaux, et une appli qu'il ouvre sans qu'on le lui demande.

**Utilisateur secondaire (futur) : le parent**. Non prioritaire pour la v1, mais le modèle de données doit permettre d'ajouter plus tard une vue parent (visibilité sur ce qui a été fait), sans réécrire la base.

## Critères de succès

Le succès se mesure à l'usage réel, pas à un objectif business :

- L'enfant ouvre l'application de lui-même aux trois moments clés (soir, matin, retour), sans qu'on le lui rappelle, dans les premières semaines d'usage.
- Réduction observable des oublis de matériel signalés par l'enfant ou constatés par le parent.
- La checklist du soir reste correcte au fil du temps (pas de dérive entre ce qui est généré et ce qu'il a réellement comme cours).
- [HYPOTHÈSE] Un système de streak maintenu au moins X jours consécutifs comme signe d'adoption réelle — seuil à ajuster une fois observé en usage réel plutôt que fixé à l'avance.

## Périmètre

**Dans la v1 :**
- Emploi du temps : saisie manuelle, vue "aujourd'hui / demain" en plus de la vue semaine.
- Checklist "sac du soir" générée automatiquement depuis l'emploi du temps du lendemain.
- Checklist "avant de partir le matin" (liste fixe, cochable, réinitialisée chaque jour).
- Checklist "au retour à la maison" (liste fixe, cochable).
- Notifications PWA aux moments clés, avec repli visuel in-app si la notification système n'est pas disponible.
- Système de motivation léger : streaks et/ou badges quotidiens.
- Modèle de données pensé pour accueillir une vue parent plus tard, sans l'exposer dans l'UI v1.

**Explicitement hors v1 (backlog) :**
- Intégration Pronote (devoirs, notes, informations des professeurs et de l'établissement) — dépendance à une librairie communautaire non officielle, traitée comme un lot séparé une fois le cœur de l'app stable et adopté (voir addendum pour le détail technique).
- Vue parent complète (au-delà de la préparation du modèle de données).
- Support multi-enfants / multi-profils.

## Vision

Si l'adoption se confirme, la suite naturelle est l'intégration Pronote (devoirs et notes remontés automatiquement, plus besoin de saisie manuelle de l'emploi du temps), puis une vue parent réelle pour un suivi discret sans micro-management. À plus long terme, si d'autres enfants de la famille entrent au collège, l'outil pourrait devenir multi-profils — mais rien de tout cela n'est un objectif en soi : la vision reste bornée par l'usage réel d'un enfant, pas par une ambition de croissance.
