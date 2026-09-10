# Addendum : CartableFlow

Contenu approfondi qui n'a pas sa place dans le brief exécutif mais qui sera utile aux étapes suivantes (PRD, UX, architecture).

## Choix de stack et alternative écartée

Le projet précédent de l'utilisateur (CourseFlow, une liste de courses intelligente, sans lien avec ce projet) est en PHP 8 / MySQL / Tailwind / JS vanilla, hébergé sur IONOS mutualisé. Ce choix avait été fait pour la simplicité de déploiement sur un hébergement mutualisé qui ne supporte que PHP.

Pour CartableFlow, l'utilisateur a explicitement demandé une expérience plus "dynamique et ludique" qu'un rendu de vues serveur classique, adaptée à un enfant de 11 ans (animations satisfaisantes en cochant une checklist, retour visuel sur un badge/streak). Stack retenue :

- **Next.js (React)** — composants réutilisables, écosystème large.
- **Tailwind CSS** — conservé du projet précédent, fonctionne identiquement avec React.
- **Framer Motion** (+ Lottie en option pour des animations de célébration) — nécessaire pour le côté ludique demandé ; difficile à obtenir avec des vues PHP classiques sans réécrire une couche JS équivalente.
- **Prisma + SQLite, ou Supabase** — plus simple à opérer qu'un MySQL classique pour un projet à un seul foyer utilisateur ; Supabase laisse une option d'évolution (comptes, sync multi-appareils) si la vue parent ou le multi-profils se concrétisent.
- **PWA** (via next-pwa ou Serwist) — installable, fonctionnement offline pour les checklists.
- **Déploiement : Vercel**, gratuit à ce volume d'usage, déploiement automatique à chaque push. Conséquence directe du changement de stack : l'hébergement IONOS mutualisé actuel ne fait pas tourner du Next.js/Node, donc ce projet vit sur une infrastructure de déploiement différente de CourseFlow. Assumé et validé par l'utilisateur — ce n'est pas un problème, juste un fait à ne pas perdre de vue à l'étape architecture/déploiement.

## Contrainte technique : notifications multi-plateformes

L'utilisateur a confirmé vouloir cibler à la fois iPhone/iPad et Android dès la v1, sans plateforme privilégiée. Point de vigilance pour l'UX et l'architecture :

- **Android/Chrome** : Web Push fonctionne de façon fiable, sans prérequis particulier.
- **iOS/iPadOS** : les notifications web push ne fonctionnent que si l'app est ajoutée à l'écran d'accueil (mode standalone) ET sur iOS ≥ 16.4. En dessous, ou si l'app n'est pas installée sur l'écran d'accueil, aucune notification système n'est possible.

Conséquence pour la conception : prévoir dès le départ un mécanisme de repli purement in-app (badge visuel, bannière au lancement, état "à faire" persistant) qui ne dépend pas de la notification système, pour que l'expérience reste cohérente même quand la notification native ne se déclenche pas. Le flux d'onboarding devra aussi guider explicitement l'enfant vers "Ajouter à l'écran d'accueil" sur iOS, sans quoi une bonne partie de la valeur (rappels au bon moment) ne fonctionne pas du tout sur cet appareil.

## Roadmap Pronote (hors scope v1)

Objectif futur exprimé par l'utilisateur : récupérer via Pronote les devoirs, les notes, et les informations des professeurs et de l'établissement.

Contrainte de fond : Pronote n'expose aucune API officielle publique. Toute intégration passe par une librairie communautaire construite par rétro-ingénierie du client web Pronote, ce qui comporte un risque de fragilité (une mise à jour Pronote peut casser la librairie tant qu'elle n'a pas été mise à jour par sa communauté) et une zone grise vis-à-vis des CGU de l'éditeur.

Deux options techniques identifiées :
- **pronotepy** (Python) — la plus connue et la plus mature, mais impose un micro-service séparé puisque le reste du stack est en Node/TypeScript.
- **pawnote** (TypeScript) — activement maintenue au moment de cette conversation, s'intègre nativement au stack Next.js/Node retenu, ce qui évite d'introduire un second runtime. Piste privilégiée à ce stade, **à revérifier au moment de l'implémentation** (maintenance active, compatibilité avec l'ENT de l'établissement le cas échéant) plutôt qu'à prendre pour acquis.

Exigence de sécurité déjà actée : les identifiants Pronote de l'enfant devront être stockés chiffrés au repos, jamais en clair, jamais journalisés.

Cette intégration est volontairement repoussée après la v1 : elle introduit un risque technique et une dépendance externe non maîtrisée, alors que la valeur du produit (routines, autonomie) ne dépend pas d'elle pour démarrer.

**Mise à jour (2026-09-09, recherche technique + décision) :** revérifiée comme prévu ci-dessus, avant plutôt qu'au moment de l'implémentation. Rapport complet : `_bmad-output/planning-artifacts/research/technical-integration-pronote-pawnote-2026-09-09/research.md`. Constat : `pawnote` (la piste privilégiée ci-dessus) est en réalité obsolète -- aucune release npm depuis ~11,5 mois, dépôts GitHub introuvables, auteur migré vers un hébergement auto-géré sans successeur TypeScript maintenu identifié. `pronotepy` reste vivant mais en "mode maintenance" et sans pont natif vers Node (second runtime requis). **Décision de l'utilisateur : abandonné, pas juste reporté.** Motif au-delà du seul risque technique/légal (réel, cf. rapport) : faire noter les devoirs par l'enfant lui-même sert directement l'objectif d'autonomie de ce produit -- l'automatiser via Pronote irait à l'encontre de cette valeur, pas seulement en coûter la maintenance. À ne pas reprendre sans qu'un besoin concret et nouveau ne le justifie.

## Historique de décision

Le détail des échanges, décisions et hypothèses qui ont mené à ce brief est journalisé dans `.memlog.md` (même dossier).
