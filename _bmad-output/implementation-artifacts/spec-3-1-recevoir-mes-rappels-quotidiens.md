---
title: 'Story 3.1 — Recevoir mes rappels quotidiens'
type: 'feature'
created: '2026-09-09'
status: 'review'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-college-6eme-2026-09-02/ARCHITECTURE-SPINE.md'
baseline_commit: 'b19551e08e67e650d8ecb9918a90e5145383e500'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rien ne rappelle activement à l'enfant d'ouvrir l'app aux trois moments de sa routine (matin, retour, soir) -- sans notification, l'usage dépend entièrement de sa propre initiative, fragile en cas de fatigue ou de rupture de rythme.

**Approach:** Notifications Web Push envoyées par le serveur à des heures par défaut raisonnables (20h soir, 7h matin, 17h retour, America/Guadeloupe fixe -- AD-4), une fois par jour scolaire, déclenchées par 3 Vercel Cron Jobs distincts (un par moment, AD-8) plutôt que par une logique côté client. L'enfant active les rappels explicitement (permission navigateur), son abonnement push est persisté côté serveur.

## Boundaries & Constraints

**Always:**
- 3 moments distincts (SOIR/MATIN/RETOUR), chacun avec sa propre route serveur (`/api/cron/[moment]`) invoquée par son propre Vercel Cron Job (AD-8) -- jamais une seule route générique qui devine le moment depuis l'heure d'exécution.
- Heures par défaut fixes pour cette story (20h/7h/17h, America/Guadeloupe -- cohérent avec les valeurs par défaut annoncées en Story 3.4, non implémentée ici) : ±59 minutes de précision, limite documentée du plan Vercel Hobby gratuit (acceptée, pas un bug).
- Un rappel ne se déclenche PAS un jour marqué "sans cours" (`NoSchoolDay`) ni un samedi/dimanche -- envoyer "prépare-toi pour l'école" un jour sans école serait un vrai defaut d'UX, même si aucune AC ne le formule explicitement (lecture de "une fois par jour scolaire" dans l'AC de cette story).
- L'abonnement push (`PushSubscription`) est scopé par `userId` comme le reste du modèle de données, même si l'app n'a qu'un seul utilisateur aujourd'hui (cohérence avec le reste du schéma).
- La route `/api/cron/[moment]` vérifie un secret (`CRON_SECRET`, en-tête `Authorization: Bearer`) avant d'envoyer quoi que ce soit -- jamais un endpoint public invocable sans authentification.
- Un abonnement dont l'envoi échoue avec un statut indiquant qu'il n'est plus valide (410 Gone / 404) est supprimé de la base -- pas de tentative de renvoi indéfinie vers un abonnement mort.
- Ton des notifications non-culpabilisant (DESIGN.md) : un rappel neutre/chaleureux, jamais une formulation qui pointe un oubli ou une urgence.

**Ask First:** Aucune.

**Never:**
- Construire l'écran d'onboarding iOS "ajouter à l'écran d'accueil" (Story 3.3) -- cette story suppose que l'utilisateur est sur un navigateur/appareil où l'abonnement push fonctionne directement (Android/Chrome desktop), l'expérience iOS restreinte est traitée séparément.
- Construire le repli visuel in-app (bannière "checklist en attente", Story 3.2) -- cette story ne couvre que l'envoi de la notification système elle-même.
- Rendre les heures de rappel configurables (Story 3.4) -- valeurs fixes en dur pour cette story.
- Suspendre l'envoi si la checklist du moment est déjà entièrement cochée -- hors périmètre des AC de cette story (pourrait être une amélioration future, pas construite ici) : le rappel s'envoie inconditionnellement (sous réserve du filtre jour scolaire ci-dessus) à tous les abonnements enregistrés.
- Ajouter un manifest PWA/écran d'installation -- pas nécessaire pour que l'API Push fonctionne (Service Worker + Push API sont indépendants de l'installabilité), et hors périmètre de cette story.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Enfant active les rappels (Réglages) sur Android/Chrome | Permission navigateur accordée | Abonnement Push créé et persisté (`PushSubscription`) | N/A |
| Enfant refuse la permission navigateur | Permission refusée | Aucun abonnement créé ; message clair affiché, pas d'erreur bloquante | N/A |
| L'heure du rappel "Ce matin" arrive un jour scolaire normal | Cron Vercel invoque `/api/cron/matin` | Notification Web Push envoyée à tous les abonnements de l'utilisateur | N/A |
| L'heure du rappel arrive un samedi, un dimanche, ou un jour marqué "sans cours" | idem | Aucune notification envoyée -- la route se termine normalement (pas une erreur) | N/A |
| La route cron est appelée sans le secret attendu | Requête sans header `Authorization` valide | 401, aucun envoi | N/A |
| Un abonnement existant n'est plus valide (désinstallation, permission révoquée côté navigateur) | `web-push` renvoie 410/404 pour cet abonnement | L'abonnement est supprimé de `PushSubscription`, les autres abonnements ne sont pas affectés | N/A |
| Aucun abonnement n'existe encore | Cron invoqué normalement | La route se termine sans erreur (rien à envoyer) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` + `prisma/production/schema.prisma` -- nouveau modèle `PushSubscription` (id/userId/endpoint (unique)/p256dh/auth/createdAt). Migration Prisma.
- `.env.example` -- nouvelles variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto de contact), `CRON_SECRET` -- valeurs réelles jamais commitées.
- `package.json` -- dépendance `web-push` (génération/envoi Web Push signé VAPID).
- `public/sw.js` (nouveau) -- Service Worker minimal : écoute `push` (affiche la notification via `showNotification`) et `notificationclick` (ouvre/focus `/`).
- `lib/push.ts` (nouveau, domain-adjacent mais dépend de `web-push` -- vit hors de `domain/` par AD-1) -- configuration VAPID, fonction `sendPushToUser(userId, payload)` : envoie à tous les abonnements de l'utilisateur, supprime les abonnements 410/404.
- `data/push-subscription.ts` (nouveau) -- CRUD minimal : `saveSubscription`, `listSubscriptionsForUser`, `deleteSubscription`.
- `actions/push.ts` (nouveau) -- Server Action `subscribeToPush(subscription)` appelée depuis le client après l'abonnement navigateur réussi.
- `components/settings/notifications-section.tsx` (nouveau) -- section Réglages : bouton "Activer les rappels", gère permission + `serviceWorker.register` + `pushManager.subscribe` + appel à `subscribeToPush`.
- `app/reglages/page.tsx` -- intègre la nouvelle section.
- `app/api/cron/[moment]/route.ts` (nouveau) -- vérifie `CRON_SECRET`, valide `moment` ∈ {soir,matin,retour}, vérifie jour scolaire (pas weekend, pas `NoSchoolDay`), construit le message, appelle `sendPushToUser`.
- `vercel.json` -- 3 entrées `crons` (soir 00:00 UTC = 20h Guadeloupe ; matin 11:00 UTC = 7h ; retour 21:00 UTC = 17h), chacune pointant sa propre route.
- `domain/notifications.ts` (nouveau, pur) -- `NOTIFICATION_MOMENTS`, messages par moment, et une fonction pure `shouldSkipReminderToday(weekday, dateIso, noSchoolDayIsoSet)` réutilisable/testée indépendamment de l'infra push.

## Tasks & Acceptance

**Execution:**
- [x] Génération des clés VAPID (une fois, en local) + documentation dans `.env.example` (jamais les vraies valeurs)
- [x] `prisma/schema.prisma` + `prisma/production/schema.prisma` + migration -- `PushSubscription`
- [x] `domain/notifications.ts` + tests -- messages par moment, `shouldSkipReminderToday`
- [x] `data/push-subscription.ts`, `lib/push.ts` -- persistance + envoi + nettoyage des abonnements morts
- [x] `actions/push.ts` -- Server Action d'abonnement
- [x] `public/sw.js` -- Service Worker minimal (push + notificationclick)
- [x] `components/settings/notifications-section.tsx` + intégration `app/reglages/page.tsx`
- [x] `app/api/cron/[moment]/route.ts` + `vercel.json` -- 3 crons
- [ ] Vérification manuelle : activer les rappels sur Chrome desktop/Android, déclencher manuellement chaque route cron (avec le secret) et confirmer la réception de la notification ; confirmer qu'un jour "sans cours"/weekend ne déclenche rien ; confirmer la suppression d'un abonnement invalide -- **partiellement fait cette session** (voir Résultats sous Verification) : tout le serveur est vérifié réellement (curl + scripts, y compris un vrai 404 FCM), mais la réception effective d'une notification système sur un vrai navigateur reste à confirmer par l'utilisateur (sandbox de dev bloqué en permission "denied").

**Acceptance Criteria:** (reprises d'epics.md Story 3.1, ci-dessus)

## Spec Change Log

**2026-09-10 -- Corrections issues de la revue adversariale à 3 couches (blind-hunter, edge-case-hunter, verification-gap) :**

- `lib/push.ts` -- l'appel `await deleteSubscription(...)` (dans le cas 410/404) est maintenant protégé par son propre try/catch : un échec de suppression ne fait plus rejeter tout le `Promise.all` et ne fait plus perdre le décompte `sent`/`removed` des autres abonnements du même utilisateur (convergence blind-hunter + edge-case-hunter -- risque réel de perte de batch).
- `app/api/cron/[moment]/route.ts` -- tout le corps métier (après auth + validation de `moment`) est maintenant dans un try/catch : une erreur inattendue (ex. VAPID mal configurée sur Vercel) renvoie un 500 avec un corps diagnosticable au lieu d'un crash opaque et silencieux (aligné avec la convention déjà établie ailleurs dans le repo).
- `app/api/cron/[moment]/route.ts` -- comparaison du secret cron passée à `crypto.timingSafeEqual` (au lieu de `!==`) pour éviter une fuite d'information par timing.
- `prisma/schema.prisma` + `prisma/production/schema.prisma` -- ajout de `@@index([userId])` sur `PushSubscription` (chaque invocation cron filtre par `userId` ; tous les autres modèles scopés par utilisateur ont déjà cet index). Migration `20260910120228_add_push_subscription_user_index`.
- `actions/push.ts` -- validation renforcée : vérifie la forme de `input`/`input.keys` avant de déstructurer (une Server Action reste un endpoint HTTP appelable directement, pas seulement depuis notre client TypeScript -- un payload malformé aurait pu lever une `TypeError` non gérée).
- `components/settings/notifications-section.tsx` -- distinction entre permission `"default"` (popup fermée sans choix, l'enfant peut réessayer directement) et `"denied"` (refus explicite, nécessite un geste dans les réglages du navigateur) -- ces deux cas étaient auparavant confondus dans `handleActivate`, affichant à tort le message "refusé, va dans les réglages" pour une simple popup fermée.
- `components/settings/notifications-section.tsx` -- la lecture de `Notification.permission` dans l'effet de montage est maintenant dans le même try/catch que le reste de la résolution du statut initial (un environnement sans `Notification` mais avec `serviceWorker`/`PushManager` ne laisse plus `status` bloqué indéfiniment sur `"checking"`).
- `components/settings/notifications-section.tsx` -- ajout d'un rendu explicite pour `status === "checking"` (auparavant un flash vide, sans branche dédiée).
- Ajout de 3 fichiers de test manquants, seule story de ce repo à introduire une Server Action / un utilitaire lib/ / une Route Handler sans couverture automatisée (constat du verification-gap) : `actions/push.test.ts` (intégration, même convention que `actions/checklist.test.ts`), `lib/push.test.ts` (unitaire, `web-push` et `data/push-subscription` mockés), `app/api/cron/[moment]/route.test.ts` (premier test de Route Handler du repo -- auth/validation/skip/erreur, dépendances mockées).

**Reporté à `deferred-work.md` (risque limité, hors du périmètre "always" de cette story, ou pattern déjà accepté ailleurs) :**
- Validation de forme/URL de `endpoint` dans `actions/push.ts` (au-delà de la non-vacuité) -- risque faible, le client envoie toujours une valeur bien formée issue d'une vraie API navigateur.
- `getScheduleForUser` sur-récupère (subjects + scheduleSlots + noSchoolDays) alors que la route cron n'utilise que `noSchoolDays` -- gain de performance négligeable au volume réel de cette app.
- `data/push-subscription.ts::saveSubscription` -- l'upsert réassigne `userId` sans condition dans la clause `update` -- sans risque tant que l'app reste mono-utilisateur (même famille de limitation déjà loguée ailleurs pour une future version multi-utilisateur).
- `notifications-section.tsx::handleActivate` -- appelle `register("/sw.js")` même quand l'effet de montage a déjà obtenu une registration (sans effet, les navigateurs dédupliquent) ; pas de garde `cancelled` contre un démontage pendant le flux (contrairement à l'effet de montage) -- polish UI mineur, risque de warning React seulement dans un cas d'usage très rare (clic puis navigation immédiate).

## Design Notes

## Verification

**Commands:**
- `npx vitest run domain/notifications.test.ts` -- expected: logique de skip jour non-scolaire couverte
- `npm run build` / `npx tsc --noEmit` / `npx eslint .` -- expected: aucune erreur

**Manual checks (if no CLI):**
- Activer les rappels depuis Réglages sur un navigateur de bureau (Chrome) -- permission accordée, abonnement visible en base
- Invoquer manuellement chaque route `/api/cron/[moment]` avec le bon secret -- notification reçue
- Invoquer sans le secret -- 401
- Marquer aujourd'hui "sans cours" puis invoquer une route -- aucune notification envoyée

**Résultats (session d'implémentation) :**

- `npx vitest run` -- 231 tests passent, dont les 17 nouveaux (`domain/notifications.test.ts` x6, `lib/push.test.ts` x5, `actions/push.test.ts` x5, `app/api/cron/[moment]/route.test.ts` x7 -- ajoutés en revue, voir Spec Change Log).
- `npx tsc --noEmit`, `npx eslint .`, `npm run build` -- aucune erreur.
- Route `/api/cron/[moment]` invoquée manuellement via `curl` avec le bon `CRON_SECRET` (dev local) : 200, notification envoyée. Sans secret / avec un mauvais secret : 401. Segment `moment` inconnu : 400.
- Jour marqué `NoSchoolDay` (via scratch-script sur la vraie base de dev) : route invoquée, réponse `{ skipped: true, reason: "no-school-day" }`, aucun envoi -- confirmé aussi par un test automatisé équivalent sur la route mockée.
- Nettoyage des abonnements périmés : testé contre le vrai service Google FCM (pas un mock) avec une paire de clés EC P-256 valide générée via `crypto.generateKeyPairSync` -- FCM répond 404, `sendPushToUser` supprime bien la ligne `PushSubscription` correspondante (confirmé par script + repris en test unitaire mocké dans `lib/push.test.ts`).
- `public/sw.js` servi correctement (`curl` : 200, `Content-Type: application/javascript`).
- Flux navigateur complet (clic → permission → abonnement → persistance) **non exercé de bout en bout** : la permission `Notification` du navigateur sandboxé utilisé pour la vérification est bloquée en permanence sur `"denied"` (limitation de l'environnement, pas du code) et ne peut pas être changée programmatiquement. À la place : confirmé que le composant détecte et affiche correctement l'état `"denied"`, et vérifié séparément toute la chaîne serveur (auth, skip, envoi, nettoyage) via `curl`/scripts contre la vraie base de dev. **Reste à faire par l'utilisateur : activer les rappels depuis un vrai navigateur (Chrome desktop/Android) et confirmer la réception effective d'une notification système avant de marquer cette story `done`.**

## Suggested Review Order
