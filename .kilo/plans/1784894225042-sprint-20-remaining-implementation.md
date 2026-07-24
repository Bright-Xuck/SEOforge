# Sprint 20 — Remaining Implementation Plan

**Status:** In Progress (partial commit `6de3aba`)  
**Date:** 2026-07-24  
**Branch:** master

## Current State

The Sprint 20 commit (`6de3aba`) shipped partial infrastructure:

- ✅ Docs updated (README.md, architecture.md, project-structure.md, decisions.md)
- ✅ `BrandProfile` interface in `@forge/core/src/index.ts`
- ✅ `@forge/content-generation` expanded with: `types.ts`, `brief/builder.ts`, `brand/voice.ts`, `prompt/builder.ts`, `validator/seo.ts`, `scoring/scorer.ts`, `patch/`, `diff/`, `generators/` (Sprint 17 legacy), `validation/validator.ts`
- ✅ Pipeline Engine registered 8 new Sprint 20 steps (`content-brief`, `brand-profile`, `voice-profile`, `prompt-compose`, `content-validate`, `content-score`, plus `writer-select` and `ai-write` placeholders)
- ✅ Typecheck passes for all 29 packages
- ✅ Tests: 277/278 pass (1 failure in `PromptBuilder.buildVariables` — expects `brand.companyName` but test passes `brand: { brand: "Acme" }`)

## Missing Implementation (6 of 12 steps incomplete)

| Step | Status | What's missing |
|------|--------|----------------|
| 5. Writers | ❌ Not started | `writers/base.ts` + 15 specialized writers |
| 6. Validators (full) | ⚠️ Partial | `quality.ts`, `eeat.ts`, `readability.ts`, `compliance.ts` (only `seo.ts` exists) |
| 7. Scoring (full) | ⚠️ Partial | `confidence.ts`, `quality.ts` (only `scorer.ts` exists) |
| 9. CLI | ❌ Not started | `forge write {hero,faq,blog,section,preview,validate,score}` commands |
| 10. Homepage Engine | ❌ Not started | Update to use new AI Writing Engine pipeline |
| 11. Skills | ❌ Not started | Rewire skills to use content-generation |
| 12. Tests | ❌ Not started | Deterministic tests for all new modules |

## Execution Plan

### Task 1: Fix Existing Test Bug (5 min)

**File:** `packages/content-generation/src/content-generation.test.ts:129`  
**Bug:** `brand: { brand: "Acme" }` should be `brand: { companyName: "Acme" }`  
**Fix:** Update test mock to match `BrandProfile.companyName` shape.

### Task 2: Complete `brand/` Module (15 min)

**Files to create:**
- `packages/content-generation/src/brand/profile.ts` — `BrandProfile` deterministic builder from knowledge + memory
- `packages/content-generation/src/brand/terminology.ts` — preferred/prohibited term extraction
- `packages/content-generation/src/brand/prohibited.ts` — forbidden-words engine

### Task 3: Complete `prompts/` Module (15 min)

**Files to create:**
- `packages/content-generation/src/prompts/variables.ts` — variable resolution helpers
- `packages/content-generation/src/prompts/templates.ts` — template helpers

### Task 4: Implement `writers/` Module (60 min)

This is the largest piece. Create:

- `packages/content-generation/src/writers/base.ts` — `BaseSectionWriter` with shared logic (provider selection, prompt composition, response parsing, validation, patch creation)
- `packages/content-generation/src/writers/hero.ts`
- `packages/content-generation/src/writers/benefits.ts`
- `packages/content-generation/src/writers/features.ts`
- `packages/content-generation/src/writers/services.ts`
- `packages/content-generation/src/writers/products.ts`
- `packages/content-generation/src/writers/about.ts`
- `packages/content-generation/src/writers/faq.ts`
- `packages/content-generation/src/writers/testimonials.ts`
- `packages/content-generation/src/writers/cta.ts`
- `packages/content-generation/src/writers/buying-guide.ts`
- `packages/content-generation/src/writers/comparison.ts`
- `packages/content-generation/src/writers/introduction.ts`
- `packages/content-generation/src/writers/conclusion.ts`
- `packages/content-generation/src/writers/contact.ts`
- `packages/content-generation/src/writers/blog.ts`

Each writer:
1. Receives `ContentBrief` + `BrandProfile` + section context
2. Composes a registry-backed prompt via `PromptComposer`
3. Calls AI Engine (`ProviderFactory` → `AIProvider`)
4. Receives `GeneratedContent`
5. Validates deterministically
6. Converts to `ContentPatch`

### Task 5: Complete `validator/` Module (30 min)

**Files to create:**
- `packages/content-generation/src/validator/quality.ts` — duplicate phrases, placeholder text, brand terminology
- `packages/content-generation/src/validator/eeat.ts` — author signals, citation quality, trust signals, expertise indicators
- `packages/content-generation/src/validator/readability.ts` — Flesch-Kincaid, sentence length, paragraph length, passive voice
- `packages/content-generation/src/validator/compliance.ts` — brand tone match, prohibited word check, CTA presence

### Task 6: Complete `scoring/` Module (20 min)

**Files to create:**
- `packages/content-generation/src/scoring/confidence.ts` — confidence estimation
- `packages/content-generation/src/scoring/quality.ts` — quality sub-scores

### Task 7: Add `GeneratedContent` Type (5 min)

**File:** `packages/content-generation/src/types.ts`  
Add `GeneratedContent` interface containing: `markdown`, `html`, `plainText`, `title`, `summary`, `confidence`, `seoScore`, `eeatScore`, `readabilityScore`, `naturalnessScore`, `brandVoiceScore`, `overallScore`, `validation`.

### Task 8: Register `writer-select` and `ai-write` Pipeline Steps (15 min)

**File:** `packages/pipeline-engine/src/adapters.ts`  
Implement the two placeholder steps:
- `createWriterSelectStep()` — maps section type to writer class
- `createAiWriteStep()` — invokes the selected writer with the composed prompt

### Task 9: Add `forge write` CLI Commands (30 min)

**File:** `apps/cli/src/index.ts`  
Add command group:

```
forge write hero [project] [--provider] [--model] [--json] [--preview] [--dry-run]
forge write faq ...
forge write blog ...
forge write section <type> ...
forge write preview ...
forge write validate ...
forge write score ...
```

Each command loads project context, builds a `ContentBrief`, invokes the appropriate writer, and outputs the result.

### Task 10: Update Homepage Engine (20 min)

**File:** `packages/homepage-engine/src/planner.ts`  
Update `HomepagePlanner` to use the new AI Writing Engine pipeline:
- `PageDNA` → `ContentBrief` → `Writer` → `Validation` → `Scoring` → `ContentPatch[]` → `ReviewSession`

### Task 11: Rewire Skills (20 min)

**Files to update:**
- `packages/skills/src/skill-factory.ts` — Replace generic section generation with AI Writing Engine-backed writers
- `packages/skills/src/prompts.ts` — Ensure prompt registry integration

### Task 12: Add Deterministic Tests (40 min)

**Files to create:**
- `packages/content-generation/__tests__/brief.builder.test.ts`
- `packages/content-generation/__tests__/voice.test.ts`
- `packages/content-generation/__tests__/writers.test.ts`
- `packages/content-generation/__tests__/validator.test.ts`
- `packages/content-generation/__tests__/scorer.test.ts`
- `packages/content-generation/__tests__/pipeline.test.ts`

### Task 13: Update `index.ts` Exports (5 min)

**File:** `packages/content-generation/src/index.ts`  
Export all new public APIs from the new modules.

### Task 14: Final Verification (10 min)

Run `pnpm build`, `pnpm typecheck`, `pnpm test` and ensure all pass with 0 failures.

## Risk / Notes

- The `PromptBuilder.buildVariables` test failure is a pre-existing bug from the partial Sprint 20 commit. Fix in Task 1.
- Writers depend on `PromptComposer` integration with `@forge/prompt-registry`. The existing `PromptBuilder` is a partial implementation; `prompts/variables.ts` and `prompts/templates.ts` complete it.
- `GeneratedContent` type was specified in the original Sprint 20 brief but is missing from the current `types.ts`.
- The pipeline steps `writer-select` and `ai-write` were registered as stubs in the Sprint 20 commit; they need real implementation.
- Homepage Engine currently uses `HomepagePlanner` with rule-based actions; Sprint 20 requires swapping to AI-generated content via the new writers.

## Acceptance Criteria Mapping

| Criterion | Status | Notes |
|-----------|--------|-------|
| AI Writing Engine package created | ⚠️ Partial | `content-generation` extended; needs writers/validators/scoring completion |
| ContentBrief implemented | ✅ | `brief/builder.ts` exists |
| BrandProfile moved into @forge/core | ✅ | Done |
| 15 specialized writers implemented | ❌ | Not started |
| Prompt Registry fully integrated | ⚠️ Partial | `PromptBuilder` exists; needs `variables.ts` + `templates.ts` |
| Content validation deterministic | ⚠️ Partial | `seo.ts` exists; needs 4 more validators |
| Quality scoring implemented | ⚠️ Partial | `scorer.ts` exists; needs confidence + quality modules |
| CLI writing commands working | ❌ | Not started |
| Pipeline steps registered | ⚠️ Partial | Steps registered; `writer-select` + `ai-write` are stubs |
| Homepage Engine updated | ❌ | Not started |
| Existing architecture provider-independent | ✅ | No changes to ai-engine boundary |
| All tests pass | ⚠️ Partial | 1 test failing; missing new module tests |
| pnpm build/typecheck/test succeed | ⚠️ Partial | typecheck passes; 1 test fails |
| No breaking changes to previous sprints | ✅ | No breaking changes detected |
