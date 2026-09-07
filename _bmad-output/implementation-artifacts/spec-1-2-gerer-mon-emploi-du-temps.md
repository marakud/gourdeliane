---
title: 'Story 1.2 — Gérer mon emploi du temps'
type: 'feature'
created: '2026-09-06'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '2cda4923163e9727e236d66178aec901d376554c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'écran Emploi du temps (`app/edt/page.tsx`) n'est qu'une coquille vide (Story 1.1) — rien ne permet encore de saisir les créneaux hebdomadaires ni de marquer un jour "sans cours", alors que tout le reste de l'app (sac, révisions) dépendra de cet EDT.

**Approach:** Ajouter les modèles `Subject`/`ScheduleSlot`/`NoSchoolDay` au schéma Prisma (dev + prod), une couche `domain/` pure pour l'assignation de couleur et la validation d'un créneau, des Server Actions CRUD, et remplacer la coquille `app/edt/page.tsx` par une vraie vue semaine avec ajout/édition/suppression de créneaux et marquage "sans cours".

## Boundaries & Constraints

**Always:**
- Un créneau (`ScheduleSlot`) appartient à exactement un jour de semaine (`Weekday`, enum lundi-dimanche) et une `Subject` ; il est réutilisé identiquement chaque semaine (pas de dates, pas d'alternance A/B — PRD confirmé).
- Créer un créneau sur une matière inconnue crée la `Subject` à la volée avec un `colorIndex` assigné une fois pour toutes, jamais recalculé même si d'autres matières sont supprimées ensuite (AD-6, palette subject-1 à subject-8 de DESIGN.md, cyclique au-delà de 8).
- "Sans cours" se marque par date précise (ex. demain), indépendamment des créneaux hebdomadaires récurrents — mémorisé dans un modèle dédié (`NoSchoolDay`), consultable, jamais dérivé des créneaux.
- Toute mutation passe par une Server Action dans `actions/` retournant `{ ok: true, data } | { ok: false, error }` (AD-1) ; toute règle de validation (ex. heure de fin après heure de début) vit dans `domain/`, pure, sans dépendance Next.js/Prisma.
- Toute entité créée est scopée par `userId` (l'utilisateur unique créé en Story 1.1).
- Respecter le plancher d'accessibilité déjà en place (tap ≥44px, texte ≥16px, jamais la seule couleur pour un état).
- Les migrations dev (SQLite, `prisma/migrations/`) et prod (Postgres, `prisma/production/migrations/`) évoluent toutes les deux, chacune dans son propre dossier (leçon de la Story 1.1 -- ne jamais les partager), générées sans connexion à une base réelle.

**Ask First:** Aucune.

**Never:** Alternance de semaines A/B (Deferred par l'architecture). Import d'un calendrier scolaire officiel pour "sans cours" (marquage manuel uniquement, PRD confirmé). Modifier manuellement l'index de couleur d'une matière existante. Implémenter la vue "Aujourd'hui/Demain" (FR-2, Story 1.3).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Créneau sur nouvelle matière | Jour+horaires+nom de matière inédit | `Subject` créée avec le prochain `colorIndex` libre, `ScheduleSlot` créé | N/A |
| Créneau sur matière existante | Jour+horaires+nom de matière déjà utilisée | `ScheduleSlot` créé, aucune nouvelle `Subject`, `colorIndex` inchangé | N/A |
| Suppression d'une matière avec créneaux | Matière ayant des `ScheduleSlot` | Suppression bloquée ou créneaux supprimés en cascade (à trancher en implémentation, documenté dans le Code Map) | Message clair si bloqué |
| Heure de fin ≤ heure de début | Formulaire de créneau | Rejeté par la Server Action, message d'erreur explicite | `{ ok: false, error }` |
| Marquer une date déjà "sans cours" | Date existant déjà en `NoSchoolDay` | Idempotent, pas de doublon | N/A |
| Démarquer un jour "sans cours" | Date marquée "sans cours" | Le marquage est supprimable indépendamment des créneaux | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` + nouvelle migration -- ajouter `Weekday` enum, `Subject`, `ScheduleSlot`, `NoSchoolDay` (SQLite dev)
- `prisma/production/schema.prisma` + nouvelle migration dans `prisma/production/migrations/` -- même évolution, provider Postgres (générée offline via `prisma migrate diff`, cf. Story 1.1)
- `domain/schedule.ts` -- `assignNextColorIndex(existingSubjects)` pure (AD-6), `validateSlot(input)` pure (heure fin > heure début)
- `data/schedule.ts` -- requêtes Prisma : lister créneaux + matières + jours sans cours d'un user, créer/maj/supprimer
- `actions/schedule.ts` -- Server Actions : `createSlot`, `updateSlot`, `deleteSlot`, `setNoSchoolDay`, `unsetNoSchoolDay`
- `app/edt/page.tsx` -- remplace la coquille (qui référence à tort "Epic 2" -- EDT est Epic 1) par la vue semaine réelle : liste des créneaux par jour avec pastille de matière, formulaire/modal d'ajout-édition, action de marquage "sans cours"
- `components.json`/`components/ui/` -- ajouter les primitives shadcn nécessaires (ex. dialog, select, input, label) via `npx shadcn add`, absentes du scaffold Story 1.1 (seul `button.tsx` existe)
- `components/schedule/` (nouveau dossier probable) -- composants dédiés : ligne de créneau, pastille de matière (subject-tag, disque coloré réutilisant `--subject-{colorIndex}`), formulaire de créneau

**Décision d'implémentation (I/O matrix, "Suppression d'une matière avec créneaux") :** suppression en cascade -- `ScheduleSlot.subject` porte `onDelete: Cascade`. Story 1.2 n'expose aucune UI de suppression directe de `Subject` (seule la création à la volée depuis le formulaire de créneau existe) ; le choix garde l'intégrité référentielle simple pour le jour où Réglages (epics suivants) exposera une telle suppression. Vérifié directement contre `dev.db` (suppression d'une `Subject` ayant deux `ScheduleSlot` → les deux lignes disparaissent).

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma`, `prisma/migrations/` -- ajouter `Weekday`, `Subject`, `ScheduleSlot`, `NoSchoolDay`, migrer en dev -- pose le modèle de données de la story
- [x] `prisma/production/schema.prisma`, `prisma/production/migrations/` -- même évolution côté Postgres, migration générée offline -- garde le pipeline de déploiement fonctionnel
- [x] `domain/schedule.ts` -- assignation de couleur (AD-6) + validation de créneau, avec tests unitaires -- couvre la matrice I/O
- [x] `data/schedule.ts`, `actions/schedule.ts` -- CRUD créneaux + marquage sans-cours en Server Actions -- couvre AD-1
- [x] `app/edt/page.tsx`, `components/schedule/*` -- vue semaine réelle avec pastilles de matière, ajout/édition/suppression de créneau, marquage sans-cours -- couvre FR-1, UX-DR7
- [x] Vérification manuelle responsive -- mobile (colonne unique) et tablette (grille semaine complète, UX-DR13)

**Acceptance Criteria:**
- Given aucun créneau saisi, when j'ajoute un créneau (jour, heure début/fin, matière), then le créneau est enregistré et une nouvelle `Subject` est créée si besoin, avec un index de couleur assigné une fois pour toutes (AD-6)
- Given un créneau existant, when je le modifie ou le supprime, then le changement est reflété immédiatement sans affecter l'index de couleur des autres matières
- Given une date comme demain, when je la marque "sans cours", then ce marquage est mémorisé et consultable indépendamment des créneaux hebdomadaires (FR-1)

## Spec Change Log

## Design Notes

`NoSchoolDay` n'est pas nommé explicitement dans le Structural Seed de l'architecture (qui liste les entités connues au moment de l'écriture, avant le découpage en stories) mais FR-1 exige explicitement ce marquage mémorisable et consultable ; le modèle suit les conventions déjà en place (nom anglais, scopé `userId`, clé unique `(userId, date)`).

Horaires de créneau : stockés en `String` `"HH:mm"` (tri lexicographique correct dans ce format), pas de type `DateTime` -- pas de notion de date pour un créneau récurrent hebdomadaire.

**Revue post-implémentation (blind hunter / edge-case hunter / verification-gap) :** la première implémentation utilisait des valeurs d'enum `Weekday` en français (`LUNDI`, `MARDI`, ...), contredisant son propre commentaire ("identifiants de code en anglais par convention") -- corrigé en `MONDAY`..`SUNDAY` (aucune donnée réelle n'existait encore, migrations régénérées). La correspondance de nom de matière était sensible à la casse ("Maths" ≠ "maths" créait deux `Subject`) -- corrigée en comparaison insensible à la casse côté `data/schedule.ts` (JS, pas `mode: "insensitive"` de Prisma qui n'existe que côté Postgres, pour un comportement identique dev/prod), avec un test d'intégration dédié (`data/schedule.test.ts`). Un bug de capitalisation française a aussi été corrigé (`toLocaleDateString("fr-FR", ...)` + classe Tailwind `capitalize` capitalisait chaque mot -- "Lundi 6 Septembre" -- au lieu de la seule première lettre).

**Limitation de produit connue (pas un bug de cette story) :** la palette `subject-1` à `subject-8` de DESIGN.md plafonne à 8 couleurs distinctes ; au-delà de 8 matières actives, deux matières partagent visuellement la même couleur (comportement "cyclique" explicitement voulu par DESIGN.md et repris tel quel ici). Un collégien a réalistement 10+ matières -- à surveiller en usage réel, la résolution (étendre la palette, ou un second signal visuel type initiales) est une décision de design produit, hors périmètre de cette story.

## Verification

**Commands:**
- `npx prisma migrate dev` -- expected: nouvelle migration appliquée sans erreur (SQLite)
- `npx prisma validate --schema=prisma/production/schema.prisma` -- expected: schéma Postgres valide
- `npm run build` -- expected: build de production réussit
- Tests unitaires `domain/schedule.ts` -- expected: couvrent la matrice I/O (nouvelle matière, matière existante, heure invalide, marquage idempotent)

**Manual checks (if no CLI):**
- Ajouter un créneau, vérifier la pastille de couleur et sa persistance après rechargement
- Marquer/démarquer "sans cours" sur une date, vérifier la persistance
- Redimensionner mobile/tablette : la vue semaine reste utilisable, tap ≥44px

**Résultats (session d'implémentation) :**
- `npx prisma migrate dev` -- OK, migration `20260907005043_add_schedule_models` appliquée sans erreur (SQLite).
- `npx prisma validate --schema=prisma/production/schema.prisma` -- OK, schéma valide.
- `npm run build` -- OK, build de production réussit (`/edt` prérendu statiquement ; se régénère à la demande via `revalidatePath` après chaque Server Action).
- `npx vitest run` (`domain/schedule.test.ts`) -- OK, 11/11 tests passent, couvrant les 6 lignes de la matrice I/O.
- Vérifié dans le navigateur (`npm run dev`) : ajout de créneau (nouvelle matière), édition, suppression, rejet d'un horaire invalide avec message affiché, marquage/démarquage "sans cours" avec idempotence visible, responsive mobile (375px, colonne unique) / tablette (768px, grille) / desktop (1280px, grille).
- Vérifié directement contre `dev.db` : deux créneaux sur le même nom de matière partagent la même `Subject` (pas de doublon, `colorIndex` inchangé) ; supprimer une `Subject` supprime ses `ScheduleSlot` en cascade.
- `npx vitest run` (après correctifs de revue) -- OK, 13/13 tests passent : `domain/schedule.test.ts` (11, mis à jour pour l'enum anglais) + nouveau `data/schedule.test.ts` (2, intégration contre `dev.db` : reuse insensible à la casse d'une `Subject`, idempotence de `setNoSchoolDay`) -- ajout de `vitest.config.ts` (alias `@/*` requis par Vitest/Vite, absent par défaut contrairement à tsconfig).
- Rebuild + `tsc --noEmit` + `eslint` -- OK après tous les correctifs de revue.

## Suggested Review Order

**Assignation de couleur immuable (AD-6)**

- Point d'entrée : le prochain index se calcule à partir du `colorIndex` maximum des matières existantes (pas de leur nombre) -- évite de réutiliser immédiatement le trou laissé par une matière supprimée tant qu'un index supérieur reste actif.
  [`domain/schedule.ts:54`](../../domain/schedule.ts#L54)

- Cyclique au-delà de 8 matières (palette DESIGN.md subject-1..8).
  [`domain/schedule.ts:61`](../../domain/schedule.ts#L61)

**Validation de créneau pure**

- Heure de fin > heure de début comparée en chaînes zéro-paddées "HH:mm" (tri lexicographique correct), aucune dépendance à Prisma/Next.js.
  [`domain/schedule.ts:85`](../../domain/schedule.ts#L85)

**Création à la volée d'une matière (transaction)**

- `findOrCreateSubject` s'exécute dans la même transaction que la création/modification du créneau pour éviter une course entre deux créations concurrentes de la même matière.
  [`data/schedule.ts:137`](../../data/schedule.ts#L137)

**Décision de suppression en cascade (I/O matrix)**

- `ScheduleSlot.subject` porte `onDelete: Cascade` -- décision documentée dans le Code Map ; aucune UI de suppression directe de matière n'existe encore dans cette story.
  [`prisma/schema.prisma:76`](../../prisma/schema.prisma#L76)

**Marquage "sans cours" idempotent**

- `upsert` sur la contrainte unique `(userId, date)`, date normalisée à minuit UTC avant écriture/lecture.
  [`data/schedule.ts:118`](../../data/schedule.ts#L118)

**Server Actions -- résultat typé (AD-1)**

- Chaque action revalide `/edt` après écriture (`revalidateEdt`) et ne laisse jamais remonter d'exception non gérée -- toujours `{ ok: true, data } | { ok: false, error }`.
  [`actions/schedule.ts:20`](../../actions/schedule.ts#L20)

**Vue semaine responsive (UX-DR13)**

- Grille `auto-fill` à largeur de colonne minimale plutôt qu'un nombre de colonnes figé : les 7 jours se répartissent naturellement à partir de la tablette (>=768px) sans jamais retomber sous le plancher de tap de 44px ; une seule colonne empilée en dessous.
  [`components/schedule/week-schedule.tsx:55`](../../components/schedule/week-schedule.tsx#L55)

**Pastille de matière (UX-DR7)**

- Couleur lue depuis `--subject-{1..8}` via `colorIndex`, jamais recalculée côté UI ; ramenée dans `[1,8]` pour rester valide au-delà de 8 matières.
  [`components/schedule/subject-tag.tsx:38`](../../components/schedule/subject-tag.tsx#L38)
