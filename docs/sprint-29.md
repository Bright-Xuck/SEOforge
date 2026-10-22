# Sprint 29 — MVP Release Hardening

**Status:** Offline hardening complete. Live Z.ai verification passed; live WordPress writes are blocked because the configured secret is not a WordPress application password, the companion plugin is missing, and there is no valid staging page with id 6.
**Date:** 2026-10-21 (live checks re-run 2026-10-22)
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
- `pnpm test` — 80 files passed, 2 skipped (82 total); 501 tests passed, 4 skipped (505 total)
- `pnpm build` — 31/31 packages
- `pnpm release:check` — typecheck, tests, and build pass
- targeted ESLint on the new and modified quality, execution, config, bridge, and provider files passes

## Live verification status

Sanitized live evidence: [`evidence/sprint-29/live-verification.md`](evidence/sprint-29/live-verification.md).

What passed against `https://thcgummieslondon.uk`:

- `forge doctor` loaded the local `.env` with 0 errors. It now correctly warns that the
  configured WordPress secret is not a 24-character application password and reports
  `writeConfigPresent: false`.
- `forge ai test zai --model glm-4.5-flash` returned `Provider zai: ✓ healthy`.
- The Windows/libuv assertion after a failed `wp elementor doctor` run is fixed. The command
  now exits cleanly with code 1 and an actionable message.

What remains blocked:

- The WordPress REST API rejects the configured credentials
  (`AUTHENTICATION_FAILED` from `/wp/v2/users/me`). The configured value is not in WordPress's
  24-character application-password format; it is likely the normal login password. Create a
  new application password for `admin` (or the intended staging user), confirm
  `FORGE_WP_USERNAME`, and update `.env`.
- `forge/v1` is absent from the REST namespaces and `/wp-json/forge/v1/system` returns 404.
  Install and activate `packages/providers-wordpress/companion/forge-elementor-bridge.php`
  (version 0.3.0) on the target WordPress site.
- Remote post/page id `6` does not exist. `/wp/v2/media/6` is the WooCommerce placeholder
  attachment, and no page or post titled/slugged `forge` or `staging` exists. Create or
  identify a real staging page first; do not send writes to id 6.

Required live sequence after the three prerequisites are corrected:

```powershell
pnpm forge doctor
pnpm forge ai test zai --model glm-4.5-flash
pnpm forge wp elementor doctor 123
pnpm forge optimize default --url https://thcgummieslondon.uk --page 123 --provider zai --model glm-4.5-flash --keyword "your target keyword" --dry-run --json
```

Replace `123` with the verified staging page id.

Then review the session, apply explicitly, verify the re-read result, and roll back with the
saved artifact. Do not commit credentials or `.env`; rotate the application password after
shared testing.

## Deliberate non-changes

- No new engine or package.
- No second readability or metadata implementation.
- No automatic approval of quality warnings.
- No committed credentials or unsanitized evidence.
