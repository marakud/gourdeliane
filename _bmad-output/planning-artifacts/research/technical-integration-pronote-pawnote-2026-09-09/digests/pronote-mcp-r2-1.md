# Digest: pronote-mcp candidate verification (round 2)

## Claims

- pronote-mcp is a Model Context Protocol (MCP) server, not a general-purpose Pronote client library — its stated purpose is "connects Claude Desktop to Pronote via l'ENT Monlycée Île-de-France," exposing six tools (schedule, homework, grades, subject averages, lesson content, daily summaries) for an AI assistant to query, not an SDK/API layer meant to be embedded in a Next.js/TypeScript backend. — Source: PyPI, https://pypi.org/pypi/pronote-mcp/json, published (release 0.1.0) 2026-04-18, accessed 2026-09-09, confidence: high, class: version/compat

- Its underlying Pronote access is built on top of `pronotepy` (declared dependency `pronotepy>=2.14`), plus `beautifulsoup4`, `requests`, `mcp[cli]` (the MCP SDK), `python-dotenv`, and `uvicorn[standard]` for its optional HTTP mode. It is not a reimplementation and does not depend on `pawnote`. — Source: PyPI JSON API (requires_dist field), https://pypi.org/pypi/pronote-mcp/json, accessed 2026-09-09, confidence: high, class: version/compat

- The Monlycée ENT is a REQUIRED, sole authentication path for this tool: required env vars are `MONLYCEE_USER`, `MONLYCEE_PASS`, and `PRONOTE_URL`. The project's own documentation states "Monlycée ENT only – No direct Pronote login or alternative ENT methods are documented." — Source: PyPI long description / README (via PyPI JSON and GitHub repo fetch), https://pypi.org/pypi/pronote-mcp/json and https://github.com/thomasgreissler/pronote-mcp, accessed 2026-09-09, confidence: high, class: version/compat

- Monlycée.net is the ENT specific to lycées (high schools) in the Île-de-France region only — third-party descriptions call it "L'ENT Ile de France" serving "nearly 600,000 students" in that region's lycées. It is not described as covering collèges or other French regions. This means pronote-mcp's forced ENT dependency would not apply to a collège (middle-school) use case or to schools outside Île-de-France. — Source: netpublic.fr / dcol.fr / ciip.fr (secondary French EdTech sites), accessed 2026-09-09, confidence: medium (consistent across multiple independent French sources, but none is an official regional-authority page), class: ecosystem-signal

- The PyPI package metadata's own `project_urls` "Homepage" field is a literal unfixed placeholder: `https://github.com/YOUR_USERNAME/pronote-mcp` (and the "Issues" link is the same placeholder pattern) — the author never filled in the template. The real repository, found only via the README's install instructions (git clone command), is `https://github.com/thomasgreissler/pronote-mcp`. — Source: PyPI JSON, https://pypi.org/pypi/pronote-mcp/json, accessed 2026-09-09, confidence: high, class: version/compat

- PyPI release history shows exactly one release, `0.1.0`, uploaded 2026-04-18, with no subsequent versions as of 2026-09-09 (~5 months with no update). — Source: PyPI JSON API release metadata, https://pypi.org/pypi/pronote-mcp/json, accessed 2026-09-09, confidence: high, class: version/compat

- The linked GitHub repository (https://github.com/thomasgreissler/pronote-mcp) exists and shows very low adoption/activity signals: 12 commits total, 1 star, 0 forks, 0 open issues; exact last-commit date and contributor count were not resolvable from the fetched page content. Development status classifier on PyPI is "Alpha." — Source: GitHub repo (fetched via WebFetch summarization), https://github.com/thomasgreissler/pronote-mcp, accessed 2026-09-09, confidence: medium (fetched via an automated page summarizer, not manually verified commit-by-commit), class: ecosystem-signal

- Credential storage: the project stores the Monlycée ENT username/password as plaintext environment variables, set either via a `.env` file or directly inside `claude_desktop_config.json` (Claude Desktop's own config file). The repo includes a `.env.example` and lists `.env` in `.gitignore`, but the documentation does not appear to include an explicit written security warning against committing credentials or about plaintext storage risk. Optional HTTP server mode uses a static Bearer token (minimum 24 characters) rather than any session/OAuth mechanism. — Source: PyPI long description + GitHub README (via WebFetch), https://pypi.org/pypi/pronote-mcp/json and https://github.com/thomasgreissler/pronote-mcp, accessed 2026-09-09, confidence: medium (derived from an AI-summarized fetch of the README rather than a raw-text read), class: version/compat

## Leads for follow-up

- Manually open https://github.com/thomasgreissler/pronote-mcp (raw README.md) to confirm the exact commit dates/history and check for any CHANGELOG, since the automated fetch could not resolve the last-commit timestamp or contributor count.
- If the target user base includes non-Île-de-France collège students (as implied by this project being evaluated for a "college-6eme" context), confirm directly with pronotepy's own docs whether pronotepy's generic ENT/direct-login support (which pronote-mcp does NOT expose) would be the more relevant integration path instead of pronote-mcp.
- No evidence was found that pronote-mcp has been reviewed, audited, or discussed anywhere outside its own PyPI/GitHub pages (no blog posts, forum threads, or Hacker News/Reddit mentions surfaced in search) — worth one more targeted search if community vetting matters for the decision.

## Could not find / unresolved

- Exact last-commit date and contributor count for the GitHub repo (the summarized fetch did not surface these fields).
- Any independent third-party review, security audit, or community discussion of pronote-mcp specifically (searches for "pronote-mcp" on GitHub/web returned no matches other than the project's own PyPI/GitHub pages).
- Whether an official/authoritative (e.g., regional education ministry) source confirms Monlycée.net's exact geographic/school-level scope — current confirmation rests on secondary French EdTech help sites, not a primary regional authority page.
