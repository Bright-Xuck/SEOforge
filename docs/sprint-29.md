# Sprint 29 — MVP Release Hardening

**Status:** Implementation and offline verification complete. Live WordPress/Z.ai verification is blocked until credentials are supplied.
**Date:** 2026-10-21
**Scope:** Configuration/onboarding, provider setup, error handling, content-quality evaluation, execution safety, installation docs, regression coverage.

## Goal

Harden the existing Forge workflow for an MVP release without adding a second engine or a
parallel pipeline. Every change had to preserve:

- preview/dry-run by default
- explicit human approval
- verification after writes
- rollback artifacts
- the single review → execution → provider chain

## Blockers addressed

### Configuration and onboarding

- `@forge/config` now loads `.env` without overriding values already present in the shell or
  CI environment.
- `.env.example` documents the supported values without containing real credentials.
- `forge doctor` performs an offline readiness check (Node, env file, WordPress values, AI
  keys, Ollama URL, and `projects/` writability). It makes no network calls.
- Unsafe WordPress fallbacks (`example.com`, `forge`, `password`) and the homepage
  `example.com` fallback were removed. Missing configuration now fails with the environment
  variable to set.
- `docs/installation.md` covers prerequisites, the companion plugin, environment precedence,
  live checks, safe apply, rollback, regression checks, and troubleshooting.

### Provider setup and errors

- Z.ai's verified default model is `glm-4.5-flash` in both generation and health requests.
- `glm-4.7-flash` is no longer the default; it was intermittently overloaded.
- Provider selection accepts either `[provider]` or `--provider`; conflicting values fail
  with an actionable message.
- Missing credentials and unreachable providers produce short messages, not raw provider
  stack traces.
- `forge ai test` and `forge ai benchmark` exit non-zero on failure, including `--json`.
- Ollama is reported as a local endpoint to verify, not as falsely "available".

### AI content quality

- New deterministic evaluator in `@forge/content-generation` grades whether generated copy is
  accurate and useful:
  - ungrounded numeric claims → validation error
  - unverified strong claims, generic fluff, thin/unspecific copy → warnings
  - audience and target-keyword mismatch → warnings
  - readability (via the existing Sprint 20 validator) → warnings
  - prohibited brand terms → warnings
- Quality results are attached to generated sections and patches as `quality`, and quality
  warnings flow into the review item, where the existing policy forces manual review.
- Accuracy errors invalidate the patch. A human `EDIT` is required before an invalid patch can
  be executed.
- No fake AI output or fallback copy was added.

### Execution safety

- `buildExecutionPlanFromReview` skips approved-but-invalid patches unless a human supplied
  `editedContent`.
- This closes the gap where a bulk apply path could otherwise write content that failed
  deterministic validation.

## Offline verification

See [`evidence/sprint-29/offline-verification.md`](evidence/sprint-29/offline-verification.md).

Summary:

- `pnpm typecheck` — 60/60 tasks
- `pnpm test` — 80 files passed, 2 skipped (82 total); 498 tests passed, 4 skipped (502 total)
- `pnpm build` — 31/31 packages
- `pnpm release:check` — typecheck, tests, and build pass
- targeted ESLint on new quality/execution files passes

## Live verification status

Live checks were not run in this pass because the process had no `FORGE_WP_SITE_URL`,
`FORGE_WP_USERNAME`, `FORGE_WP_APPLICATION_PASSWORD`, or AI key, and no `.env` file existed.

Required live sequence when credentials are available:

```powershell
pnpm forge doctor
pnpm forge ai test zai --model glm-4.5-flash
pnpm forge wp elementor doctor 6
pnpm forge optimize default --url http://127.0.0.1:8080 --page 6 --provider zai --model glm-4.5-flash --keyword "accounting software" --dry-run --json
```

Then review the session, apply explicitly, verify the re-read result, and roll back with the
saved artifact. Do not commit credentials or `.env`; rotate the application password after
shared testing.

## Deliberate non-changes

- No new engine or package.
- No second readability or metadata implementation.
- No automatic approval of quality warnings.
- No committed credentials or unsanitized evidence.
