---
title: 'Story 1.1 — Initialisation du projet et premier déploiement'
type: 'feature'
created: '2026-09-02'
status: 'in-progress'
review_loop_iteration: 0
context: []
baseline_commit: 'NO_VCS'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le dossier de projet est vide — aucune base technique n'existe pour construire les fonctionnalités des epics suivants.

**Approach:** Scaffolder un projet Next.js 16 (App Router + TypeScript + Tailwind 4.3 + shadcn/ui) respectant l'architecture en couches (`app/` → `actions/` → `domain/`/`data/`), poser le schéma Prisma initial (modèle `User` seul, seedé automatiquement), et le déployer sur Vercel avec Supabase Postgres pour prouver que le pipeline complet fonctionne de bout en bout.

## Boundaries & Constraints

**Always:**
- Respecter la structure de dossiers du Structural Seed : `app/(accueil)/`, `app/edt/`, `app/progression/`, `app/reglages/`, `app/api/cron/[moment]/` (dossier vide/placeholder, pas de logique cron en 1.1), `actions/`, `domain/`, `data/`, `prisma/schema.prisma`.
- `domain/` ne doit avoir aucune dépendance vers Next.js ou Prisma (AD-1).
- Déclarer les tokens de couleur en variables Tailwind/CSS : primary `#7C5CFF`, accent `#FFB020`, success `#2ECC71`, neutral-pending `#94A3B8`, surface-base `#FBFAFF` (+ variantes `-dark` pour un futur mode sombre) et la palette subject-1 à subject-8.
- Charger Baloo 2 (display/heading) et Nunito (body/meta) via `next/font`.
- Le schéma Prisma initial contient uniquement `User` (id suffit, pas de champ auth). Provider SQLite en dev local, Postgres (Supabase) en prod.
- Au premier `migrate`/déploiement, une unique ligne `User` doit être créée automatiquement (seed) si aucune n'existe — pas d'écran de connexion.
- Navigation basse à 3 onglets (Accueil, Emploi du temps, Progression) comme coquille vide fonctionnelle (routes qui rendent un placeholder), Réglages accessible mais hors barre principale.
- Respecter le plancher d'accessibilité dès les premiers composants : zones de tap ≥44px, texte ≥16px, `prefers-reduced-motion` pris en compte si une animation est ajoutée à ce stade.
- Déployer sur Vercel (Hobby) avec la variable d'environnement de connexion Supabase Postgres ; la page d'accueil affiche "CartableFlow" en production.

**Ask First:** Choix du nom exact du repo Git distant / de l'organisation Vercel si non déjà déterminé.

**Never:** Ajouter les modèles Prisma des epics suivants (`Subject`, `ScheduleSlot`, etc.) — ils arrivent avec Story 1.2. Ne pas implémenter les Vercel Cron Jobs (Epic 3) ni Serwist/service worker complet (juste la dépendance peut être posée, pas la config PWA fonctionnelle). Ne pas construire de logique métier dans `domain/` à ce stade (rien à dériver encore).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Scaffold local | Dossier vide, `npx create-next-app` + config manuelle | Projet Next.js 16/TS/Tailwind 4.3/shadcn/ui fonctionnel, `npm run dev` sert une page | N/A |
| Migration locale | `prisma migrate dev` avec schéma `User` seul | Base SQLite créée, aucune erreur | Si Prisma CLI absent/mal configuré, message d'erreur clair dans la console |
| Seed du User | Aucune ligne `User` en base | Une ligne `User` créée automatiquement (dev et prod) | Si une ligne existe déjà, ne pas en recréer une deuxième |
| Déploiement Vercel | Push du repo, Supabase Postgres connecté | Page d'accueil "CartableFlow" visible sur l'URL Vercel de prod | Si `DATABASE_URL` absente, le build/déploiement doit échouer explicitement, pas silencieusement |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- schéma initial, modèle `User` uniquement, `datasource` configurable SQLite (dev) / Postgres (prod)
- `app/layout.tsx` -- layout racine, chargement des fonts (`next/font`: Baloo 2 + Nunito), déclaration des tokens CSS/Tailwind
- `app/globals.css` (ou `app/tailwind.css`) -- variables de couleur (primary/accent/success/neutral-pending/surface-base + subject-1..8, variantes `-dark`)
- `app/(accueil)/page.tsx`, `app/edt/page.tsx`, `app/progression/page.tsx`, `app/reglages/page.tsx` -- coquilles vides (placeholder de contenu), une route par onglet
- `components/nav/bottom-nav.tsx` (ou équivalent) -- barre de navigation basse à 3 icônes (Accueil/EDT/Progression), Réglages accessible ailleurs
- `data/prisma.ts` -- client Prisma singleton (pattern standard Next.js pour éviter les connexions multiples en dev)
- `data/user.ts` -- fonction `ensureSeedUser()` : crée la ligne `User` unique si absente
- `domain/` -- dossier créé, vide ou avec un fichier `.gitkeep`/README court (rien à dériver en Story 1.1)
- `vercel.json` -- fichier posé mais vide de Cron Jobs à ce stade (réservé pour Epic 3)
- `package.json` -- dépendances : next 16, react 19.2, typescript ^5.7, tailwindcss 4.3, shadcn/ui, prisma 7.8, motion ^13.2 (pas `framer-motion`)
- `.env.example` -- `DATABASE_URL` documentée (Supabase Postgres en prod, SQLite en local)

## Tasks & Acceptance

**Execution:**
- [ ] `package.json`, config Next/Tailwind/TS -- scaffolder le projet avec `create-next-app` (App Router, TS) puis ajouter Tailwind 4.3 + shadcn/ui -- pose la base technique imposée par l'architecture
- [ ] `prisma/schema.prisma`, `data/prisma.ts`, `data/user.ts` -- créer le schéma `User` seul + client Prisma + fonction de seed automatique -- couvre les AC migration/seed
- [ ] `app/globals.css`, `app/layout.tsx` -- déclarer les tokens de couleur et charger Baloo 2/Nunito via `next/font` -- couvre UX-DR1/UX-DR2
- [ ] `app/(accueil)/page.tsx`, `app/edt/page.tsx`, `app/progression/page.tsx`, `app/reglages/page.tsx`, `components/nav/bottom-nav.tsx` -- créer les routes placeholder + la coquille de navigation à 3 onglets -- couvre UX-DR9, prépare les epics suivants
- [ ] `domain/`, `actions/` -- créer les dossiers vides respectant la séparation de couches (AD-1) -- pose la structure sans logique prématurée
- [ ] `vercel.json`, `.env.example`, déploiement Vercel + Supabase -- connecter le repo Git, configurer `DATABASE_URL`, déployer -- couvre l'AC de déploiement bout-en-bout
- [ ] Vérification manuelle responsive -- contrôler mobile (colonne unique) et tablette (layout utilisable) avec zones de tap ≥44/48px et texte ≥16px -- couvre UX-DR11/UX-DR13

**Acceptance Criteria:**
- Given un dossier de projet vide, when le scaffold est exécuté, then le projet démarre en local avec Next.js 16/TS/Tailwind 4.3/shadcn/ui et les tokens de design déclarés
- Given le schéma Prisma initial, when `prisma migrate dev` est exécuté, then la base SQLite locale se crée sans erreur avec uniquement `User`
- Given le projet poussé sur Git et déployé sur Vercel avec Supabase connecté, when on ouvre l'URL Vercel, then la page d'accueil "CartableFlow" s'affiche en production
- Given aucune ligne `User`, when la première migration/déploiement s'exécute, then une unique ligne `User` est créée automatiquement, sans écran de connexion
- Given la structure de navigation à 3 onglets, when le scaffold est en place, then la barre basse existe comme coquille vide fonctionnelle, utilisable sur mobile et tablette

## Spec Change Log

## Verification

**Commands:**
- `npm run dev` -- expected: serveur démarre sans erreur, page Accueil accessible
- `npx prisma migrate dev` -- expected: migration appliquée sans erreur, table `User` créée
- `npm run build` -- expected: build de production réussit (précondition au déploiement Vercel)

**Manual checks (if no CLI):**
- Ouvrir l'URL Vercel de production : la page affiche "CartableFlow", pas d'erreur 500
- Vérifier en base (Supabase) qu'une ligne `User` existe après le premier déploiement
- Redimensionner la fenêtre (mobile/tablette) : la barre de navigation et les placeholders restent utilisables, tap ≥44px
