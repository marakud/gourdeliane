---
title: 'Story 3.2 — Voir un repli visuel si la notification n''est pas arrivée'
type: 'feature'
created: '2026-09-10'
status: 'done'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
baseline_commit: 'cc0fb25'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les rappels (Story 3.1) reposent sur une notification système qui peut ne jamais arriver (permission refusée, appareil hors ligne, iOS sans installation -- Story 3.3) -- sans repli, l'enfant n'a alors aucun signal qu'il lui reste quelque chose à faire pour le moment en cours.

**Approach:** À l'ouverture de l'Accueil, une bannière discrète (jamais alarmante) s'affiche au-dessus des onglets Matin/Retour/Soir si la checklist du **moment courant** (celui que `getCurrentMoment` calcule déjà, AD-4) n'est pas entièrement cochée -- recalculée en direct depuis l'état réel des items à chaque chargement de page, jamais depuis un accusé de réception push.

## Boundaries & Constraints

**Always:**
- La bannière ne porte que sur le moment courant (celui déjà actif par défaut dans `MomentTabs`) -- pas les trois moments à la fois : l'AC ne parle que d'"un moment", et c'est le seul dont l'absence de notification vient potentiellement de se produire.
- Calcul 100% en direct à partir des données déjà chargées par `app/(accueil)/page.tsx` (mêmes `matinChecklist`/`retourChecklist`/`soirComplete` que ceux qui alimentent déjà l'affichage) -- jamais une lecture de `DayCompletion` (AD-2/AD-3/AD-5 : cette table reste réservée à un futur Streak, Epic 4) ni un état côté client (`Notification`/Service Worker).
- Ton neutre/incitatif, jamais culpabilisant ni urgent (DESIGN.md, cf. Epic 3 Context) -- pas de rouge/`destructive`, pas de mot comme "oublié".
- La bannière disparaît d'elle-même dès que le moment courant est complet (recalcul systématique, pas de dismiss manuel à mémoriser).

**Ask First:** Aucune.

**Never:**
- Détecter si une notification a réellement été envoyée/reçue (aucun état côté client sur le Service Worker n'est consulté) -- le repli est unconditionnellement recalculé, qu'il y ait eu notification ou non (FR-11).
- Étendre la bannière aux moments passés/futurs non courants (ex. signaler que "Ce matin" n'était pas fini alors qu'on est l'après-midi) -- hors AC de cette story.
- Toucher à l'onboarding iOS (Story 3.3) ou aux heures configurables (Story 3.4).
- Ajouter un composant `Alert`/`Banner` générique réutilisable dans `components/ui/` -- aucun autre écran n'en a besoin aujourd'hui ; suit le pattern existant (bloc inline `rounded-2xl` propre à chaque écran, ex. le bloc "Pas cours demain" déjà dans cette page).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Moment courant = MATIN, `matinChecklist` a au moins un item non coché | Ouverture Accueil le matin | Bannière visible au-dessus des onglets : "Il te reste des choses à faire ce matin." | N/A |
| Moment courant = SOIR, `soirComplete = true` (Sac + Révisions + devoirs à rendre tous faits) | Ouverture Accueil le soir | Aucune bannière | N/A |
| Moment courant = RETOUR, `retourChecklist` vide (aucun item configuré) | Ouverture Accueil au retour | `isBlockComplete([])` = trivialement complet -- aucune bannière (même convention que Sac/Révisions, spec 2.7) | N/A |
| L'enfant coche le dernier item restant du moment courant | Toggle via une action existante (Story 2.2/2.3/2.6/2.7, déjà couvertes) | `revalidatePath` recharge la page -- la bannière disparaît au prochain rendu, sans code nouveau | N/A |

</frozen-after-approval>

## Code Map

- `domain/day-completion.ts` -- exporter `isBlockComplete` (actuellement privée, ligne ~37) : c'est exactement la fonction dont Matin/Retour ont besoin (même forme `{checked: boolean}[]` que `matinChecklist`/`retourChecklist`), pas de nouvelle logique à écrire.
- `domain/day-completion.test.ts` -- ajouter des cas pour `isBlockComplete` exportée (vide -> true, tout coché -> true, un item non coché -> false).
- `components/moment/moment-tabs.tsx` -- exporter la map de libellés déjà définie en interne (`TABS`, ligne 31-35 : `MATIN` -> "Ce matin", `RETOUR` -> "Retour", `SOIR` -> "Ce soir") sous un nom du type `MOMENT_LABELS`, pour que la bannière réutilise exactement le même texte que l'onglet actif plutôt que de le dupliquer.
- `app/(accueil)/page.tsx` -- importer `isBlockComplete` ; calculer `matinComplete`/`retourComplete` (déjà quasi fait pour `soirComplete` ligne 376-380) ; dériver un booléen `currentMomentComplete` selon `currentMoment` (ligne 389) ; insérer le bloc bannière juste avant `<MomentTabs` (ligne 402), conditionné à `!currentMomentComplete`.

## Tasks & Acceptance

**Execution:**
- [x] `domain/day-completion.ts` -- exporter `isBlockComplete` avec un JSDoc à jour (déjà documentée en interne, juste rendre publique)
- [x] `domain/day-completion.test.ts` -- 3 tests pour `isBlockComplete` (vide, tout coché, un non coché)
- [x] `components/moment/moment-tabs.tsx` -- exporter `MOMENT_LABELS: Record<DayMoment, string>` (même valeurs que `TABS`, sans dupliquer la liste -- dériver `TABS` de `MOMENT_LABELS` ou l'inverse, au choix le plus simple à la lecture du fichier). **Écart signalé** : la définition réelle vit dans `domain/school-day.ts` (module pur), et `moment-tabs.tsx` la réexporte -- un Server Component qui importe une valeur non-composant depuis un module `"use client"` ne reçoit qu'une référence client, pas l'objet réel (constaté en vérification manuelle : bannière vide), donc `MOMENT_LABELS` ne pouvait pas rester définie dans ce fichier si `app/(accueil)/page.tsx` doit l'utiliser côté serveur.
- [x] `app/(accueil)/page.tsx` -- calculer `matinComplete`/`retourComplete` via `isBlockComplete`, dériver `currentMomentComplete`, rendre la bannière conditionnelle avec `MOMENT_LABELS[currentMoment]` (importé depuis `@/domain/school-day`, cf. écart ci-dessus)
- [x] Vérification manuelle : marquer tous les items du moment courant, recharger -- bannière absente ; décocher un item -- bannière réapparaît ; tester les 3 moments

**Acceptance Criteria:** (reprise d'epics.md Story 3.2, ci-dessus)

## Spec Change Log

- Code Map amendment (implementation): `MOMENT_LABELS` is defined in `domain/school-day.ts` (next to `DayMoment`) instead of `components/moment/moment-tabs.tsx`, which re-exports it. Reason: `moment-tabs.tsx` has `"use client"` at the top, and in this project's Next.js version (per `AGENTS.md`/`node_modules/next/dist/docs/01-app/03-api-reference/01-directives`) a `"use client"` directive marks **all** of a module's exports as the server/client boundary, not just component exports -- a Server Component importing a plain constant from it receives a client reference, not the real object. This was caught by manual browser verification: the banner rendered as `" : il reste encore des choses à faire."` (empty label) until the constant was moved to a plain module. The single-source-of-truth intent (banner reuses the exact tab label) is preserved; only the file that owns the definition changed.

- **2026-09-10 -- Correctifs issus de la revue adversariale à 3 couches (blind-hunter, edge-case-hunter, verification-gap) :**
  - `domain/day-completion.ts` -- extraction de `selectCurrentMomentCompletion(currentMoment, matinComplete, retourComplete, soirComplete)`, fonction pure testée (3 tests dans `domain/day-completion.test.ts`), remplaçant le ternaire inline de `app/(accueil)/page.tsx`. **Convergence blind-hunter + verification-gap** : les deux ont indépendamment signalé qu'un branchement permuté (ex. Matin/Retour inversés) n'aurait été détecté par aucun test -- la sélection était la seule pièce de logique de cette story sans couverture automatisée. KEEP : le ternaire produisait le bon résultat, seule l'absence de test était en cause -- comportement identique, juste extrait et testé.
  - `components/moment/moment-tabs.tsx` -- suppression du `export { MOMENT_LABELS };` mort (rien ne l'importait depuis ce fichier ; `app/(accueil)/page.tsx` importe déjà directement `@/domain/school-day`) -- convergence blind-hunter + edge-case-hunter, qui notait aussi que le garder risquait de reproduire le bug "use client" corrigé juste au-dessus s'il était réutilisé par erreur.
  - `components/moment/moment-tabs.tsx` -- `TABS` dérivé désormais d'un `MOMENT_ORDER: DayMoment[]` explicite plutôt que de `Object.keys(MOMENT_LABELS)` (convergence blind-hunter + edge-case-hunter : l'ordre des onglets dépendait implicitement de l'ordre d'insertion des clés de l'objet, qu'un futur réordonnancement du littéral aurait pu changer silencieusement).
  - Rejetés après triage (bruit ou déjà couvert) : léger écart entre le texte de la bannière implémentée et l'exemple illustratif de l'I/O matrix (l'exemple n'était pas une exigence de copie littérale) ; redondance visuelle mineure entre le nom du moment dans la bannière et le libellé de l'onglet actif juste en dessous (cosmétique, une tentative de reformulation a introduit une erreur grammaticale sur "Retour" et a été annulée) ; asymétrie documentaire de l'I/O matrix (seul RETOUR a une ligne "bloc vide" -- couvert fonctionnellement par le même test générique `isBlockComplete([])`) ; `role="status"` non annoncé au premier chargement (le contenu est de toute façon lu normalement au chargement initial, `role="status"` sert surtout à l'apparition/disparition après un `revalidatePath`, cas déjà correctement couvert).
  - Reportés à `deferred-work.md` : absence de test automatisé contre la régression "use client" exacte rencontrée cette session (nécessiterait un harnais de rendu de composants que ce repo n'a pas) ; lacunes de `epic-3-context.md` sur la politique de retry/nettoyage des abonnements push (concerne en réalité la Story 3.1, pas le code de cette story) ; absence de story pour désactiver complètement les rappels (observation produit, pas un défaut de code).

## Verification

**Commands:**
- `npx vitest run domain/day-completion.test.ts` -- expected: `isBlockComplete` couverte
- `npm run build` / `npx tsc --noEmit` / `npx eslint .` -- expected: aucune erreur

**Manual checks (if no CLI):**
- Ouvrir Accueil avec le moment courant incomplet -- bannière visible, ton neutre, pas de rouge
- Cocher tous les items du moment courant, recharger -- bannière disparue
- Vérifier les 3 moments (forcer via l'heure système si besoin, ou relire le code pour les 3 branches)

**Résultats (session d'implémentation) :**

- `npx vitest run` -- 237 tests passent, dont les 6 nouveaux de cette story (`domain/day-completion.test.ts` : 3 pour `isBlockComplete`, 3 pour `selectCurrentMomentCompletion`).
- `npx tsc --noEmit`, `npx eslint .`, `npm run build` -- aucune erreur.
- Vérification manuelle en navigateur (dev server) : bannière affichée pour "Ce matin" quand un item Matin n'est pas coché ; disparaît après avoir tout coché puis rechargé ; réapparaît en décochant un item ; le changement d'onglet côté client (Retour/Soir) ne modifie jamais la bannière, qui reste liée au moment courant calculé serveur -- confirme la frontière "jamais les trois à la fois" des Boundaries.

## Suggested Review Order

**Sélection de la complétude du moment courant (correctif de revue)**

- Point d'entrée : fonction pure extraite suite à la revue (convergence blind-hunter + verification-gap sur l'absence de test du ternaire inline d'origine).
  [`day-completion.ts:83`](../../domain/day-completion.ts#L83)

- Les 3 branches sont testées indépendamment (Matin/Retour/Soir), chacune vérifiant qu'elle ignore les deux autres complétudes.
  [`day-completion.test.ts:150`](../../domain/day-completion.test.ts#L150)

- Appelée avec les 3 complétudes déjà calculées, remplace l'ancien ternaire inline.
  [`page.tsx:410`](../../app/(accueil)/page.tsx#L410)

**Complétude Matin/Retour (réutilisation de `isBlockComplete`)**

- `isBlockComplete` rendue publique -- même règle "bloc vide = trivialement complet" que Sac/Révisions (Story 2.7), zéro nouvelle logique.
  [`day-completion.ts:42`](../../domain/day-completion.ts#L42)

- Calculée à partir des mêmes checklists déjà chargées pour l'affichage des onglets -- aucun second aller-retour DB.
  [`page.tsx:295`](../../app/(accueil)/page.tsx#L295)

**Bannière (repli visuel)**

- Bloc conditionnel inline, ton neutre (`bg-accent/10`, jamais `destructive`), `role="status"`.
  [`page.tsx:428`](../../app/(accueil)/page.tsx#L428)

- Libellé du moment réutilisé tel quel depuis la source unique (jamais dupliqué dans le texte de la bannière).
  [`page.tsx:442`](../../app/(accueil)/page.tsx#L442)

**`MOMENT_LABELS` -- déplacement suite à une contrainte Next.js découverte en implémentation**

- Définition déplacée dans un module pur (sans `"use client"`) -- un Server Component important une valeur non-composant depuis un module client ne reçoit qu'une référence, pas la vraie valeur (constaté en vérification manuelle, cf. Spec Change Log).
  [`school-day.ts:111`](../../domain/school-day.ts#L111)

- `TABS` dérivé d'un ordre explicite (`MOMENT_ORDER`) plutôt que de l'ordre d'insertion des clés de l'objet (correctif de revue).
  [`moment-tabs.tsx:34`](../../components/moment/moment-tabs.tsx#L34)
