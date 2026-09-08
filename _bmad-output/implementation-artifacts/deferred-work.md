- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-initialisation-du-projet-et-premier-deploiement.md`
  summary: `ensureSeedUser()` (data/user.ts) has a check-then-create race if ever called from concurrent request-serving code instead of only the one-shot seed script.
  evidence: Edge-case review flagged that two concurrent calls could both pass `findFirst()` before either `create()`s, producing duplicate `User` rows. Currently only called once by `prisma/seed.ts` during migration/build, so unreachable today -- revisit if a future story calls it from a request path (e.g. a lazy-seed fallback) instead of only at deploy time.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-initialisation-du-projet-et-premier-deploiement.md`
  summary: No lint rule or dependency-boundary check enforces AD-1 (domain/ must not depend on Next.js or Prisma) -- it's documented only as a comment in domain/README.md.
  evidence: Blind-hunter review noted the constraint is currently honor-system only. Low risk while domain/ is empty (Story 1.1); worth adding an eslint-plugin-boundaries/dependency-cruiser rule once domain/ gains real modules in Epic 2, so a future import can't silently violate the isolation the architecture spine requires.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-initialisation-du-projet-et-premier-deploiement.md`
  summary: `prisma/schema.prisma` (SQLite) and `prisma/schema.production.prisma` (Postgres) are hand-duplicated with no automated check that they stay in sync as models are added.
  evidence: Verification-gap review noted both files define the same `User` model independently, by convention/comment only. Fine at one model; as Story 1.2+ adds `Subject`, `ScheduleSlot`, etc., a drift between the two schemas would only surface at Vercel deploy time. Consider a small script or CI check that diffs the two schemas' model definitions (ignoring `datasource.provider`).

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-gerer-mon-emploi-du-temps.md`
  summary: No overlap validation when creating/editing a `ScheduleSlot` -- two slots for the same user/weekday with overlapping time ranges (or exact duplicates) can both be saved.
  evidence: Blind-hunter and edge-case-hunter reviews both flagged this independently. Not required by any spec 1.2 acceptance criterion (only end > start is validated), but a real timetable invariant worth enforcing once the UI has room for a clear conflict message -- likely alongside Story 1.3's day views.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-gerer-mon-emploi-du-temps.md`
  summary: `findOrCreateSubject` (data/schedule.ts) has a rare read-then-create race for two concurrent slot creations on a brand-new subject name (or case-variant names), and Server Actions accept malformed input (non-string, null) that only TypeScript -- not a runtime guard -- currently blocks.
  evidence: Edge-case-hunter flagged both. Very low real-world risk for this app (single family user, one device at a time, submit button disabled during pending state), and Server Actions are technically network-reachable so a malformed direct POST could bypass the client's type safety. Revisit if the app ever gains multi-device/concurrent usage or a public-facing API surface.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-gerer-mon-emploi-du-temps.md`
  summary: No confirmation step before deleting a `ScheduleSlot` (SlotRow's trash icon deletes immediately), and no `loading.tsx`/`error.tsx` boundary for the `/edt` route.
  evidence: Blind-hunter review. Reasonable future polish, not required by any spec 1.2 acceptance criterion; worth reconsidering once more destructive actions exist across the app (a shared confirm-dialog pattern would serve all of them).

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-gerer-mon-emploi-du-temps.md`
  summary: DESIGN.md's subject color palette (subject-1..8) is fixed at 8 colors; a user with more than 8 active subjects gets visually duplicate subject-tag colors (the "cyclique" behavior DESIGN.md itself specifies).
  evidence: Surfaced during Story 1.2 implementation while wiring `assignNextColorIndex` exactly per AD-6/DESIGN.md. A French collège student realistically has 10+ distinct subjects, so this will likely be hit in normal use, not just as a theoretical edge case. Fixing it (extending the palette, or adding a secondary visual differentiator) is a product/design decision for DESIGN.md, outside any single implementation story's scope -- flagging for whoever owns UX decisions next.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-voir-ma-journee-et-mon-lendemain.md`
  summary: The "Aujourd'hui"/"Demain" day views show no date/weekday heading (e.g. "Lundi 8 septembre") -- only the tab label and the slot list, so there's no on-screen confirmation of exactly which calendar date is being shown.
  evidence: Blind-hunter review. Not required by any spec 1.3 acceptance criterion. `domain/school-day.ts` already computes the ISO date, so surfacing it is a small follow-up whenever this screen gets revisited.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-voir-ma-journee-et-mon-lendemain.md`
  summary: No visual indicator in the "Semaine" tab for which day column is "today", even though the app now has a well-defined notion of "today" (domain/school-day.ts).
  evidence: Blind-hunter review. Nice-to-have now that Story 1.3 introduced the concept explicitly; not required by any acceptance criterion.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-voir-ma-journee-et-mon-lendemain.md`
  summary: `parisDateParts` (domain/school-day.ts) has no guard against `Intl.DateTimeFormat` ever returning parts that don't parse to valid numbers (would silently produce NaN dates).
  evidence: Edge-case-hunter and blind-hunter both flagged it. Practically unreachable with a hardcoded, valid IANA zone name ("Europe/Paris") on any real JS runtime (Vercel/Node ship full ICU data) -- not worth a runtime guard now, but a cheap one to add if this function is ever touched again.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-voir-et-personnaliser-mon-sac-du-soir.md`
  summary: No uniqueness constraint or dedup on `SubjectItem.label` within a subject -- a user can create two items with the identical label under the same matière.
  evidence: Blind-hunter review. Not required by any spec 2.1 acceptance criterion; low real-world impact for a single child managing their own short lists, but worth a `@@unique([subjectId, label])`-style guard if it ever causes visible confusion.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-voir-et-personnaliser-mon-sac-du-soir.md`
  summary: Server Actions in actions/checklist.ts and actions/schedule.ts trust their input's TypeScript types at runtime with no `typeof` guard (a direct malformed POST could bypass client-side type safety).
  evidence: Edge-case-hunter review, same category as an already-deferred Story 1.1 finding. Very low real-world risk for a single-family, single-device-at-a-time app. **Update (Story 2.2):** the sibling half of this finding -- `revalidatePath` throwing inside the same try block as the mutation, misreporting a successful write as failed -- turned out to be real and reproducible (confirmed while writing `actions/checklist.test.ts`: the DB row existed despite `{ ok: false }`), and has been fixed in both action files (`safeRevalidate`/try-catch around the revalidate call). Only the missing runtime type guard remains deferred here. **Update (Story 2.4):** same missing-guard category confirmed again in the new `actions/homework.ts` (`createDevoirAction`/`toggleDevoirDoneAction`) by both edge-case-hunter and blind-hunter reviews -- extending, not new, still deferred at the same low-risk assessment.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-voir-et-personnaliser-mon-sac-du-soir.md`
  summary: `deleteSubjectItem` never removes the `ChecklistItemState` rows that reference the deleted item by `sourceId` (a loose string, not a foreign key) -- they accumulate as orphaned rows indefinitely instead of being purged.
  evidence: Blind-hunter review. This is the deliberate AD-3 behavior ("simply not rendered again, no active purge required") rather than an oversight, but for a long-lived family install the orphaned-row count will grow unbounded over years of use. Not a correctness bug (deriveSacChecklist already ignores them), just a storage-growth note worth a periodic cleanup job if it's ever worth the effort.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-voir-et-personnaliser-mon-sac-du-soir.md`
  summary: No `aria-live` region announces the sac checklist's "done/total" progress count as items are toggled, so a screen-reader user gets no feedback that the count changed.
  evidence: Verification/edge-case reviews, same category as an already-deferred Story 1.3 finding for the EDT tabs. Nice-to-have accessibility polish, not required by any spec 2.1 acceptance criterion.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-cocher-mes-routines-fixes-du-matin.md`
  summary: `FixedChecklistItem` default seeding via `createMany` gives all rows in one batch the identical `createdAt` timestamp (verified empirically -- all four default items got the exact same millisecond value), so `orderBy: { createdAt: "asc" }` has no guaranteed tie-break order among them.
  evidence: Edge-case-hunter review, confirmed by direct testing against dev.db. SQLite happened to preserve insertion order on ties in that test, but this is an implementation detail, not a guarantee (and may differ on Postgres in production) -- the four default labels (Clés, Goûter, Carnet, Chargeur) could theoretically render in a different order than documented. Cosmetic only, not required by any spec 2.2 acceptance criterion; a `sortOrder` column would be the clean fix if the display order ever needs to be guaranteed.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-cocher-mes-routines-fixes-du-matin.md`
  summary: If `DEFAULT_MATIN_ITEMS` is ever changed or extended in code, users already seeded (i.e. everyone after their first visit) will never receive the new/changed defaults -- `FixedChecklistDefaultsSeed` permanently suppresses re-seeding once written.
  evidence: This is the deliberate, spec-mandated behavior (see this spec's Design Notes "choix assumé"), not a bug, but it's a real product constraint worth remembering: evolving the shipped default list has no automatic migration/backfill path today. Would need a deliberate one-off script if it's ever needed.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: `Devoir.subject` has `onDelete: Cascade` -- if a future "supprimer une matière" feature ever ships (none exists today), deleting a `Subject` would cascade-delete every `Devoir` referencing it, contradicting this story's own AD-7 "jamais supprimé" invariant.
  evidence: Blind-hunter review, confirmed via grep that no subject-delete action exists yet (currently latent). Matches the same cascade convention already used for `ScheduleSlot`/`SubjectItem` on `Subject` deletion (a deliberate Story 1.2 choice, documented in `prisma/schema.prisma`), so this isn't a new pattern -- but `Devoir` is the first model whose own doc comment explicitly promises permanence, making the tension worth flagging for whoever eventually builds subject deletion.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: `data/homework.ts::listDevoirs` fetches a user's entire homework history (never purged, per AD-7) and filters "à faire" in JS (`domain/homework.ts::filterDevoirsAFaire`) rather than pushing `done: false` into the Prisma query, leaving the new `@@index([userId, done])` unused by this query.
  evidence: Blind-hunter review. Deliberate at spec-time (mirrors the existing Sac/Matin/Retour pattern of "data/ stays dumb, domain/ derives"), and harmless at current single-family data volumes, but unlike date-scoped `ChecklistItemState` a `Devoir` table only grows across a whole school year -- worth revisiting (e.g. a `listDevoirsAFaire` query-level filter) if load ever becomes noticeable. **Update (Story 2.4 amendment, retour utilisateur) :** `filterDevoirsAFaire` was deleted entirely -- `listDevoirs` fetching everything is now the intended design (done devoirs stay visible, checked, never hidden), not an optimization gap on the display path. The `@@index([userId, done])` remains genuinely unused today, though, so the growth-over-a-school-year concern above still stands as-is.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: `createDevoirAction` never verifies the submitted `subjectId` belongs to the acting user before writing -- an invalid/foreign id is only caught generically via the Prisma FK constraint (P2003).
  evidence: Blind-hunter and edge-case-hunter reviews, both independently. Mirrors the pre-existing, already-accepted pattern in `data/checklist.ts::createSubjectItem`; the app has exactly one seed user (`ensureSeedUser()`), so "another user's subject" cannot occur through any real usage today.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: The "à rendre" flag and échéance date are captured by the FAB's form but never surfaced anywhere in "Devoirs à faire" (no badge/indicator on the row) -- data the child explicitly enters is currently invisible.
  evidence: Blind-hunter review. Deliberate MVP scoping, not an oversight: the spec's Never explicitly excludes sac-linking (Story 2.5) and any due-date/urgency treatment from this story, and échéance exists in the schema specifically so Story 2.5 can consume it without a new migration. Worth a visual "à rendre le [date]" indicator once Story 2.5 makes the field product-meaningful. **Update (Story 2.4 amendment, retour utilisateur) :** échéance and days-remaining are now displayed on each row (`components/homework/devoirs-list.tsx`) -- resolved. The "à rendre" boolean specifically is still captured but never surfaced; only échéance was requested.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: `DevoirsList`'s `pendingId` is a single scalar (not per-row), so tapping two different devoir rows before either request resolves lets the later tap's resolution clear the earlier tap's pending guard early.
  evidence: Edge-case-hunter and blind-hunter reviews, both independently; verification-gap review confirmed it is not currently exploitable -- a tapped row is hidden immediately via `completedIds`, so there is no visible control left to re-trigger. Same single-scalar-`pendingId` pattern as `FixedChecklist` (Story 2.2/2.3), unaddressed there for the same reason. Would matter if a future story keeps the row visible (e.g. a "checked" state) instead of removing it. **Update (Story 2.4 amendment, retour utilisateur) :** exactly that scenario happened -- rows no longer disappear on toggle, making this concurrency gap newly real. Fixed by switching `pendingId`/`errorId` to per-row `Set<string>` state (`pendingIds`/`errorIds`). The identical single-scalar pattern in `FixedChecklist`/`SacChecklist` is unaffected by this fix and still carries the same latent (currently non-exploitable, since those rows still don't disappear-and-reappear) risk -- worth retrofitting there too if those checklists ever change shape similarly.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-cocher-mes-routines-fixes-du-retour.md`
  summary: `toggleChecklistItem` (actions/checklist.ts) validates `checklistType` and `sourceType` against two independent allow-lists (`KNOWN_CHECKLIST_TYPES`/`KNOWN_SOURCE_TYPES`), not against the set of valid *pairs* -- a direct call (or malformed POST, Server Actions being network-reachable) with e.g. `checklistType: "RETOUR", sourceType: "SUBJECT_ITEM"` would be accepted and write an orphaned `ChecklistItemState` row no UI ever reads.
  evidence: Edge-case-hunter review. Same allow-list design chosen deliberately in Story 2.2 (extended here, not introduced); no UI path in the app can produce an invalid pair today (each caller uses a wrapper that hardcodes a valid pair). Low real-world risk for this single-family app, same category as the already-deferred Story 2.1 "no runtime type guard on Server Action input" finding -- worth a paired-validation guard if the action surface is ever exposed more broadly.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-cocher-mes-routines-fixes-du-retour.md`
  summary: `createFixedChecklistItem`/`createRetourChecklistItem` and `toggleMatinChecklistItem`/`toggleRetourChecklistItem` (actions/checklist.ts) are near-identical function bodies differing only in the hardcoded `checklistType` constant, rather than both being generated from one parametrized helper.
  evidence: Blind-hunter review. This mirrors the deliberate Story 2.2 precedent (separate generation for SubjectItem vs FixedChecklistItem, documented in this diff's own code comment) and isn't a spec violation -- the spec's "généraliser, pas copier-coller" boundary applied explicitly to the two React components, which were generalized. Worth revisiting if a third fixed checklist (e.g. "Révisions", mentioned in code comments) is ever added -- a third near-identical copy would be the point to factor into `createFixedChecklistItemFor(checklistType)`/`toggleFixedChecklistItemFor(checklistType)`.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-cocher-mes-routines-fixes-du-retour.md`
  summary: `deriveFixedChecklist` (domain/checklist.ts) filters `checkedStates` only by `sourceType`, trusting -- by caller convention, not by the type system -- that the caller already scoped `checkedStates` to the right `checklistType` (via `listChecklistItemStates(..., checklistType)`) before calling it. Now that two checklists (Matin, Retour) share the same `CHECKLIST_SOURCE_TYPE_FIXED_ITEM`, a future caller that accidentally passes merged Matin+Retour states into one `deriveFixedChecklist` call would silently cross-contaminate checked state between the two checklists.
  evidence: Blind-hunter review. Not a bug in either of this diff's actual call sites (both `app/(accueil)/page.tsx` fetches are correctly pre-scoped by `checklistType`), and no test exercises the misuse case since it doesn't occur in the current codebase. Worth a `checklistType` parameter on `deriveFixedChecklist` itself (asserted rather than trusted) if a third fixed checklist is ever added and this function's call sites multiply.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-cocher-mes-routines-fixes-du-retour.md`
  summary: The repo has no page- or component-rendering test harness (no `@testing-library/react`, no e2e) -- so a swapped prop at a call site (e.g. `onToggle={toggleRetourChecklistItem}` accidentally passed to the "Ce matin" `<FixedChecklist>` instance, or `createAction`/`headingId` similarly swapped between the two `<FixedItemsManager>`/`<FixedChecklist>` pairs in `app/(accueil)/page.tsx` and `app/reglages/page.tsx`) would ship silently: both blocks would still look and behave like working checklists, just writing/reading the wrong `checklistType`.
  evidence: Verification-gap review, confirmed by a repo-wide importer search -- only the two page files import `FixedChecklist`/`FixedItemsManager`, and no test file imports either. I independently re-read both page files line-by-line for this story and confirmed the actual wiring is correct, so this is not a live bug, but the class of risk is new as of this story (the components had only one instance each before Story 2.3's generalization). Closing it would require introducing a page/component-rendering test category the project doesn't have today, which is a bigger investment than any single assertion -- worth reconsidering if this class of two-instances-of-a-generalized-component pattern recurs (e.g. Révisions).

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: `createDevoirAction`/`createDevoir` never verify a supplied `scheduleSlotId` belongs to the acting user before linking a devoir to it (retour utilisateur amendment) -- same unchecked-FK pattern already deferred for `subjectId` above.
  evidence: Edge-case-hunter and blind-hunter reviews, both independently. Single-seed-user app today, so not exploitable through any real usage; would need addressing together with the `subjectId` check above if real auth is ever added.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: `deleteDevoirAction`/`toggleDevoirDoneAction` (retour utilisateur amendment) trim/read `input.id`/`input.done` with no runtime `typeof` guard -- a malformed direct call could throw before the try/catch, or (for `done`) silently no-op if `undefined`.
  evidence: Edge-case-hunter review. Same category as the already-deferred Story 2.1 "no runtime type guard on Server Action input" finding, now extended to the two new devoir actions -- same low-risk assessment (single-family, single-device app).

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: `domain/homework.ts::computeDaysRemaining` has no guard against a malformed "yyyy-MM-dd" input producing `NaN` (would surface as "il y a NaN jours" in the UI).
  evidence: Edge-case-hunter review. Every call site passes an already-validated ISO string (either `.toISOString().slice(0,10)` on a stored `Date`, or a value that already passed `parseEcheance`'s validation) -- same "practically unreachable with well-formed callers" pattern already accepted for `domain/school-day.ts::parisDateParts` (Story 1.3 deferred finding).

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: The delete button (trash icon) in `DevoirsList` (retour utilisateur amendment) has no confirmation step and sits 44px from the frequently-tapped done-toggle -- a stray tap permanently destroys a devoir with no undo.
  evidence: Blind-hunter review. Matches the app's existing no-confirmation convention for destructive actions (`SlotRow`'s créneau delete, `FixedItemsManager`'s item delete) -- a deliberate project-wide tradeoff, not an oversight specific to this story -- but "Devoirs" is a daily-tap surface unlike those settings-context lists, so the accidental-deletion risk is more frequent here. Worth a shared confirm/undo pattern if it turns out to bite in practice.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: `AddHomeworkFabSlot[]`/`AddHomeworkFabSubject[]` (retour utilisateur amendment) are fetched once at page load -- if a referenced `scheduleSlotId` is deleted in another tab/session before the form submits, `createDevoir`'s FK write throws and the whole devoir creation fails with a generic error instead of, say, creating it unlinked.
  evidence: Blind-hunter review. Narrow race window, single-family app, graceful (if unhelpful) failure via the existing try/catch -- same low-priority category as other stale-reference-at-submit findings already accepted elsewhere in this codebase.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: `data/homework.ts::createDevoir` (retour utilisateur amendment) now takes 6 positional optional parameters (`userId, subjectId, description, aRendre, echeance, scheduleSlotId`) -- test call sites already have to pass `null` explicitly just to reach the last one, a sign the approach is running out of room and risks silent argument transposition if another field is ever added.
  evidence: Blind-hunter review, code-quality not a live bug. Worth an options-object refactor (`{ userId, subjectId, description, aRendre?, echeance?, scheduleSlotId? }`) next time this function's signature needs to change.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-noter-et-suivre-mes-devoirs.md`
  summary: A devoir linked to a créneau (retour utilisateur amendment, "programmer le devoir dans l'EDT") is only shown nested under that créneau in the "Aujourd'hui"/"Demain" tabs -- never in the "Semaine" (week) view, which `components/schedule/week-schedule.tsx`/`slot-row.tsx` were not touched to support.
  evidence: Blind-hunter review, plausibly an intentional scope limitation (kept within this session's effort budget) rather than an oversight. A devoir linked to a créneau several days out stays invisible anywhere in the EDT until that day literally becomes "Aujourd'hui"/"Demain" -- worth extending to the Semaine grid if this undercuts the feature's usefulness in practice.
