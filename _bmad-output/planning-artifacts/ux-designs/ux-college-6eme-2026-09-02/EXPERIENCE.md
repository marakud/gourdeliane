---
name: CartableFlow
status: final
sources:
  - ../../prds/prd-college-6eme-2026-09-02/prd.md
  - ../../briefs/brief-college-6eme-2026-09-02/brief.md
  - ../../briefs/brief-college-6eme-2026-09-02/addendum.md
updated: 2026-09-02
---

# CartableFlow — Experience Spine

## Foundation

PWA responsive mobile et tablette, iOS + Android sans plateforme privilégiée (voir addendum brief pour la contrainte notifications). `[ASSUMPTION]` Système d'UI de base : **shadcn/ui** sur Tailwind — cohérent avec la stack Next.js déjà retenue, hautement personnalisable donc ne contraint pas l'identité visuelle définie dans `DESIGN.md`. À confirmer ou remplacer par un système de composants maison si préféré. `DESIGN.md` est la référence d'identité visuelle ; cette spine décrit le comportement.

Utilisateur unique en v1 (l'enfant) — pas de gestion de comptes multiples, pas d'écran de connexion. Une unique ligne `User` est créée automatiquement (seed) au premier déploiement ; aucune authentification visible n'est nécessaire (décidé lors du sprint planning, résout l'assumption précédente).

## Information Architecture

| Écran | Atteint depuis | Rôle |
|---|---|---|
| Accueil | Ouverture de l'app | Moment actif du jour (soir / matin / retour) + sa checklist. Le moment "soir" affiche 3 blocs (Sac / Devoirs / Révisions) au lieu d'une liste unique. Écran par défaut, réalise UJ-1/UJ-2/UJ-3. |
| Emploi du temps | Barre de navigation | Vue semaine complète + saisie/édition des créneaux (FR-1). |
| Progression | Barre de navigation | Streak actuel, meilleur streak, badges débloqués (FR-15). |
| Ajout rapide de devoir (modal) | Bouton flottant (FAB) persistant sur Accueil et Emploi du temps | Saisie rapide d'un devoir — matière + description, "à rendre" et échéance optionnels (FR-16). Réalise UJ-4. Accessible à tout moment de la journée, pas seulement depuis le bloc Devoirs du soir. |
| Réglages | Icône dédiée depuis Accueil ou Emploi du temps | Personnalisation des objets par matière et des checklists fixes (FR-4, FR-6, FR-8), réglage des heures de notification. |
| Onboarding (première ouverture) | Premier lancement | Saisie initiale de l'EDT, invitation à ajouter à l'écran d'accueil sur iOS (FR-12). |

Navigation par barre du bas (3 icônes : Accueil, Emploi du temps, Progression), cohérent avec un usage rapide et répété plusieurs fois par jour. Réglages n'apparaît pas dans la barre principale — accès secondaire, l'enfant n'y va pas quotidiennement. Pas de menu à tiroir, pas de niveau de navigation supplémentaire.

→ Référence visuelle : [`mockups/key-screens.html`](mockups/key-screens.html) (écrans Accueil et Progression, mode clair). Les spines gagnent en cas de conflit.

## Voice and Tone

Ton et voix de marque définis dans `DESIGN.md.Brand & Style` ; ce tableau couvre les microcopies concrètes.

| Do | Don't |
|---|---|
| "Sac prêt pour demain !" | "Tâche terminée avec succès" |
| "Il te reste 2 choses à vérifier." | "Attention, tu as oublié 2 éléments." |
| "Rien à préparer ce soir — pas cours demain." | (liste vide sans explication, qui ressemble à un bug) |
| "3 jours d'affilée, bravo !" | "Streak: 3" (jargon d'app de productivité) |
| "Rien à faire ce soir, bravo !" | (bloc Devoirs simplement absent, sans confirmation positive) |
| Phrases courtes, tutoiement, présent | Formulations passives, vocabulaire administratif ("veuillez", "requis") |

## Component Patterns

Comportemental — les specs visuelles vivent dans `DESIGN.md.Components`.

| Composant | Usage | Règles comportementales |
|---|---|---|
| Checklist item | Accueil (blocs Sac, Matin, Retour, Révisions) | Tap unique pour cocher/décocher. Pas de confirmation, pas de swipe. Animation de coche immédiate (< 300ms). |
| Devoir row | Accueil (bloc Devoirs) | Tap pour marquer fait. Contrairement aux checklist items, ne se réinitialise pas le lendemain — reste affiché jusqu'à être coché fait, potentiellement sur plusieurs jours. |
| FAB Ajouter un devoir | Accueil, Emploi du temps | Tap ouvre le modal de saisie rapide (matière + description ; "à rendre" et échéance optionnels). Fermeture auto après validation, pas d'écran de confirmation séparé (FR-16). |
| Moment card | Accueil | Affiche automatiquement le moment pertinent selon l'heure (voir State Patterns) ; un sélecteur manuel permet de changer de moment si besoin (ex. cocher la checklist du matin en retard). Le moment "soir" contient 3 sous-blocs indépendants (Sac / Devoirs / Révisions) plutôt qu'une liste plate. |
| Streak badge | Accueil (permanent) | Incrémente une fois par jour scolaire, au moment où les 3 moments du jour sont tous complets — le moment "soir" comptant complet seulement quand ses 3 blocs le sont (FR-20). Pas en temps réel à chaque coche individuelle. |
| Badge tile | Progression | Tap sur un badge non débloqué affiche la condition pour l'obtenir (pas de mystère frustrant). |
| Subject tag | Emploi du temps + Checklist du soir + Devoir row | Assigné automatiquement à la création d'une matière ; non modifiable manuellement en v1 pour éviter un écran de configuration supplémentaire. |

## State Patterns

| État | Écran | Traitement |
|---|---|---|
| Jour sans cours (férié/vacances) | Accueil (bloc Sac) | Pas de liste vide : message neutre "Pas cours demain, profite de ta soirée." Pas de streak cassé ce jour-là (PRD FR-13). |
| Jour sans cours le jour même | Accueil (bloc Révisions) | Bloc Révisions absent plutôt que vide (rien à revoir puisqu'il n'y a pas eu cours) — pas de message qui ressemble à un oubli. |
| Bloc Devoirs vide | Accueil (bloc Devoirs) | Message positif "Rien à faire ce soir, bravo !" plutôt qu'une absence de bloc — contrairement au Sac/Révisions, l'absence de devoir est un vrai motif de satisfaction à signaler. |
| Devoir dont l'échéance est dépassée, pas encore fait | Accueil (bloc Devoirs) | Reste affiché normalement, sans couleur d'alerte ni pénalité visuelle — cohérent avec le ton non-culpabilisant (DESIGN.md). `[NOTE FOR UX]` à observer : un simple ordre d'affichage (plus ancien en premier) peut suffire à signaler l'urgence sans couleur. |
| Toutes checklists/blocs du jour complets | Accueil | Célébration courte (confettis/pop, < 1,5s), incrément du streak visible, retour à l'état normal ensuite — pas d'écran de célébration qui bloque la suite. |
| Checklist ou bloc en cours, partiellement coché | Accueil | Compteur "x/y" visible par bloc sur la moment card, pas d'alerte ni de couleur d'urgence. |
| Notification système indisponible (iOS sans ajout à l'écran d'accueil) | Accueil | Repli visuel : bandeau discret rappelant la checklist en attente à l'ouverture de l'app (addendum brief). |
| Première ouverture | Onboarding | Saisie guidée de l'EDT de la semaine, puis invitation explicite à ajouter à l'écran d'accueil (iOS) en expliquant pourquoi (FR-12). |
| Hors ligne | Toutes | Checklists déjà chargées restent consultables et cochables ; synchronisation automatique au retour de connexion, sans bandeau d'erreur intrusif. |

## Interaction Primitives

- Tap pour cocher/décocher (checklists) ou marquer fait (devoirs) — pas de swipe, pas de long-press requis pour l'usage quotidien.
- Tap sur le FAB "+" ouvre le modal d'ajout rapide de devoir ; validation en un tap, pas de flux multi-écrans.
- Long-press réservé à l'édition d'un objet de checklist personnalisable (Réglages), pour ne pas exposer cette action sur l'écran principal.
- Pas de pull-to-refresh : la synchronisation est automatique en arrière-plan.
- **Banni :** notifications de réengagement type "tu nous manques", classement ou comparaison sociale, publicité ou contenu tiers, tout mécanisme qui pénalise visuellement (couleur rouge, icône d'échec) une checklist incomplète.

## Accessibility Floor

Comportemental — le contraste visuel vit dans `DESIGN.md`.

- Zones de tap ≥ 44×44px (iOS) / 48×48dp (Android), cohérent avec `DESIGN.md` (`spacing.screen-margin` généreux).
- État coché/non coché jamais indiqué par la couleur seule — toujours accompagné d'une icône (case vide vs. case cochée avec check).
- `prefers-reduced-motion` respecté : animations de célébration réduites à un simple changement d'état statique si l'utilisateur (ou l'appareil) a activé la réduction de mouvement.
- Taille de texte minimale 16px pour le corps, respect du zoom navigateur/OS sans casser la mise en page.

## Inspiration & Anti-patterns

- **Repris de Duolingo :** le renforcement positif immédiat et la mécanique de streak simple, sans complexité de "vies" ou de monnaie virtuelle.
- **Repris des apps de check-in minimalistes (type Habit-tracker épurés) :** l'écran d'accueil contextuel qui montre "ce qu'il y a à faire maintenant" plutôt qu'une liste plate de toutes les tâches possibles.
- **Rejeté — mascotte omniprésente (type apps préscolaires) :** pas de personnage animé permanent ; les micro-animations de célébration suffisent, une mascotte risquerait de paraître trop enfantine pour un enfant qui vient d'entrer au collège.
- **Rejeté — classement / comparaison sociale (type apps de fitness gamifiées) :** hors sujet pour un usage mono-enfant, et contraire au ton non-compétitif voulu par le PRD.
- **Rejeté — pénalité visuelle sur streak cassé :** pas d'écran "tu as perdu ta série" — un streak cassé se traduit simplement par un compteur qui repart à zéro, sans message négatif.

## Key Flows

### Flow 1 — Traiter sa soirée scolaire (Léo, 21h, avant de se coucher) — réalise UJ-1

1. Léo ouvre l'app (ou tape sur la notification du soir).
2. L'Accueil affiche automatiquement la moment card "Ce soir" avec ses 3 blocs : Sac (déduit des matières du lendemain, subject tags visibles), Devoirs à faire (ceux qu'il a notés dans la journée, voir Flow 4), Révisions du jour (matières suivies aujourd'hui).
3. Il traite les blocs dans l'ordre qu'il veut : coche les objets du sac, coche ou complète ses devoirs, coche les matières révisées.
4. **Climax :** dernier élément des 3 blocs coché → animation de validation courte, la moment card affiche "Soirée prête !".
5. Comme c'est la dernière checklist du jour restante, le streak s'incrémente avec sa propre animation, juste après.

Cas limite : demain est un jour sans cours → le bloc Sac affiche directement le message neutre, aucun objet à cocher, mais Devoirs et Révisions (basés sur aujourd'hui) restent actifs normalement.

### Flow 4 — Noter un devoir en sortant de cours (Léo, entre midi et deux, au collège) — réalise UJ-4

1. Léo a cours de maths qui vient de se terminer ; le professeur a donné un exercice à rendre demain.
2. Il ouvre l'app (pas besoin d'être à l'écran Accueil) et tape le bouton flottant "+".
3. Le modal de saisie rapide s'ouvre : il choisit "Maths" (matière existante de son EDT), tape "Exercices p.24" en description, coche "à rendre", laisse l'échéance par défaut sur demain.
4. **Climax :** il valide → le modal se ferme immédiatement, pas d'écran de confirmation séparé qui ralentirait la suite de sa journée.
5. Le devoir est maintenant dans son bloc Devoirs pour ce soir, et comme il est "à rendre" avec échéance demain, l'objet correspondant (ex. "Feuille d'exercices de maths à rendre") apparaîtra aussi dans son bloc Sac ce soir.

Cas limite : il ne renseigne que la matière et la description, sans cocher "à rendre" ni échéance → le devoir reste une simple tâche du bloc Devoirs, sans effet sur le bloc Sac.

### Flow 2 — Vérifier avant de partir (Léo, 7h40, dans la précipitation) — réalise UJ-2

1. Notification du matin ou ouverture manuelle.
2. Accueil bascule automatiquement sur la moment card "Ce matin" (liste fixe : clés, goûter, carnet, chargeur…).
3. Il coche au fur et à mesure.
4. **Climax :** liste complète → confirmation visuelle brève, pas de blocage (il doit pouvoir partir tout de suite après).

Cas limite : il coche en retard, déjà arrivé à l'école → aucune pénalité, la coche compte normalement pour le streak du jour.

### Flow 3 — Traiter le retour (Léo, 17h, en rentrant) — réalise UJ-3

1. Ouverture de l'app en rentrant.
2. Moment card "Retour" (sortir le carnet/mot, ranger le sac, devoirs faits).
3. Il coche chaque action.
4. **Climax :** si c'est la 3ᵉ et dernière checklist du jour complétée, célébration + incrément du streak visible sur l'écran Accueil.

Cas limite : notification non reçue (iOS sans ajout à l'écran d'accueil) → à l'ouverture de l'app, le bandeau de repli visuel signale la checklist du retour en attente.

## Responsive & Platform

- **Mobile (portrait, surface principale) :** une colonne, barre de navigation basse, moment card pleine largeur.
- **Tablette :** l'écran Emploi du temps peut passer en grille semaine complète ; les checklists (contenu court) restent en une colonne centrée plutôt que d'étirer artificiellement la mise en page.
- **iOS spécifique :** écran d'onboarding dédié expliquant l'ajout à l'écran d'accueil comme condition pour recevoir les rappels (voir addendum brief) ; sans cet ajout, l'app reste pleinement utilisable, seul le repli visuel remplace la notification système.
- **Android :** aucune étape supplémentaire requise pour les notifications.
