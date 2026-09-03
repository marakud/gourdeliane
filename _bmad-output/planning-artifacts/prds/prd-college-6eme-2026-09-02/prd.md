---
title: CartableFlow
created: 2026-09-02
updated: 2026-09-02
status: final
---

# PRD : CartableFlow
*Nom de travail — à confirmer, voir brief.*

## 0. Objet du document

Ce PRD détaille les exigences fonctionnelles de CartableFlow pour l'équipe qui va le concevoir et le construire (ici, l'utilisateur et l'assistant qui l'accompagne dans la méthode BMAD). Il s'appuie sur le [brief produit](../../briefs/brief-college-6eme-2026-09-02/brief.md) déjà validé et ne le duplique pas : vision, problème et différenciateur y restent définis, ce document se concentre sur le comportement précis du produit. Le vocabulaire du §3 Glossaire fait foi ; les exigences fonctionnelles (FR) sont numérotées globalement et référencées par les documents suivants (UX, architecture, epics). Les détails techniques (stack, sécurité Pronote, contrainte notifications) restent dans l'[addendum du brief](../../briefs/brief-college-6eme-2026-09-02/addendum.md) et son propre addendum ici.

## 1. Vision

CartableFlow accompagne un enfant qui entre en 6ème dans les routines que le collège lui impose du jour au lendemain : un emploi du temps qui change de matière à chaque heure, plusieurs professeurs, et la responsabilité de son propre matériel — là où le primaire ne demandait ni l'un ni l'autre. Le produit déduit automatiquement ce qu'il faut préparer le soir à partir de son emploi du temps réel, et l'accompagne aux deux autres moments critiques de la journée : le départ le matin, et le retour à la maison.

Ce n'est pas un gestionnaire de tâches générique adapté tant bien que mal à un enfant de 11 ans : c'est un outil pensé pour lui dès le départ — ton positif, gratification immédiate, aucune charge de saisie quotidienne au-delà de cocher ce qui est fait. Le succès se mesure à un seul critère : est-ce qu'il l'utilise seul, sans qu'on le lui rappelle.

## 2. Utilisateur cible

### 2.1 Jobs To Be Done

- Savoir, sans réfléchir, ce qu'il doit mettre dans son sac pour le lendemain.
- Ne rien oublier d'essentiel en partant le matin, sans dépendre de la vérification d'un parent.
- Faire ce qu'il faut en rentrant (mot des parents, devoirs) sans que ça se perde dans le reste de sa soirée.
- Se sentir reconnu quand il fait bien les choses de lui-même, sans que ça tourne à la corvée numérique.

### 2.2 Non-utilisateurs (v1)

- Le parent en tant qu'utilisateur actif de l'app — le modèle de données le prévoit, mais aucune UI parent n'existe en v1 (voir §5 Non-Goals).
- D'autres enfants de la famille — v1 mono-enfant, pas de multi-profils.
- Tout usage hors du cadre du collège (lycée, primaire) — l'app est pensée pour l'organisation d'un emploi du temps par matières/créneaux typique du collège.

### 2.3 Parcours utilisateurs clés

*Léo est un nom d'illustration [ASSUMPTION: à remplacer par le prénom réel de l'enfant, ou garder neutre si l'app doit rester personnalisable multi-enfants plus tard].*

- **UJ-1. Léo prépare sa soirée scolaire sans avoir à y penser.**
  - **Persona + contexte :** Léo, 11 ans, rentre de l'école, dîne, et avant de se coucher doit préparer son sac, faire ses devoirs et revoir ce qu'il a vu en cours.
  - **État initial :** app installée sur son téléphone/tablette, EDT déjà saisi pour la semaine ; il a éventuellement déjà noté ses devoirs dans la journée (voir UJ-4).
  - **Parcours :** il ouvre l'app (ou reçoit une notification vers l'heure du coucher) → l'écran "Ce soir" affiche trois blocs : le sac pour demain ("Demain : Maths, SVT, EPS" avec cahier de maths, cahier de SVT, tenue de sport, plus une feuille de devoir maison à rendre s'il en a noté un pour demain), les devoirs à faire ce soir, et les matières du jour à revoir → il traite les trois blocs, dans l'ordre qu'il veut, en cochant au fur et à mesure.
  - **Climax :** les trois blocs sont complets, l'app confirme visuellement "Soirée prête !" avec une animation de validation, et le streak du jour s'incrémente.
  - **Résolution :** le sac et les révisions se réinitialisent pour le lendemain soir ; les devoirs non liés à demain restent visibles tant qu'ils ne sont pas faits.
  - **Cas limite :** s'il n'a pas école le lendemain (jour férié, vacances), le bloc sac ne se déclenche pas (état neutre) ; le bloc révisions ne se déclenche pas non plus si le jour même était sans cours.

- **UJ-4. Léo note un devoir en sortant de cours.**
  - **Persona + contexte :** Léo, entre midi et deux ou juste après les cours, encore au collège ou sur le chemin du retour, avant d'avoir oublié ce que le professeur a donné.
  - **État initial :** app ouverte à tout moment de la journée, pas seulement le soir.
  - **Parcours :** il ouvre l'app → accède à l'ajout rapide d'un devoir → sélectionne la matière (parmi celles de son EDT), tape une description courte ("exercices p.24"), coche "à rendre" si c'est un devoir à remettre et choisit l'échéance si besoin.
  - **Climax :** le devoir apparaît immédiatement dans "à faire", sans confirmation superflue qui ralentirait une saisie faite rapidement entre deux moments.
  - **Résolution :** le devoir retrouvera Léo le soir dans le bloc "devoirs à faire" de l'écran "Ce soir", et dans le sac si échéance = lendemain.
  - **Cas limite :** saisie minimale volontaire (matière + description courte suffisent) — l'échéance et le statut "à rendre" restent optionnels pour ne pas décourager la prise de note rapide.

- **UJ-2. Léo vérifie tout avant de partir, sans que sa mère ait à le lui demander.**
  - **Persona + contexte :** le matin, dans la précipitation avant de partir.
  - **État initial :** notification ou ouverture manuelle de l'app.
  - **Parcours :** l'app affiche la checklist fixe du matin (clés, goûter, carnet de correspondance, chargeur...) → il coche chaque élément.
  - **Climax :** liste complète cochée, retour visuel positif.
  - **Résolution :** il part l'esprit tranquille ; la liste se réinitialisera automatiquement le lendemain matin.
  - **Cas limite :** s'il coche la liste en retard (déjà à l'école), l'app ne le pénalise pas — l'objectif est l'usage, pas la ponctualité de la coche.

- **UJ-3. Léo traite ce qu'il faut en rentrant, avant de passer à autre chose.**
  - **Persona + contexte :** retour à la maison après les cours.
  - **État initial :** ouverture de l'app, spontanée ou via rappel.
  - **Parcours :** checklist fixe du retour (sortir le carnet/mot des parents, ranger le sac, devoirs faits) → il coche.
  - **Climax :** journée "complète" si les trois checklists du jour sont cochées → déclenchement du streak.
  - **Résolution :** il voit son streak progresser, petite satisfaction visuelle.

## 3. Glossaire

- **EDT (Emploi du temps)** — la structure hebdomadaire des cours de l'enfant : jour, créneau horaire, matière.
- **Créneau** — un bloc horaire de l'EDT associé à une matière.
- **Jour scolaire** — un jour où l'enfant a cours, par opposition à un jour sans cours (week-end, vacances, férié) marqué manuellement en v1.
- **Checklist Sac du Soir** — liste d'objets à préparer, générée à partir des matières du jour scolaire suivant.
- **Checklist Matin** — liste fixe et récurrente d'objets à vérifier avant de partir.
- **Checklist Retour** — liste fixe et récurrente d'actions à faire en rentrant.
- **Streak** — nombre de jours scolaires consécutifs où les trois checklists du jour ont été entièrement cochées.
- **Badge** — récompense visuelle débloquée à l'atteinte d'un palier de Streak.
- **Devoir** — tâche scolaire (exercice, travail à rendre) associée à une matière, saisie manuellement par l'enfant. Contrairement aux checklists, un Devoir persiste jusqu'à être marqué fait : il ne se réinitialise pas chaque soir.
- **Devoir à rendre** — un Devoir marqué comme devant être remis physiquement en classe à une date d'échéance donnée. Quand cette échéance tombe le jour scolaire suivant, il ajoute un objet spécifique à la Checklist Sac du Soir, en plus du matériel générique de la matière.
- **Révision du jour** — rappel généré automatiquement pour chaque matière suivie le jour même (pas le lendemain), invitant à revoir le cours vu. Se réinitialise chaque soir, à la différence d'un Devoir.
- **Vue Parent** — vue de consultation pour le parent, prévue dans le modèle de données mais hors périmètre v1 (voir addendum).
- **Repli visuel** — mécanisme in-app (bannière, badge) qui signale une checklist en attente quand la notification système ne s'est pas déclenchée (contrainte iOS, voir addendum du brief).

## 4. Fonctionnalités

### 4.1 Emploi du temps

**Description :** L'enfant (ou le parent, en pratique probablement lors de la mise en place initiale) saisit manuellement l'EDT hebdomadaire. L'app en tire une vue "Aujourd'hui/Demain" en plus de la vue semaine classique. C'est la donnée source dont dépend la génération automatique du sac du soir (§4.2).

#### FR-1 : Saisie de l'emploi du temps

Le parent ou l'enfant peut créer, modifier et supprimer un créneau (jour, heure de début/fin, matière) dans l'EDT hebdomadaire.

**Conséquences (testables) :**
- Un créneau appartient à exactement un jour de la semaine et une matière.
- L'EDT saisi est réutilisé identiquement chaque semaine. `[ASSUMPTION: pas d'alternance de semaines A/B en v1 — à confirmer selon le fonctionnement réel de l'établissement ; si l'alternance existe, elle affecte directement ce FR et doit être tranchée avant l'architecture.]`
- Un jour peut être marqué manuellement "sans cours" (férié, vacances) pour désactiver la génération de la checklist du soir correspondante.

#### FR-2 : Vue Aujourd'hui/Demain

L'enfant peut consulter une vue "Aujourd'hui" et "Demain" listant les matières et horaires du jour concerné, réalise UJ-1 et UJ-2.

**Conséquences (testables) :**
- La vue "Demain" reflète le jour scolaire suivant, en sautant les jours marqués "sans cours".
- La vue semaine complète reste disponible séparément.

**Notes :** La vue semaine est secondaire à l'usage quotidien — Aujourd'hui/Demain est l'écran que l'enfant doit voir en priorité (à confirmer en UX).

### 4.2 Checklist Sac du Soir

**Description :** Le cœur différenciant du produit. Génère automatiquement la liste d'objets à préparer pour le lendemain, à partir des matières prévues, plutôt que de demander à l'enfant de la construire lui-même chaque soir. Réalise UJ-1.

#### FR-3 : Génération automatique de la checklist du soir

Le système propose une checklist d'objets déduite des matières du jour scolaire suivant.

**Conséquences (testables) :**
- Chaque matière est associée à une liste d'objets par défaut (ex. "EPS" → tenue de sport).
- Si demain est un jour "sans cours", aucune checklist sac n'est générée (état neutre, pas une liste vide qui ressemble à un bug).
- La checklist se réinitialise chaque soir pour le jour scolaire suivant.
- Si un Devoir à rendre (FR-18) a pour échéance le jour scolaire suivant, l'objet correspondant est ajouté à cette même checklist, en plus du matériel générique de la matière concernée.
- La checklist n'est jamais figée : elle reflète l'EDT tel qu'il est enregistré au moment de la consultation, pas une copie prise une fois pour toutes. Si l'EDT du jour scolaire suivant est modifié après que la checklist a déjà été partiellement cochée, elle se recalcule : les objets qui restent valables gardent leur état coché/non coché, les nouveaux objets apparaissent décochés, et ceux qui ne correspondent plus à aucune matière du lendemain disparaissent.

#### FR-4 : Personnalisation des objets par matière

L'enfant ou le parent peut modifier la liste d'objets par défaut associée à une matière (ajouter, retirer, renommer un objet).

**Conséquences (testables) :**
- Une modification s'applique à toutes les occurrences futures de cette matière dans l'EDT.

#### FR-5 : Cocher la checklist du soir

L'enfant peut cocher/décocher chaque objet de la checklist du soir en cours.

**Conséquences (testables) :**
- L'état de complétion du jour est utilisé par le calcul du Streak (§4.7).

### 4.3 Devoirs et Révision du Jour

**Description :** Complète la checklist sac du soir avec deux axes distincts : un suivi des devoirs que l'enfant note lui-même dans la journée, et un rappel de révision basé sur les matières réellement suivies le jour même. Réalise UJ-1 (bloc soir) et UJ-4 (saisie d'un devoir).

#### FR-16 : Création d'un devoir

L'enfant peut créer un devoir à tout moment de la journée : matière (choisie parmi celles de son EDT), description courte en texte libre, indicateur optionnel "à rendre", échéance optionnelle.

**Conséquences (testables) :**
- Seule la matière et la description sont obligatoires — l'échéance et "à rendre" restent optionnels pour ne pas freiner une saisie rapide entre deux cours.
- Un devoir créé est immédiatement visible dans "devoirs à faire", sans étape de confirmation intermédiaire.

#### FR-17 : Persistance d'un devoir

Un devoir reste visible dans "devoirs à faire" jusqu'à ce qu'il soit marqué fait par l'enfant.

**Conséquences (testables) :**
- Contrairement aux checklists sac/matin/retour, un devoir ne se réinitialise pas automatiquement chaque soir : il persiste tant qu'il n'est pas coché fait.

#### FR-18 : Lien devoir à rendre → checklist sac

Un devoir marqué "à rendre" dont l'échéance est le jour scolaire suivant apparaît comme objet spécifique dans la Checklist Sac du Soir de ce soir-là (voir FR-3).

**Conséquences (testables) :**
- Cet objet est distinct du matériel générique déjà associé à la matière (ex. "Feuille de devoir maison de maths à rendre" en plus de "Cahier de maths").
- Un devoir "à rendre" sans échéance renseignée n'apparaît pas dans la checklist sac (pas de date à comparer) — il reste néanmoins visible dans "devoirs à faire". `[NOTE FOR PM: à surveiller à l'usage — si l'enfant oublie systématiquement de renseigner l'échéance, ce lien perd sa valeur.]`

#### FR-19 : Révision du jour

Le système génère chaque soir, pour chaque matière suivie le jour scolaire même (pas le lendemain), un rappel "Revoir le cours de [matière]" affiché dans le bloc Révision du jour.

**Conséquences (testables) :**
- Basé sur l'EDT du jour même, indépendamment du bloc sac (qui regarde le lendemain).
- Si le jour même était "sans cours", aucun rappel de révision n'est généré ce soir-là.
- Le bloc se réinitialise chaque soir, comme la checklist sac.
- Comme la checklist sac (FR-3), ce bloc se recalcule en direct à partir de l'EDT du jour même — pas de copie figée.

#### FR-20 : Écran "Ce soir" en trois blocs

L'écran/moment "Ce soir" organise trois blocs distincts et progressables indépendamment : Sac pour demain (FR-3 à FR-5), Devoirs à faire (FR-16, FR-17), Révisions du jour (FR-19).

**Conséquences (testables) :**
- L'enfant peut cocher les blocs dans n'importe quel ordre.
- Le moment "Ce soir" n'est considéré complet, pour le calcul du Streak (FR-13), que lorsque les trois blocs sont traités : Sac et Révisions entièrement cochés, et tout Devoir à rendre échéant le jour scolaire suivant marqué fait. `[ASSUMPTION: les devoirs sans échéance ou échéant plus tard ne bloquent pas le streak du soir — seuls ceux qui échoient explicitement le lendemain comptent. À confirmer, c'est un point de conception qui affecte directement la mécanique de motivation.]`

### 4.4 Checklist Matin

**Description :** Liste fixe, indépendante de l'EDT, pour les objets qu'on oublie dans la précipitation du départ. Réalise UJ-2.

#### FR-6 : Checklist matin fixe et personnalisable

Le système propose une checklist fixe (ex. clés, goûter, carnet de correspondance, chargeur) que l'enfant ou le parent peut personnaliser (ajouter/retirer des éléments).

**Conséquences (testables) :**
- La checklist matin ne dépend pas de l'EDT — elle est identique tous les jours scolaires, sauf modification manuelle de la liste elle-même.

#### FR-7 : Réinitialisation quotidienne

La checklist matin se décoche automatiquement chaque nouveau jour scolaire.

### 4.5 Checklist Retour

**Description :** Liste fixe pour les actions à faire en rentrant. Réalise UJ-3.

#### FR-8 : Checklist retour fixe et personnalisable

Le système propose une checklist fixe (ex. sortir le carnet/mot des parents, ranger le sac, devoirs faits) personnalisable par l'enfant ou le parent.

#### FR-9 : Réinitialisation quotidienne

La checklist retour se décoche automatiquement chaque nouveau jour scolaire.

### 4.6 Notifications & Rappels

**Description :** Rappelle à l'enfant les trois moments clés, avec un mécanisme de repli pour les plateformes où la notification système n'est pas garantie (voir addendum du brief pour la contrainte iOS/Android).

#### FR-10 : Notifications programmées

Le système envoie un rappel à des heures configurables pour chacun des trois moments (soir, matin, retour).

**Conséquences (testables) :**
- Sur Android, la notification push standard se déclenche à l'heure configurée.
- Sur iOS, la notification ne se déclenche que si l'app est installée sur l'écran d'accueil et l'OS ≥ 16.4 ; dans les autres cas, aucune notification système n'est envoyée.

#### FR-11 : Repli visuel in-app

Si une checklist du jour n'est pas encore complétée, un signal visuel (bannière, badge) l'indique à l'ouverture de l'app, indépendamment de la notification système.

**Conséquences (testables) :**
- Ce signal est visible même sur un appareil où la notification système n'a pas pu se déclencher.

#### FR-12 : Onboarding notification iOS

Lors de la première utilisation sur iOS, l'app guide explicitement vers l'ajout à l'écran d'accueil, en expliquant que c'est nécessaire pour recevoir les rappels.

**Hors périmètre :**
- Pas de canal de notification alternatif (SMS, email) en v1.

### 4.7 Motivation (Streaks & Badges)

**Description :** Renforcement positif léger pour donner à l'enfant une raison de revenir seul, sans transformer l'outil en jeu à part entière.

#### FR-13 : Calcul du Streak

Le système compte le nombre de jours scolaires consécutifs où les trois moments du jour (soir, matin, retour) ont été entièrement traités.

**Conséquences (testables) :**
- Un jour scolaire sans les trois moments complets interrompt le streak. Le moment "soir" suit la définition de complétude de FR-20 (ses trois blocs : Sac, Devoirs du lendemain, Révisions).
- Un jour "sans cours" (§4.1) n'interrompt pas le streak — il est neutre (ni compté, ni cassé).

#### FR-14 : Badges de palier

Le système débloque un badge visuel lorsque le streak atteint certains paliers.

**Conséquences (testables) :**
- Au moins un palier "précoce" (atteignable en quelques jours) pour créer un premier succès rapide. `[ASSUMPTION: paliers exacts (ex. 3 / 7 / 30 jours) non tranchés — à ajuster après observation de l'usage réel plutôt qu'à figer maintenant.]`

#### FR-15 : Écran de progression

L'enfant peut consulter son streak actuel et son meilleur streak sur un écran dédié.

**Notes :** Pas de classement ni de comparaison avec d'autres enfants en v1 (mono-utilisateur) — `[NON-GOAL for MVP]`.

## Esthétique et ton

- **Ton :** positif et encourageant, jamais culpabilisant. Un streak cassé ou une checklist incomplète se présente comme un simple constat neutre, jamais comme un échec ou une notification de "faute".
- **Vocabulaire :** simple, direct, à hauteur d'un enfant de 11 ans — pas de jargon de productivité ("tâches", "workflow") emprunté à un outil pour adultes.
- **Références :** `[ASSUMPTION: à affiner en UX]` esthétique colorée, une icône ou petit pictogramme distinct par matière plutôt qu'une mascotte unique, animations courtes de validation (ex. léger effet de confettis) sans excès.
- **Anti-références :** éviter le style "app de productivité professionnelle" (froid, tableau de bord dense) et éviter un style trop enfantin qui pourrait ne pas convenir à un pré-ado qui commence à vouloir "faire grand".

## Plateforme

- V1 : PWA installable, responsive mobile et tablette, ciblant à la fois iOS et Android sans plateforme privilégiée (voir FR-10 à FR-12 pour la contrainte notifications).
- Pas d'application native (App Store / Play Store) en v1.
- Les données (EDT, checklists, streak) sont persistées côté serveur (cf. addendum brief : Prisma + SQLite ou Supabase) et non uniquement en local — ce qui permet nativement un usage depuis plusieurs appareils (téléphone et tablette) sans développement supplémentaire, même si le besoin réel de multi-appareils pour un seul enfant reste à confirmer (§8 Open Questions).
- Fonctionnement offline pour consulter et cocher les checklists déjà chargées ; synchronisation à la reconnexion.

## Exigences non-fonctionnelles transverses

- **Confidentialité :** données concernant un mineur, usage strictement familial — aucun partage à des tiers, aucune fonctionnalité sociale ou publique.
- **Fiabilité :** la checklist du soir générée doit toujours refléter fidèlement l'EDT réellement saisi ; une désynchronisation entre les deux invaliderait la proposition de valeur centrale du produit.
- **Performance :** chargement rapide sur mobile d'entrée/milieu de gamme, l'app étant consultée dans des moments courts (avant de dormir, en sortant).
- **Accessibilité :** contrastes et tailles de police adaptés à une lecture rapide par un enfant, sans viser une certification d'accessibilité formelle (non pertinent à cette échelle).

## Contraintes et garde-fous

- **Coût :** l'infrastructure doit rester dans les paliers gratuits (Vercel, Supabase) — pas de budget d'hébergement prévu pour ce projet personnel.
- **Confidentialité :** pas de compte tiers ni d'identifiant externe requis pour l'usage de base (EDT et checklists) — seule l'intégration Pronote future (hors v1) introduira des identifiants sensibles, à traiter séparément (voir addendum brief).

## 5. Non-Goals explicites (v1)

- Pas d'intégration Pronote (devoirs, notes, infos établissement) — reportée en phase 2, voir addendum brief pour la piste technique.
- Pas de vue parent fonctionnelle — seul le modèle de données la prévoit.
- Pas de multi-enfants / multi-profils.
- Pas de calendrier scolaire officiel automatisé (jours fériés/vacances) — marquage manuel des jours "sans cours" en v1.
- Pas de classement, comparaison sociale, ou fonctionnalité multi-utilisateurs autour de la motivation.
- Pas d'application native App Store/Play Store.
- Pas de pièce jointe, photo ou texte enrichi sur un devoir — description courte en texte brut uniquement en v1.
- Pas de vue "tous mes devoirs de la semaine" triée par échéance — la liste de devoirs reste une liste plate d'éléments à faire, sans planification long terme.

## 6. Périmètre MVP

### 6.1 Dans le périmètre

- EDT : saisie manuelle, vue Aujourd'hui/Demain + vue semaine (FR-1, FR-2).
- Checklist sac du soir auto-générée et personnalisable (FR-3 à FR-5).
- Devoirs et révision du jour (FR-16 à FR-20).
- Checklist matin fixe et personnalisable (FR-6, FR-7).
- Checklist retour fixe et personnalisable (FR-8, FR-9).
- Notifications multi-plateformes avec repli visuel (FR-10 à FR-12).
- Streak et badges (FR-13 à FR-15).

### 6.2 Hors périmètre MVP

- Intégration Pronote — dépendance externe non maîtrisée (lib communautaire non officielle), volontairement isolée après validation du cœur produit.
- Vue parent complète.
- Multi-enfants.
- Calendrier scolaire automatisé.
- Planification/priorisation avancée des devoirs (rappels indépendants, tri par échéance, vue calendrier).

## 7. Critères de succès

**Primaire**
- **SM-1** : L'enfant complète au moins deux des trois checklists quotidiennes sans rappel parental, la majorité des jours scolaires sur un mois d'usage. Valide FR-3, FR-5, FR-6, FR-8.

**Secondaire**
- **SM-2** : Un streak d'au moins 5 jours consécutifs est atteint au moins une fois dans le premier mois. Valide FR-13, FR-14.

**Contre-métrique (à ne pas optimiser)**
- **SM-C1** : Le temps passé dans l'app par session ne doit pas devenir un objectif en soi — l'outil sert à cocher rapidement, pas à retenir l'attention. Contrebalance SM-2 : un streak motivant ne doit pas se transformer en incitation à prolonger l'usage.

## 8. Questions ouvertes

1. L'établissement fonctionne-t-il en alternance de semaines (A/B) pour certains cours/options, ou l'EDT est-il strictement identique chaque semaine ? Impacte directement FR-1 et le modèle de données EDT.
2. Comment gérer les jours fériés/vacances dans la génération automatique — saisie manuelle simple (v1) ou calendrier scolaire importé plus tard ?
3. Quels paliers de streak/badges seront réellement motivants pour cet enfant précis ? À observer et ajuster après les premières semaines d'usage réel plutôt qu'à figer avant.
4. L'enfant utilisera-t-il un seul appareil ou plusieurs (téléphone et tablette) en usage courant ? Ne bloque pas le MVP (le stack choisi supporte déjà le multi-appareil) mais influence les priorités de test.
5. Qui saisit l'EDT initial et les objets par défaut par matière — le parent seul, ou avec l'enfant ? Pertinent pour l'UX d'onboarding.
6. La saisie manuelle des devoirs demande plus d'effort qu'une simple coche — reste à observer si l'enfant l'alimente réellement au quotidien plutôt que de l'oublier. Si l'usage réel montre un abandon, envisager une saisie encore plus rapide (ex. matière + case "à rendre" sans description obligatoire).
7. Un devoir "à rendre" sans échéance renseignée ne peut pas être relié à la checklist sac (FR-18). Faut-il rendre l'échéance obligatoire dès que "à rendre" est coché, au risque d'ajouter de la friction à la saisie ?

## 9. Index des hypothèses

- §2.3 — "Léo" est un prénom d'illustration, à remplacer ou neutraliser.
- §4.1 (FR-1) — Pas d'alternance de semaines A/B supposée ; à confirmer.
- §4.1 (FR-2) — Le calendrier "jour sans cours" est un marquage manuel simple en v1, pas un import de calendrier scolaire officiel.
- §4.3 (FR-20) — Pour le calcul du streak du soir, seuls les devoirs à rendre échéant le lendemain comptent dans la complétude du bloc Devoirs ; les devoirs sans échéance ou plus lointains n'y participent pas. À confirmer.
- §4.7 (FR-14) — Paliers de streak/badges non tranchés, à ajuster après usage réel.
- Esthétique et ton — références visuelles concrètes non tranchées, à affiner lors de l'UX.
