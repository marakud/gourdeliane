- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-initialisation-du-projet-et-premier-deploiement.md`
  summary: `ensureSeedUser()` (data/user.ts) has a check-then-create race if ever called from concurrent request-serving code instead of only the one-shot seed script.
  evidence: Edge-case review flagged that two concurrent calls could both pass `findFirst()` before either `create()`s, producing duplicate `User` rows. Currently only called once by `prisma/seed.ts` during migration/build, so unreachable today -- revisit if a future story calls it from a request path (e.g. a lazy-seed fallback) instead of only at deploy time.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-initialisation-du-projet-et-premier-deploiement.md`
  summary: No lint rule or dependency-boundary check enforces AD-1 (domain/ must not depend on Next.js or Prisma) -- it's documented only as a comment in domain/README.md.
  evidence: Blind-hunter review noted the constraint is currently honor-system only. Low risk while domain/ is empty (Story 1.1); worth adding an eslint-plugin-boundaries/dependency-cruiser rule once domain/ gains real modules in Epic 2, so a future import can't silently violate the isolation the architecture spine requires.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-initialisation-du-projet-et-premier-deploiement.md`
  summary: `prisma/schema.prisma` (SQLite) and `prisma/schema.production.prisma` (Postgres) are hand-duplicated with no automated check that they stay in sync as models are added.
  evidence: Verification-gap review noted both files define the same `User` model independently, by convention/comment only. Fine at one model; as Story 1.2+ adds `Subject`, `ScheduleSlot`, etc., a drift between the two schemas would only surface at Vercel deploy time. Consider a small script or CI check that diffs the two schemas' model definitions (ignoring `datasource.provider`).
