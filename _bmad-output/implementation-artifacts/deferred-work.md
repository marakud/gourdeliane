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
