# Epic 2 Context: Routines quotidiennes intelligentes

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Léo doit savoir, sans y penser, quoi mettre dans son sac (déduit automatiquement de son EDT), quels devoirs faire, quoi réviser le soir même, et cocher ses routines fixes du matin et du retour. Ces cinq mécaniques (sac, devoirs, révisions, matin, retour) sont regroupées dans un seul epic car elles partagent le même mécanisme technique (checklist recalculée en direct depuis l'EDT, jamais stockée comme copie figée) et s'affichent sur le même écran Accueil — les séparer créerait des allers-retours inutiles sur les mêmes fichiers. C'est le cœur différenciant du produit : l'enfant n'a plus à se souvenir lui-même de ce qu'il faut préparer.

## Stories

- Story 2.1: Voir et personnaliser mon sac du soir
- Story 2.2: Cocher mes routines fixes du matin
- Story 2.3: Cocher mes routines fixes du retour
- Story 2.4: Noter et suivre mes devoirs
- Story 2.5: Lier un devoir à rendre à mon sac du lendemain
- Story 2.6: Revoir mes cours du jour
- Story 2.7: Voir ma soirée organisée en 3 blocs et savoir quand elle est terminée

## Requirements & Constraints

- Chaque matière a une liste d'objets par défaut (ex. "EPS" → tenue de sport) ; l'enfant ou le parent peut ajouter/modifier/supprimer ces objets, la modification s'appliquant à toutes les occurrences futures de cette matière.
- Si demain est marqué "sans cours", aucune checklist sac n'est générée (état neutre, pas de liste vide). Même règle pour le bloc Révisions si aujourd'hui était "sans cours".
- Les checklists Matin et Retour sont fixes (indépendantes de l'EDT), personnalisables (ajout/retrait d'éléments dans les Réglages), et se décochent automatiquement à chaque nouveau jour scolaire.
- Un devoir se crée avec seulement matière + description obligatoires ("à rendre" et échéance restent optionnels pour ne pas freiner une saisie rapide entre deux cours) et apparaît immédiatement dans "devoirs à faire", sans écran de confirmation.
- Un devoir ne se réinitialise jamais automatiquement : il reste visible jusqu'à être marqué fait explicitement, même sur plusieurs jours, sans pénalité visuelle liée à son ancienneté.
- Un devoir "à rendre" n'ajoute un objet au sac que si son échéance est exactement le jour scolaire suivant ; sans échéance renseignée ou avec une échéance plus lointaine, aucun objet n'est ajouté au sac (le devoir reste seulement dans "devoirs à faire").
- Le bloc Révisions du jour génère un rappel "Revoir le cours de [matière]" pour chaque matière suivie le jour même (pas le lendemain), cochable comme les autres checklists.
- L'écran "Ce soir" affiche Sac, Devoirs à faire et Révisions du jour comme trois blocs indépendamment progressables, cochables dans n'importe ordre. Le moment "soir" n'est complet (pour le streak, Epic 4) que lorsque Sac et Révisions sont entièrement cochés ET que tout devoir "à rendre" échéant le lendemain est marqué fait — les devoirs sans échéance ou échéant plus tard ne bloquent pas cette complétude.
- Bloc Devoirs vide → message positif ("Rien à faire ce soir, bravo !"), jamais une absence silencieuse de bloc (contrairement à Sac/Révisions qui, eux, disparaissent proprement en cas de "sans cours").
- Aucune couleur d'alerte (rouge) pour un devoir en retard ou une checklist incomplète — ton toujours neutre/positif, jamais culpabilisant.
- Fiabilité : le sac et les révisions doivent toujours refléter fidèlement l'EDT réellement saisi (recalcul en direct, jamais une copie figée).
- Accessibilité : zones de tap ≥44/48px, état coché jamais indiqué par la seule couleur, `prefers-reduced-motion` respecté, texte ≥16px.

## Technical Decisions

Cet epic s'appuie sur les modèles Prisma déjà livrés par l'Epic 1 (`User`, `Subject`, `ScheduleSlot`, `NoSchoolDay`), les Server Actions dans `actions/`, la logique de dérivation pure dans `domain/`, ainsi que les tokens de design/fonts/coquille de navigation déjà en place.

- **AD-2 — Sac et Révisions sont des vues dérivées, jamais stockées.** Le contenu de ces deux blocs est calculé à la lecture à partir de `ScheduleSlot` + `Subject` + `SubjectItem` + `Devoir` du jour concerné. Aucune table ne persiste "la checklist du 14/10" comme liste générée à l'avance — c'est le mécanisme central de tout l'epic, à ne jamais contourner par un cache ou une copie stockée.
- **AD-3 — L'état coché se clé par identité stable, jamais par libellé.** `ChecklistItemState` est clé par `(date, checklistType, sourceType, sourceId)`, jamais par le texte affiché. Le recalcul en direct rejoue cette clé contre les données courantes : un item encore présent garde son état coché, un nouvel item apparaît décoché, un item disparu du calcul n'est simplement plus rendu (pas de purge active requise). Gouverne aussi bien Sac que Matin/Retour/Révisions.
- **AD-7 — Un Devoir ne suit pas le cycle de réinitialisation quotidien.** `Devoir.done` ne change que par action explicite de l'enfant ; contrairement à `ChecklistItemState`, aucune tâche planifiée ne réinitialise ou ne purge un Devoir.
- **AD-4 (rappel)** — le "jour scolaire", "demain" et la bascule de moment (soir/matin/retour) se calculent côté serveur en fuseau Europe/Paris, jamais depuis l'heure locale du client ; s'applique directement au calcul de Sac (demain) et Révisions (aujourd'hui).
- **AD-6 (rappel)** — la couleur d'une `Subject` est assignée une fois à sa création et ne se recalcule jamais ; les subject tags utilisés dans le sac/checklist doivent rester cohérents avec celle de l'EDT.
- Modèles Prisma à ajouter pour cet epic : `SubjectItem` (objets par défaut par matière, FR-4), `FixedChecklistItem` (items fixes Matin/Retour, FR-6/FR-8), `Devoir` (matière, description, `aRendre`, `echeance` optionnelle, `done`), `ChecklistItemState` (état coché keyé par identité stable).
- Toute mutation (cocher un item, créer/modifier un devoir, personnaliser une liste d'objets) passe par une Server Action dans `actions/`, qui appelle une fonction pure de `domain/` (ex. `domain/checklist.ts`, `domain/homework.ts`, `domain/revision.ts`) avant d'écrire via `data/`. Aucun accès Prisma direct depuis un Client Component.
- Les Server Actions retournent `{ ok: true, data } | { ok: false, error }` ; l'UI n'a jamais à réimplémenter le calcul de complétude d'un bloc/moment — elle affiche l'état retourné par la Server Action après une coche.
- Emplacement attendu dans la carte capacité → architecture : Sac (`domain/checklist.ts`, `app/(accueil)/`), Devoirs/Révisions (`domain/homework.ts`, `domain/revision.ts`, `actions/homework.ts`), Matin/Retour (`domain/checklist.ts`, partagé avec Sac).

## UX & Interaction Patterns

- Checklist item : pastille de matière (ou icône générique) + libellé + case à cocher circulaire ; tap unique pour cocher/décocher, animation de coche courte (<300ms), pas de confirmation ni de swipe.
- Devoir row : tap pour marquer fait ; contrairement à un checklist item, reste affiché jusqu'à être coché, potentiellement plusieurs jours.
- Moment card "soir" : contient les 3 sous-blocs Sac/Devoirs/Révisions au lieu d'une liste plate, avec un compteur "x/y" visible par bloc. Matin/Retour utilisent la variante liste simple.
- FAB "Ajouter un devoir" persistant sur Accueil et Emploi du temps, ouvre un modal de saisie rapide (matière + description obligatoires) qui se ferme immédiatement après validation, sans écran de confirmation séparé.
- États spécifiques à respecter : jour sans cours → message neutre ("Pas cours demain, profite de ta soirée." / bloc Révisions simplement absent) ; bloc Devoirs vide → message positif ; devoir en retard → aucune couleur d'alerte, éventuellement un tri par ancienneté plutôt qu'une couleur.
- Célébration courte (<1,5s) quand les 3 blocs du soir sont complets ("Soirée prête !"), jamais bloquante pour l'usage suivant ; réduite à un simple changement d'état statique si `prefers-reduced-motion` est actif.
- Microcopies : ton positif et concret ("Il te reste 2 choses à vérifier." plutôt que "Attention, tu as oublié 2 éléments.").
- Subject tag : même pastille colorée réutilisée entre EDT, checklist du soir et devoir row, pour un repérage visuel cohérent.

## Cross-Story Dependencies

- Story 2.1 (Sac) et Story 2.6 (Révisions) dépendent directement de l'EDT (`ScheduleSlot`/`Subject`) et du marquage "sans cours" livrés par l'Epic 1.
- Story 2.5 dépend de Story 2.4 (un devoir doit exister, avec "à rendre" + échéance) pour ajouter un objet au sac de Story 2.1 — elle enrichit le calcul du bloc Sac plutôt que de le remplacer.
- Story 2.7 assemble les résultats de Story 2.1, 2.4/2.5 et 2.6 dans l'écran "Ce soir" et définit la règle de complétude du moment "soir" ; elle ne peut être livrée qu'après ces stories.
- La complétude par moment (soir 3 blocs, matin, retour) produite dans cet epic est la donnée consommée par l'Epic 4 (streak/badges via `DayCompletion`) — toute divergence dans le calcul de complétude ici se répercute directement sur l'Epic 4.
- Le repli visuel (Epic 3, FR-11) se base sur l'état réel des items en attente calculé par cet epic, pas sur un accusé de réception push.
