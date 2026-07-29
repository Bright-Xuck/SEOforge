# Architecture Decision Records

**Version:** v0.22.0 (Sprint 22A)

## ADR Index

| # | Title | Status |
|---|---|---|
| 001 | Monorepo with pnpm workspaces | Current |
| 002 | TypeScript as primary language | Current |
| 003 | Vitest as test runner | Current |
| 004 | ESLint + Prettier for code quality | Current |
| 005 | Commander for CLI framework | Current |
| 006 | Cheerio for HTML parsing | Current |
| 007 | Layered architecture (analysis → recommendation → action → execution) | Current |
| 008 | Provider abstraction pattern | Current |
| 009 | WordPress as initial provider | Current |
| 010 | Dry-run by default | Current |
| 011 | Deterministic analysis before AI generation | Current |
| 012 | Section-patch content generation (never whole pages) | Current |
| 013 | Review engine is deterministic (AI never approves) | Current |
| 014 | AI Engine as provider abstraction with factory | Current |
| 015 | Prompt Registry as versioned template store | Current |
| 016 | Content Intelligence is 100% deterministic (no AI) | Current |
| 017 | Optimization Composer between Review and Execution | Current |
| 018 | Action Engine — execution planning & approval queue | Current |
| 019 | Automation Policy — configurable auto-approval rules | Current |
| 020 | Approval Queue — multi-step approval workflow | Current |
| 021 | Agent Framework — role-specific decision agents | Current |
| 022 | Strategy Engine — goal-to-pipeline translation | Current |
| 023 | Mission Engine — high-level goal decomposition | Current |
| 024 | DOM Engine — selector-anchored patching | Current |
| 025 | Homepage Engine — specialized homepage optimization | Current |
| 026 | Content Generation — section-patch AI writers | Current |
| 027 | Brand Profile — brand-aware content generation | Current |
| 028 | Voice Detection — automatic brand voice analysis | Current |
| 029 | Cost Tracker — per-provider cost tracking | Current |
| 030 | Rate Limiter — provider rate limiting | Current |
| 031 | Retry Engine — configurable retry with backoff | Current |
| 032 | Provider Logger — structured provider call logging | Current |
| 033 | Prompt History — execution history for prompts | Current |
| 034 | Context Builder — AI context assembly from knowledge & memory | Current |
| 035 | Project Resolver — multi-source project resolution | Current |
| 036 | Knowledge Engine — project knowledge store | Current |
| 037 | Memory Engine — event-sourced memory | Current |
| 038 | Preflight Validator — pre-execution safety checks | Current |
| 039 | Rollback Groups — atomic undo grouping | Current |
| 040 | Pipeline Engine — dependency-ordered step execution | Current |
| 041 | Skills Registry — AI skill definitions | Current |
| 042 | Capability Detection — provider capability matrix | Current |
| 043 | Fallback Logic — provider fallback on failure | Current |
| 044 | Content Graph — deterministic content relationship mapping | Current |
| 045 | Stable IDs — deterministic section identification | Current |
| 046 | Gap Detection — deterministic content gap analysis | Current |
| 047 | Quality Scores — deterministic content quality metrics | Current |
| 048 | Section Detection — deterministic section classification | Current |
| 049 | Page DNA — deterministic page type & intent classification | Current |
| 050 | Snapshot — deterministic website snapshot model | Current |

---

## ADR-001: Monorepo with pnpm workspaces

**Status:** Current  
**Date:** Sprint 1

**Decision:** Use pnpm workspaces for monorepo management.

**Rationale:** pnpm provides strict dependency isolation, faster installs, and workspace protocol support. Turbo is used for task orchestration.

---

## ADR-002: TypeScript as primary language

**Status:** Current  
**Date:** Sprint 1

**Decision:** All packages use TypeScript with strict mode.

**Rationale:** Type safety across package boundaries, better refactoring support, and clear API contracts.

---

## ADR-003: Vitest as test runner

**Status:** Current  
**Date:** Sprint 1

**Decision:** Use Vitest for unit and integration tests.

**Rationale:** Native TypeScript support, fast watch mode, compatible with Vite ecosystem.

---

## ADR-004: ESLint + Prettier for code quality

**Status:** Current  
**Date:** Sprint 1

**Decision:** ESLint for linting, Prettier for formatting.

**Rationale:** Industry standard, consistent code style across all packages.

---

## ADR-005: Commander for CLI framework

**Status:** Current  
**Date:** Sprint 1

**Decision:** Use Commander.js for CLI command definitions.

**Rationale:** Mature, well-documented, supports subcommands and option parsing.

---

## ADR-006: Cheerio for HTML parsing

**Status:** Current  
**Date:** Sprint 1

**Decision:** Use Cheerio for server-side HTML parsing.

**Rationale:** Lightweight, jQuery-like API, no browser dependency.

---

## ADR-007: Layered architecture

**Status:** Current  
**Date:** Sprint 1

**Decision:** Architecture follows: analysis → recommendation → action → execution.

**Rationale:** Clear separation of concerns, each layer has single responsibility.

**Evolution:** Extended in later sprints to include Content Intelligence, Content Generation, Review, Optimization Composer, Mission, Agent, and Strategy layers.

---

## ADR-008: Provider abstraction pattern

**Status:** Current  
**Date:** Sprint 1

**Decision:** All external integrations go through a Provider interface.

**Rationale:** Swap providers without changing business logic.

---

## ADR-009: WordPress as initial provider

**Status:** Current  
**Date:** Sprint 1

**Decision:** First provider implementation targets WordPress REST API.

**Rationale:** Largest CMS market share, well-documented REST API.

---

## ADR-010: Dry-run by default

**Status:** Current  
**Date:** Sprint 1

**Decision:** All execution commands default to dry-run mode.

**Rationale:** Safety first — no accidental writes to production sites.

---

## ADR-011: Deterministic analysis before AI generation

**Status:** Current  
**Date:** Sprint 16

**Decision:** Content Intelligence runs first (deterministic), then Content Generation (AI).

**Rationale:** AI should only generate what analysis has identified as needed. Prevents hallucination and over-generation.

---

## ADR-012: Section-patch content generation

**Status:** Current  
**Date:** Sprint 17

**Decision:** Content Generation produces section patches only, never whole pages.

**Rationale:** Granular control, easier review, atomic rollback, no unintended side effects.

---

## ADR-013: Review engine is deterministic

**Status:** Current  
**Date:** Sprint 18

**Decision:** Review Engine uses deterministic policies only. AI never approves changes.

**Rationale:** Approval is a safety-critical function. AI cannot be held accountable for approval decisions.

---

## ADR-014: AI Engine as provider abstraction

**Status:** Current  
**Date:** Sprint 19

**Decision:** AI Engine wraps ProviderFactory, RateLimiter, RetryEngine, CostTracker.

**Rationale:** Single entry point for all AI operations with built-in safety and observability.

---

## ADR-015: Prompt Registry as versioned template store

**Status:** Current  
**Date:** Sprint 19

**Decision:** All prompts stored in PromptRegistry with versioning.

**Rationale:** Track prompt changes, rollback problematic prompts, audit trail.

---

## ADR-016: Content Intelligence is 100% deterministic

**Status:** Current  
**Date:** Sprint 16

**Decision:** Content Intelligence has zero AI dependencies. No network calls, no prompt registry.

**Rationale:** Understanding must be reliable and reproducible. AI would introduce non-determinism.

---

## ADR-017: Optimization Composer between Review and Execution

**Status:** Current  
**Date:** Sprint 21

**Decision:** Optimization Composer sits between Review and Execution. It deduplicates, detects conflicts, creates bundles, and prioritizes.

**Rationale:** Prevents conflicting patches, ensures atomic rollback groups, optimizes execution order.

---

## ADR-018: Action Engine

**Status:** Current  
**Date:** Sprint 14

**Decision:** Action Engine handles execution planning, approval queue, and risk assessment.

**Rationale:** Centralizes execution planning logic, separates concerns from recommendation.

---

## ADR-019: Automation Policy

**Status:** Current  
**Date:** Sprint 14

**Decision:** Configurable auto-approval rules based on risk level.

**Rationale:** Safe changes can skip manual review; high-risk changes always require human approval.

---

## ADR-020: Approval Queue

**Status:** Current  
**Date:** Sprint 14

**Decision:** Multi-step approval workflow with configurable policies.

**Rationale:** Enterprise deployments need multi-person approval for critical changes.

---

## ADR-021: Agent Framework

**Status:** Current  
**Date:** Sprint 14

**Decision:** Role-specific agents (SEO, Content, Linking, Schema, Accessibility, Performance, Learning).

**Rationale:** Each domain has unique decision logic. Monolithic agent would be unmaintainable.

---

## ADR-022: Strategy Engine

**Status:** Current  
**Date:** Sprint 21

**Decision:** Strategy Engine translates goals into prioritized pipeline selections.

**Rationale:** Decouples goal definition from pipeline execution. Enables strategy validation before execution.

---

## ADR-023: Mission Engine

**Status:** Current  
**Date:** Sprint 21

**Decision:** Mission Engine defines high-level goals and decomposes them into agent → strategy → pipeline sequences.

**Rationale:** Provides end-to-end orchestration from business goal to execution.

---

## ADR-024: DOM Engine

**Status:** Current  
**Date:** Sprint 17

**Decision:** DOM Engine maps HTML to structured DOM with stable selectors for patching.

**Rationale:** Content patches need stable anchor points in the DOM. Selector-based patching is deterministic and auditable.

---

## ADR-025: Homepage Engine

**Status:** Current  
**Date:** Sprint 8

**Decision:** Specialized engine for homepage detection, analysis, and optimization.

**Rationale:** Homepage has unique structure and optimization requirements. General pipeline doesn't fit.

---

## ADR-026: Content Generation — section-patch AI writers

**Status:** Current  
**Date:** Sprint 20

**Decision:** Content Generation provides section-specific AI writers (writeHero, writeFaq, etc.).

**Rationale:** Each section type has unique structure. Generic generation produces poor results.

---

## ADR-027: Brand Profile

**Status:** Current  
**Date:** Sprint 20

**Decision:** Brand Profile captures company name, tone, reading level, CTA style for AI generation.

**Rationale:** AI content must match brand voice. Without brand context, output is generic.

---

## ADR-028: Voice Detection

**Status:** Current  
**Date:** Sprint 20

**Decision:** Automatic brand voice analysis from existing content.

**Rationale:** Reduces manual configuration. Learns voice from what already exists.

---

## ADR-029: Cost Tracker

**Status:** Current  
**Date:** Sprint 19

**Decision:** Per-provider cost tracking with monthly summaries.

**Rationale:** AI costs can be significant. Tracking enables budgeting and provider comparison.

---

## ADR-030: Rate Limiter

**Status:** Current  
**Date:** Sprint 19

**Decision:** Configurable rate limiting per provider.

**Rationale:** Prevents API abuse and unexpected billing spikes.

---

## ADR-031: Retry Engine

**Status:** Current  
**Date:** Sprint 19

**Decision:** Configurable retry with exponential backoff.

**Rationale:** Transient failures are common with AI providers. Automatic retry improves reliability.

---

## ADR-032: Provider Logger

**Status:** Current  
**Date:** Sprint 19

**Decision:** Structured logging for all provider calls.

**Rationale:** Debugging, auditing, and performance analysis.

---

## ADR-033: Prompt History

**Status:** Current  
**Date:** Sprint 19

**Decision:** Execution history for all prompts.

**Rationale:** Audit trail for AI operations. Enables replay and debugging.

---

## ADR-034: Context Builder

**Status:** Current  
**Date:** Sprint 20

**Decision:** Context Builder assembles AI context from project knowledge and memory.

**Rationale:** AI needs rich context for quality generation. Centralizes context assembly.

---

## ADR-035: Project Resolver

**Status:** Current  
**Date:** Sprint 8

**Decision:** Multi-source project resolution (CLI flag → env → cwd).

**Rationale:** Flexible project selection without requiring explicit flags every time.

---

## ADR-036: Knowledge Engine

**Status:** Current  
**Date:** Sprint 9

**Decision:** Project knowledge store for SEO data, keywords, competitors.

**Rationale:** Persistent knowledge across sessions. Enables learning over time.

---

## ADR-037: Memory Engine

**Status:** Current  
**Date:** Sprint 9

**Decision:** Event-sourced memory store for project history.

**Rationale:** Full audit trail of all operations. Enables rollback and analysis.

---

## ADR-038: Preflight Validator

**Status:** Current  
**Date:** Sprint 7

**Decision:** Pre-execution validation of execution plans.

**Rationale:** Catch errors before they reach production. Safety gate before execution.

---

## ADR-039: Rollback Groups

**Status:** Current  
**Date:** Sprint 21

**Decision:** Atomic undo grouping for related patches.

**Rationale:** Partial rollbacks are dangerous. Related changes should roll back together.

---

## ADR-040: Pipeline Engine

**Status:** Current  
**Date:** Sprint 8

**Decision:** Dependency-ordered step execution with retry and skip logic.

**Rationale:** Pipelines have complex step dependencies. Manual ordering is error-prone.

---

## ADR-041: Skills Registry

**Status:** Current  
**Date:** Sprint 14

**Decision:** AI skill definitions with associated pipelines and prompts.

**Rationale:** Skills encapsulate AI capabilities. Registry enables discovery and reuse.

---

## ADR-042: Capability Detection

**Status:** Current  
**Date:** Sprint 19

**Decision:** Provider capability matrix (streaming, JSON mode, vision, etc.).

**Rationale:** Different providers support different features. Detection enables optimal provider selection.

---

## ADR-043: Fallback Logic

**Status:** Current  
**Date:** Sprint 19

**Decision:** Automatic provider fallback on failure.

**Rationale:** If primary provider fails, fallback to secondary. Improves reliability.

---

## ADR-044: Content Graph

**Status:** Current  
**Date:** Sprint 16

**Decision:** Deterministic content relationship mapping.

**Rationale:** Understands how content pieces relate without AI. Enables intelligent recommendations.

---

## ADR-045: Stable IDs

**Status:** Current  
**Date:** Sprint 16

**Decision:** Deterministic section identification based on content hash.

**Rationale:** Sections must be consistently identified across runs. Hash-based IDs are stable.

---

## ADR-046: Gap Detection

**Status:** Current  
**Date:** Sprint 16

**Decision:** Deterministic content gap analysis.

**Rationale:** Identifies missing content sections without AI. Reliable and reproducible.

---

## ADR-047: Quality Scores

**Status:** Current  
**Date:** Sprint 16

**Decision:** Deterministic content quality metrics (readability, depth, freshness, entity density).

**Rationale:** Objective quality measurement without AI bias.

---

## ADR-048: Section Detection

**Status:** Current  
**Date:** Sprint 16

**Decision:** Deterministic section classification based on HTML structure and content patterns.

**Rationale:** Sections must be classified consistently. AI would introduce non-determinism.

---

## ADR-049: Page DNA

**Status:** Current  
**Date:** Sprint 16

**Decision:** Deterministic page type and intent classification.

**Rationale:** Understanding page purpose is foundational. Must be reliable.

---

## ADR-050: Snapshot

**Status:** Current  
**Date:** Sprint 1

**Decision:** Deterministic website snapshot model.

**Rationale:** Consistent data structure for all analysis operations.

---

*All ADRs audited and re-indexed Sprint 22A. Duplicate IDs resolved. "Future Decisions" entries that were already accepted have been promoted to Current status with their own ADR numbers.*