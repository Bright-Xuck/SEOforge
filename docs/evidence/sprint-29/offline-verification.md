# Sprint 29 — Offline Verification Evidence

**Date:** 2026-10-21
**Environment:** Windows, Node v24.18.0, repository root.
**Credentials:** None used. No live WordPress or AI provider calls.

## Regression gate

```text
pnpm typecheck
Tasks: 60 successful, 60 total

pnpm test
Test Files  80 passed | 2 skipped (82)
Tests       498 passed | 4 skipped (502)

pnpm build
Tasks: 31 successful, 31 total

pnpm release:check
typecheck + test + build passed
```

## Local CLI checks

These checks intentionally ran without WordPress credentials or AI keys to verify failure
behavior.

### `forge doctor --json`

Observed:

- process exit code `1`
- `ok: false`, `readyForWrites: false`
- Node check passed
- missing `.env` was a warning
- missing `FORGE_WP_SITE_URL`, `FORGE_WP_USERNAME`, and
  `FORGE_WP_APPLICATION_PASSWORD` were failures with actionable details
- missing AI keys were a warning (metadata-only mode remains available)
- Ollama URL and `projects/` writability passed

No secret value was printed.

### `forge ai test --provider zai --json`

Observed:

- process exit code `1`
- error code `AI_PROVIDER_UNAVAILABLE`
- message: set `ZAI_API_KEY` in `.env` or the environment, then run `forge ai test zai`
- no stack trace

### Conflicting provider flags

Command:

```powershell
pnpm forge ai test zai --provider openai --json
```

Observed:

- process exit code `1`
- error code `AI_COMMAND_FAILED`
- message explains that positional `zai` and `--provider openai` conflict and asks for one

### `forge ai providers --json`

Observed:

- all supported providers are listed
- API-key providers report `missing key` when unset
- Ollama reports `local endpoint (verify with forge ai test ollama)` rather than claiming
  availability

## Quality evaluator coverage

New tests cover:

- grounded, specific, audience-aware copy passing accuracy and usefulness
- ungrounded numeric claims failing accuracy
- generic marketing language failing usefulness
- audience and keyword mismatch warnings
- readability warnings
- concrete CTA acceptance
- prohibited brand terms

The content-generation integration test asserts that `quality` is attached to the patch and
contains all six checks. Review-to-execution tests assert that an invalid approved patch is
skipped and a human-edited invalid patch can execute.

## Pending

Live WordPress/Elementor/Rank Math and live Z.ai verification remain pending credentials.
Follow the sequence in [`../installation.md`](../installation.md) and save sanitized results
only.
