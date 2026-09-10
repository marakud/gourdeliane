# Digest: pawnote current language/status (round 3)

**Note:** this file was reconstructed from the research assistant's reported chat summary — the assistant claimed to have written this file directly but it was not found on disk. Claims below are as reported, at correspondingly reduced traceability; treat file-backed status as unverified for this round.

## Claims

- The code.vexcited.com/index-education/pronote repository is genuinely Rust (~68% Rust / ~32% JS by the assistant's reported language breakdown), and its tagline + GPL-3.0 license match the old "Pawnote" project. — Source: code.vexcited.com/index-education/pronote (reported, not independently re-fetched), accessed 2026-09-09, confidence: medium, class: version/compat

- The "index-education" namespace on code.vexcited.com has only two repos: the Rust `pronote` and a TypeScript `pronote.build` (described elsewhere as a JS-datamine tool, not an API client) — i.e. there is no maintained TypeScript API-client successor in that namespace. — Source: code.vexcited.com (reported), accessed 2026-09-09, confidence: medium, class: ecosystem-signal

- Vexcited's personal Forgejo profile has only 3 unrelated repos (none being a TS Pronote client). — Source: code.vexcited.com (reported), accessed 2026-09-09, confidence: low, class: ecosystem-signal

- GitHub's Vexcited/PRONOTE and Vexcited/Pawnote now 404, including an issue titled "REWRITE: 2.0.0" opened December 2025 that was reportedly found before the repo went fully inaccessible — consistent with an in-progress rewrite (to Rust) that was never shipped as a new TypeScript/npm release. — Source: GitHub (reported, issue content not independently re-verified), accessed 2026-09-09, confidence: low, class: ecosystem-signal

- Could not confirm npm's deprecation banner for the `pawnote` package directly (npmjs.com and socket.dev both returned 403 again); only indirect evidence (last publish v1.6.2, 2025-09-21) was obtained. No blog/changelog explaining a Rust migration was found. — class: version/compat, confidence: low

## Leads for follow-up

- A possibly-related fork `LiterateInk/Pawnote.js` surfaced; its relationship to Vexcited's project is unverified.
- Two conflicting "last updated" dates for the Rust repo were reported (May 25 vs June 21, 2026) — unreconciled.
- Re-verify all claims in this file directly (the writing agent did not actually persist its findings to disk as instructed) before treating them as more than medium/low confidence.

## Could not find / unresolved

- Independent, first-hand confirmation of every claim above — this entire round's findings rest on the assistant's self-report rather than a file this researcher could directly inspect.
