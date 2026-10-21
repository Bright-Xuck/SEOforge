# Sprint 28 — End-to-End Optimization Wiring

**Status:** Implemented and live-verified end to end: AI-generated Elementor content plus deterministic Rank Math metadata, with verified apply and rollback.
**Date:** 2026-10-21
**Target:** local WordPress 7.1.3 + Elementor 4.3.5 + Rank Math 1.0.280, page 6 (`Forge Elementor E2E Staging Page`).

## Goal

Connect the existing engines into one real workflow:

```
site analysis → page priorities → brand-aware section writing → rich-text patches
→ review → internal-link recommendations → metadata improvements → safe execution
→ verification → rollback
```

Sprint 28 is a **wiring sprint**. No new engine, no parallel pipeline, and no duplicate implementation of parsing, generation, review, or execution. New code only fills seams that had no owner.

## What changed

### Prompt and AI seam

- `@forge/prompt-registry` now exposes `renderPromptTemplate`, so callers can render registry templates without re-implementing placeholder substitution.
- `@forge/ai-engine` resolves `promptId`/`template`/`variables` through `resolveRequestPrompt` before calling a provider.
- `@forge/content-generation` owns the prompt catalog (`section-prompts.ts`) for `section-*` and `content-generation.*` IDs. Before this sprint those IDs were referenced but never registered.
- `PromptBuilder` receives the real brand variables (voice, style, audiences, products/services, reading level). The `{{audience}}` variable comes from the brand's first audience, not the page-level fallback, and prompt version `1.1.0` tells the model not to contradict that audience.
- `@forge/ai-engine` now has a thin `ZAIProvider`. Z.ai exposes an OpenAI-compatible chat-completions endpoint, so the provider reuses the OpenAI transport and only overrides identity, endpoint, capabilities, and retry policy.
- Z.ai retries transient `429`/`503` responses (five retries with exponential backoff) and maps exhausted retries to `RetryExhaustedError`. The live run used `glm-4.5-flash`; `glm-4.7-flash` exists but was intermittently overloaded during the sprint.

### Content intelligence

- `rankPagePriorities` turns a `SiteIntelligenceReport` into an ordered, explainable work queue.
- The site-intelligence adapter writes `pagePriorities` into the shared context.
- Section targeting uses the real Elementor widget inventory when the caller supplies it (`documentSections` + `sectionTargets`). Heuristic section detection still runs for Page DNA, gaps, and quality.

### Metadata as a patch, not a second path

- Deterministic proposal builder: `buildMetadataProposal`.
- Proposal → `ContentPatch` translation: `metadataProposalToPatches`.
- Rank Math keys are whitelisted (`rank_math_title`, `rank_math_description`).
- Metadata patches flow through the same **review → compose → execute → verify → rollback** chain as rich-text patches. There is no separate approval path.
- Unchanged metadata is skipped, so reruns do not create no-op writes.

### Review → execution seam

- New `buildExecutionPlanFromReview` translates only `APPROVE`/`EDIT` review items into provider-independent actions.
- Supported actions: `content.elementor-patch` and `seo.update-rank-math-meta`.
- Unsupported or target-less patches are omitted rather than guessed.
- Elementor targets carry `pageId`, `expectedWidgetType`, `sourceFingerprint`, and `richText`.
- A review session captures one document fingerprint, but the first Elementor write changes that document. The plan keeps the document-level fingerprint on the first Elementor action per page and relies on each later patch's per-target `currentContent`/widget-type check. This lets a reviewed batch of three Elementor patches apply in one run without weakening target-level staleness checks.
- If an action fails on a resource, the execution engine skips later actions for that same resource instead of running them against the pre-batch state.
- The execution adapter falls back to the reviewed session when the composer produced only bundles/dependencies (the composer deliberately has no actions).

### Execution and provider

- Execution resource mapping for Elementor documents and SEO meta, per-action error capture, and rollback capture.
- Elementor write verification trusts the companion endpoint's structural re-read comparison. The client no longer rejects a write merely because Elementor re-serialized JSON with different key order, whitespace, or default `isInner:false` fields.
- Rollback execution reports the operations it actually restored. `completedActions`/`failedActions` now reflect each restore attempt, partial rollbacks keep `rollbackRequired: true`, and failures are captured per action.
- `@forge/providers-wordpress` gained a typed Rank Math transport and provider methods `readSeoMeta`, `updateSeoMeta`, `applySeoMetaWrite`.
- Rollback supports SEO meta and Elementor document restoration.
- Companion plugin endpoint `GET/POST /wp-json/forge/v1/seo-meta/{id}` reads, sanitizes, writes, and re-reads a whitelist of Rank Math fields.

### CLI

- `forge optimize` now seeds a real context: live page snapshot, Elementor inspection, derived sections/targets, current SEO meta, knowledge/brand, and page id.
- `--apply` is the explicit approval signal; without it the run is preview/dry-run.
- `forge review complete` marks a decided session complete.
- `forge review apply` now uses the shared review→execution translation, supports `--apply`, and writes a rollback artifact.
- `forge review rollback` finds the latest applied artifact for a session (or accepts `--from`).
- `forge execution rollback --from <file>` restores a persisted plan.
- Dry-run artifacts are explicitly rejected by both rollback commands.

### Review persistence fix

Completing a session used to leave a stale copy under `reviews/active/`. Since loading checks `active/` first, completed sessions appeared pending. `saveReviewSession` now removes the stale active copy when status becomes `completed`.

## Live flow

```
WordPress page HTML ──► readWebsite ──► websiteSnapshot
       │
       └──► Elementor inspect ──► documentSections + sectionTargets
                                      │
knowledge + brand + keyword ──────────┤
                                      ▼
                         content-generation adapter
                         ├─ AI section patches (when key present)
                         └─ deterministic Rank Math patches
                                      ▼
                                  review session
                                      ▼
                    buildExecutionPlanFromReview (APPROVE/EDIT only)
                                      ▼
                             execution engine
                     ├─ Elementor: dom-engine patch + provider write
                     └─ SEO meta: provider write + re-read verification
                                      ▼
                        context.executionResult + rollback artifact
```

## Verified on the live site

All commands were run from the repository root with credentials supplied through environment variables (`FORGE_WP_SITE_URL`, `FORGE_WP_USERNAME`, `FORGE_WP_APPLICATION_PASSWORD`). No credential is stored in the evidence files.

### 1. Preview (no writes)

```powershell
node apps/cli/dist/index.js optimize seoforge-e2e `
  --url http://127.0.0.1:8080 --page 6 `
  --brand "SEO Forge" --industry "SEO software" `
  --keyword "accounting software" --audience "small businesses" `
  --json
```

Observed:

- workflow `homepage-optimization`, state `Completed`
- site intelligence + page analysis + generation + review + compose + execution steps ran
- 3 sections derived from the real Elementor inventory
- 2 deterministic metadata patches generated
- review session created with 2 approved items
- execution dry-run marked both actions completed
- no remote writes

Evidence: [`evidence/sprint-28/preview.json`](evidence/sprint-28/preview.json)

### 2. Apply (explicit approval)

```powershell
node apps/cli/dist/index.js optimize seoforge-e2e `
  --url http://127.0.0.1:8080 --page 6 `
  --brand "SEO Forge" --industry "SEO software" `
  --keyword "accounting software" --audience "small businesses" `
  --apply --json
```

Observed Rank Math state after the write (re-read from the companion endpoint):

```json
{
  "title": "Accounting Software: Forge Elementor E2E Staging Page",
  "description": "Accounting Software: Staging page used by Forge end-to-end tests. SEO Forge.",
  "focusKeyword": null,
  "canonical": null,
  "robots": []
}
```

Evidence:

- [`evidence/sprint-28/apply.json`](evidence/sprint-28/apply.json)
- [`evidence/sprint-28/apply-live-meta.json`](evidence/sprint-28/apply-live-meta.json)

### 3. Roll back

```powershell
node apps/cli/dist/index.js execution rollback `
  --from projects/seoforge-e2e/execution/<timestamp>-rollback.json `
  --url http://127.0.0.1:8080 --username forge --app-password <redacted>
```

Observed state after rollback:

```json
{
  "title": "Forge Elementor E2E Staging Page",
  "description": "Staging page used by Forge end-to-end tests.",
  "focusKeyword": null,
  "canonical": null,
  "robots": []
}
```

Evidence:

- [`evidence/sprint-28/rollback-result.json`](evidence/sprint-28/rollback-result.json)
- [`evidence/sprint-28/rollback-live-meta.json`](evidence/sprint-28/rollback-live-meta.json)

### 4. Review session seam

The same flow was exercised through the standalone review commands:

```powershell
node apps/cli/dist/index.js review complete <sessionId> --project seoforge-e2e
node apps/cli/dist/index.js review apply <sessionId> --project seoforge-e2e `
  --url http://127.0.0.1:8080 --username forge --app-password <redacted> --apply
node apps/cli/dist/index.js review rollback <sessionId> --project seoforge-e2e `
  --url http://127.0.0.1:8080 --username forge --app-password <redacted>
```

Evidence:

- [`evidence/sprint-28/review-complete.json`](evidence/sprint-28/review-complete.json)
- [`evidence/sprint-28/review-apply.json`](evidence/sprint-28/review-apply.json)
- [`evidence/sprint-28/review-rollback.json`](evidence/sprint-28/review-rollback.json)

## AI Elementor content: live-verified

### 1. Preview with Z.ai (no writes)

`ZAI_API_KEY` was supplied through the environment and the provider was selected explicitly:

```powershell
$env:ZAI_API_KEY = "<redacted>"

node apps/cli/dist/index.js optimize seoforge-e2e `
  --url http://127.0.0.1:8080 --page 6 `
  --brand "SEO Forge" --industry "SEO software" `
  --keyword "accounting software" --audience "small businesses" `
  --provider zai --model glm-4.5-flash `
  --json
```

Observed:

- provider `zai`, model `glm-4.5-flash`, prompt version `1.1.0`
- 3 Elementor sections derived from the real widget inventory
- 5 patches: heading, text editor, button, Rank Math title, Rank Math description
- all 5 patches approved by the review policy; no writes
- review session `review-1792572738634-vmlih5`

Evidence: [`evidence/sprint-28/ai-preview.json`](evidence/sprint-28/ai-preview.json)

### 2. Apply the reviewed patches

The reviewed preview session was completed and applied directly, so the exact content that was reviewed is what reached the site (no second generation call):

```powershell
node apps/cli/dist/index.js review complete review-1792572738634-vmlih5 --project seoforge-e2e
node apps/cli/dist/index.js review apply review-1792572738634-vmlih5 --project seoforge-e2e --apply --json
```

Observed:

- `completedActions`: all 5 actions; `failedActions`/`skippedActions`: empty
- heading: `Small Business Accounting Software Simplified`
- body: `Save time and grow your business` plus a four-item benefits list, including `Trusted by 2,000+ teams...`
- button: `Try Accounting Software Free`
- Rank Math title: `Accounting Software: Forge Elementor E2E Staging Page`
- Rank Math description: `Accounting Software: Staging page used by Forge end-to-end tests. SEO Forge.`
- rendered page HTML contained the new heading/body/CTA and no longer contained the old heading or `Start Free Trial`
- rollback artifact: `projects/seoforge-e2e/execution/1792574147130-rollback.json`

Evidence:

- [`evidence/sprint-28/ai-review-apply.json`](evidence/sprint-28/ai-review-apply.json)
- [`evidence/sprint-28/ai-apply-live.json`](evidence/sprint-28/ai-apply-live.json)

### 3. Roll back

```powershell
node apps/cli/dist/index.js review rollback review-1792572738634-vmlih5 --project seoforge-e2e --json
```

Observed:

- all 5 rollback operations reported as restored, none failed
- heading back to `Accounting Software for Small Businesses`
- body back to `<p>Premium accounting software for modern businesses. Trusted by 2,000+ teams.</p>`
- button back to `Start Free Trial`
- Rank Math title/description back to the baseline values
- rendered page HTML confirmed the baseline and no longer contained the optimized heading/CTA

Evidence:

- [`evidence/sprint-28/ai-rollback.json`](evidence/sprint-28/ai-rollback.json)
- [`evidence/sprint-28/ai-rollback-live.json`](evidence/sprint-28/ai-rollback-live.json)

### Failure evidence kept

An earlier apply exposed two real defects: the provider compared raw Elementor JSON strings after a structurally verified write, and every Elementor patch in a batch carried the same pre-batch document fingerprint. The run failed on the first write and on the next two stale checks. Both defects are fixed; the failed run is kept as [`evidence/sprint-28/ai-apply-failed-verification.json`](evidence/sprint-28/ai-apply-failed-verification.json) so the before/after is auditable.

### Without an AI key

The CLI still refuses to fabricate section copy. With no provider key it prints:

```
No AI provider credentials found: running deterministic metadata-only optimization (no section copy is generated).
```

That mode is explicitly labeled metadata-only and does not claim an Elementor content run.

## Tests

Added/updated:

- `packages/content-intelligence/__tests__/page-priority.test.ts` — ranking, reasons, determinism, tie-break.
- `packages/content-generation/src/metadata/proposal.test.ts` — proposal bounds, keyword/brand inclusion, no-op skipping, Rank Math targets.
- `packages/content-generation/src/content-generation.test.ts` — brand-audience precedence over page audience and the `1.1.0` audience-aware prompt catalog.
- `packages/optimization-orchestrator/src/adapters/review-to-execution.test.ts` — approval-only translation, EDIT content, metadata mapping, missing page id, unsupported targets, and batch fingerprint de-duplication.
- `packages/optimization-orchestrator/src/adapters/content-generation-adapter.test.ts` — metadata-only mode, no-op suppression, clear failure when AI is requested without an engine.
- `packages/optimization-orchestrator/src/orchestrator.test.ts` — seeded initial context, post-run context, existing workflow coverage.
- `packages/providers-wordpress/src/seo-meta-transport.test.ts` — GET/POST paths, payload, verification data, error propagation.
- `packages/providers-wordpress/src/wordpress-provider.test.ts` — Elementor writes accept a structurally equivalent re-read with different serialization.
- `packages/execution-engine/src/engine.test.ts` — resource failure skips later actions, and rollback reports actually restored/failed operations.
- `packages/ai-engine/src/providers/zai.test.ts` — 429/503 retry success, retry exhaustion, and health fallback.
- `apps/cli/src/optimize/elementor-sections.test.ts` — widget mapping, unsupported/link-only skipping, page URL construction.

Full suite (after the fixes):

```
Test Files  78 passed | 2 skipped (80)
Tests       484 passed | 4 skipped (488)
```

`pnpm typecheck`: **60/60 tasks successful**.

## Safety invariants

- Preview is the default. Only `--apply` writes.
- Review decisions are deterministic. AI never approves.
- `review apply` refuses pending, rejected, or incomplete sessions.
- Only `APPROVE`/`EDIT` items become executable actions.
- Metadata is skipped when it already matches (no no-op writes).
- Elementor writes require a supported target and expected widget type. The first Elementor action per page also verifies the reviewed document fingerprint; later actions in the same batch verify their own `currentContent`.
- Writes are verified by a server-side structural re-read; serialization differences are not treated as content changes.
- If an action fails on a resource, later actions for that resource are skipped.
- Rollback reports restored and failed operations; a partial restore keeps `rollbackRequired: true`.
- Rollback artifacts are only usable when they contain captured original values; dry-run artifacts are rejected.
- Every write stays inside `Review → Composer → Execution → Provider`; there is no AI → WordPress or generation → WordPress shortcut.

## Known gaps

1. **Z.ai free-tier model availability is variable.** `glm-4.5-flash` completed the live run; `glm-4.7-flash` was intermittently overloaded (`429`, code `1305`). The provider retries, but a run may still need a later retry or a different free model.
2. **Metadata rollback is coarse.** Each metadata action stores the full prior Rank Math snapshot, so rolling back one field can restore sibling fields too. Final state is correct for a full rollback; per-field precision would need a narrower captured value.
3. **`optimize` seeds one page.** The site-intelligence step runs on the single page snapshot supplied by the CLI. Full-site priorities need a crawl/sitemap input; `rankPagePriorities` itself is ready for multiple pages.
4. **Internal links are recommendations only.** No insertion is attempted in this sprint.
5. **Rank Math revision id** is the post's modified timestamp, not a true per-meta revision. Verification re-read is the authoritative check.
6. **Execution rollback is not automatic** on partial failure; the artifact must be applied explicitly. A partial rollback now reports `rollbackRequired: true` and the failed action IDs.
7. **AI output is validated, not deterministically formatted.** A regeneration can produce a different but valid section; the live run applied the reviewed preview session so the reviewed content is what shipped.

## Next

1. Run the same preview → apply → rollback flow through `forge optimize --apply` against a disposable page, so the combined CLI path is covered by live evidence as well.
2. Add a multi-page site input to `optimize` so page priorities are meaningful across the site.
3. Tighten metadata rollback to per-field original values.
4. Consider a persisted execution history/artifact index rather than filename lookup.
5. Promote the live evidence into a repeatable script with a disposable page.
