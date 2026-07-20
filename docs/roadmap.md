# Forge Roadmap

**Version:** 1.0.0
**Status:** Active
**Owner:** Bright Ndode

This document tracks the major capability milestones of Forge across sprints. It is the high-level companion to `architecture.md` (design) and `decisions.md` (ADRs).

---

## Milestones

### v0.x — Foundations
- **Sprint 8** — Pipeline Engine: reusable pipeline steps, CLI `forge pipeline`.
- **Sprint 9** — Knowledge & Memory: project knowledge, timelines, change detection.
- **Sprint 10** — AI Skills Platform: ai-engine, skills, prompt-registry; hardening (project resolver, context builder).
- **Sprint 11** — Agent Framework: deterministic agent orchestration.
- **Sprint 12** — Strategy Engine: strategy generation, validation, serialization.
- **Sprint 13** — Mission Engine: mission templates, planning, execution orchestration.
- **Sprint 14** — WordPress Write Provider: safe preview/dry-run/apply/rollback.
- **Sprint 15** — Homepage Optimization vertical slice (deterministic, no AI).
- **Sprint 16** — Content Intelligence Engine (v0.16.0): deterministic content understanding — Page DNA, Content Graph, quality, gaps. No LLM, no generation.

### v1.7 — Content Generation (CURRENT)
- **Sprint 17** — Section Content Generation Engine (v1.7.0-beta.1): Forge's first AI-powered but **section-scoped** content generation layer.
  - New `@forge/content-generation` package.
  - Consumes Content Intelligence (Page DNA + Content Graph) as source of truth.
  - Prompt Builder composes registry-backed prompts (never manual concat).
  - AI providers integrated through the existing AI Engine (mock providers + config scaffolding; real providers swap in later via `ProviderFactory`).
  - Produces self-contained `ContentPatch` + `SectionDiff` + `Preview` artifacts.
  - Validation gate (content safety) before any patch is emitted.
  - CLI `forge generate hero|faq|cta|section|page --preview`.
  - Pipeline steps, skill rewiring, and Homepage Optimization Mission integration.
  - **Out of scope:** visual review, scheduling, execution/WordPress writes, publishing.

### v1.8+ — Review & Apply (PLANNED)
- **Sprint 18** — Content Review & Apply:
  - Visual diff rendering of generated sections.
  - Approval queue + batch approval.
  - Execution Engine wiring to WordPress Provider.
  - Rollback support for applied patches.

---

## Dependency Direction (enforced)
`content-generation → content-intelligence` (one-way). Content Intelligence must never import AI, prompt-registry, or skills. Generation is additive and sits above understanding.

## Guiding Principles
1. AI only produces **candidate improvements** at the **section level**. Never blindly rewrite an entire page.
2. Content Intelligence is the source of truth; AI never bypasses it.
3. Every AI output becomes a `ContentPatch` — reviewable, diffable, and approval-gated.
4. No execution without approval. No publishing in Sprint 17.
