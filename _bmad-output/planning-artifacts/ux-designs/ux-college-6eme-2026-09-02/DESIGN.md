---
name: CartableFlow
status: final
updated: 2026-09-02
description: "[ASSUMPTION] Compagnon scolaire ludique pour un enfant de 11 ans : énergique, positif, jamais culpabilisant. Direction visuelle proposée par l'assistant, non issue de préférences explicites de l'enfant — à valider ou remplacer."
colors:
  primary: '#7C5CFF'
  primary-dark: '#9B87FF'
  accent: '#FFB020'
  accent-dark: '#FFC85C'
  success: '#2ECC71'
  success-dark: '#4ADE80'
  neutral-pending: '#94A3B8'
  neutral-pending-dark: '#7B8AA6'
  surface-base: '#FBFAFF'
  surface-base-dark: '#15132B'
  surface-raised: '#FFFFFF'
  surface-raised-dark: '#1F1C3D'
  ink-primary: '#22213B'
  ink-primary-dark: '#F1EFFB'
  ink-secondary: '#6E6C8A'
  ink-secondary-dark: '#B0ADD1'
  border-hairline: '#E7E4F5'
  border-hairline-dark: '#332F5C'
  subject-1: '#7C5CFF'
  subject-2: '#2EC4B6'
  subject-3: '#FF6B6B'
  subject-4: '#FFB020'
  subject-5: '#3D8BFF'
  subject-6: '#FF7CD4'
  subject-7: '#2ECC71'
  subject-8: '#8C6E4E'
typography:
  display:
    fontFamily: 'Baloo 2'
    fontWeight: 700
  heading:
    fontFamily: 'Baloo 2'
    fontWeight: 600
  body:
    fontFamily: 'Nunito'
    fontWeight: 400
    fontSize: 16px
  meta:
    fontFamily: 'Nunito'
    fontWeight: 500
    fontSize: 13px
rounded:
  sm: 12px
  md: 16px
  lg: 24px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  screen-margin: 20px
components:
  checklist-item:
    radius: '{rounded.md}'
    surface: '{colors.surface-raised}'
    checkbox-shape: '{rounded.full}'
    checkbox-done: '{colors.success}'
    checkbox-pending: '{colors.neutral-pending}'
    padding: '{spacing.4}'
  subject-tag:
    radius: '{rounded.full}'
    size: 32px
  streak-badge:
    radius: '{rounded.full}'
    accent: '{colors.accent}'
    font: '{typography.display}'
  moment-card:
    radius: '{rounded.lg}'
    surface: '{colors.surface-raised}'
    padding: '{spacing.5}'
---

## Brand & Style

CartableFlow est un compagnon, pas un tableau de bord. L'enfant y passe quelques dizaines de secondes à trois moments de sa journée — l'objectif visuel est qu'il ait envie de rouvrir l'app, pas qu'il s'y attarde. `[ASSUMPTION]` La direction retenue est énergique et colorée sans tomber dans le registre préscolaire : des formes très arrondies, une palette saturée mais maîtrisée (un violet de marque plutôt qu'un camaïeu d'arc-en-ciel), et des micro-animations courtes de célébration plutôt qu'un habillage permanent façon jeu vidéo.

Deux écueils explicitement évités (voir PRD, section Esthétique et ton) : le look "app de productivité pour adulte" (froid, dense, gris) et le look "appli maternelle" (mascotte omniprésente, dégradés multicolores partout). CartableFlow se situe entre les deux — plus proche d'une appli comme Duolingo dans son énergie que d'un gestionnaire de tâches ou d'un cahier d'activités.

## Colors

- **Violet (`{colors.primary}`)** est la couleur de marque — utilisée pour les actions principales, les éléments actifs (moment du jour en cours) et les accents de navigation. Elle ne sert jamais à indiquer un état (fait/pas fait).
- **Ambre (`{colors.accent}`)** est réservée aux moments de récompense : badges, streak, célébration. Ne jamais l'utiliser pour un élément neutre — elle doit rester associée à "tu as réussi quelque chose".
- **Vert (`{colors.success}`)** indique uniquement "coché / terminé" — jamais utilisé ailleurs pour ne pas diluer son sens.
- **Gris neutre (`{colors.neutral-pending}`)** indique "pas encore fait", volontairement neutre. **Aucune couleur d'alerte/erreur (rouge) n'est utilisée pour un oubli ou une checklist incomplète** — c'est un choix délibéré du PRD (ton jamais culpabilisant) : rien dans l'interface ne doit ressembler à une faute.
- **Couleurs par matière (`{colors.subject-1}` à `{colors.subject-8}`)** forment une palette catégorielle cyclique assignée automatiquement à chaque matière saisie dans l'EDT, pour un repérage visuel rapide (ex. toujours la même couleur pour "Maths"). Pas de correspondance imposée matière → couleur : l'ordre d'assignation suit l'ordre de création de la matière.
- **Surfaces et encre** (`surface-base/raised`, `ink-primary/secondary`) restent neutres pour que les couleurs de marque et d'état gardent tout leur poids par contraste.

Mode sombre : tokens `-dark` fournis pour chaque couleur ; le violet et l'ambre sont éclaircis en dark mode pour conserver leur lisibilité sur fond sombre plutôt que d'assombrir la teinte de base.

## Typography

`{typography.display}` (Baloo 2, 700) est réservé aux moments à fort impact émotionnel : le compteur de streak, un badge débloqué, le titre d'un écran de célébration. `{typography.heading}` (Baloo 2, 600) structure les titres d'écran et de section. `{typography.body}` (Nunito, 16px) porte tout le texte courant — libellés de checklist, descriptions — choisi pour rester très lisible malgré son registre rond et amical. `{typography.meta}` (Nunito, 13px, medium) sert aux horaires, dates, et libellés secondaires.

Pas de texte tout en majuscules (moins lisible pour un lecteur de 11 ans), pas de tailles décoratives en dessous de 13px.

## Layout & Spacing

Échelle en 4/8/12/16/24/32px, plus un token dédié `{spacing.screen-margin}` (20px) légèrement plus généreux que la marge mobile standard de 16px — l'app est utilisée vite et parfois dans la précipitation du matin, les zones de tap doivent rester confortables. Une seule colonne sur mobile ; sur tablette, la vue Emploi du temps (semaine) peut passer en grille sans que les checklists (usage ponctuel, contenu court) n'aient besoin d'un layout multi-colonnes.

## Elevation & Depth

Élévation légère et teintée : les cartes (`moment-card`, `checklist-item`) portent une ombre douce teintée de violet à faible opacité plutôt qu'une ombre neutre grise — cohérent avec la palette de marque, évite l'effet "app pro" d'une élévation neutre classique. L'élévation la plus marquée est réservée au badge/streak au moment de son déblocage (léger effet de scale + ombre plus prononcée pendant l'animation, décrite dans `EXPERIENCE.md`).

## Shapes

Tout est arrondi : `{rounded.sm}` (12px) pour les petits éléments (tags, boutons secondaires), `{rounded.md}` (16px) pour les lignes de checklist, `{rounded.lg}` (24px) pour les cartes principales (moment du jour, badge), `{rounded.full}` pour les cases à cocher (cercles, pas de carrés) et les pastilles de matière. Aucun angle vif dans l'interface — cohérent avec le ton "compagnon" plutôt qu'"outil".

## Components

- **Checklist item** — ligne avec pastille de matière ou icône à gauche (`subject-tag` si rattaché à une matière, sinon icône générique), libellé en `body`, case à cocher circulaire à droite. Case cochée : remplissage `{colors.success}` + icône check, avec une brève animation de rebond. Case non cochée : contour `{colors.neutral-pending}`, jamais de remplissage rouge.
- **Moment card** — carte principale de l'écran d'accueil affichant le moment actif (soir / matin / retour) avec son titre, sa checklist, et un indicateur de progression ("3/5"). Utilise `{rounded.lg}` et `{colors.surface-raised}`.
- **Streak badge** — pastille circulaire (`{rounded.full}`) affichant le nombre de jours en `{typography.display}` sur fond `{colors.accent}`, visible en permanence sur l'écran d'accueil sans être plus grande que le contenu principal (elle accompagne, elle ne domine pas l'écran).
- **Badge tile** — vignette débloquée dans l'écran Progression, grisée/silhouette tant qu'elle n'est pas obtenue plutôt qu'invisible (l'enfant voit ce qui reste à débloquer).
- **Subject tag** — petit disque coloré (`{rounded.full}`, 32px) assigné à chaque matière, réutilisé dans l'EDT et dans la checklist du soir pour un repérage visuel cohérent entre les deux écrans.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Vert uniquement pour "fait", gris neutre pour "pas encore fait" | Rouge ou toute couleur d'alerte pour un oubli ou une checklist incomplète |
| Animations de célébration courtes (< 1,5s), qui ne bloquent jamais l'usage suivant | Animations longues ou obligatoires qui ralentissent un usage répété plusieurs fois par jour |
| Couleur de matière cohérente entre EDT et checklist du soir | Réattribuer une couleur de matière d'un écran à l'autre |
| Formes arrondies partout, y compris les cases à cocher | Cases à cocher carrées façon formulaire administratif |
| Une seule couleur de marque (violet) pour la navigation/actions | Multiplier les couleurs vives non fonctionnelles ("arc-en-ciel" sans logique) |
