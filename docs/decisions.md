# Architecture Decision Records

**Version:** v0.24.0 (Sprint 24)

## ADR Index

| # | Title | Status |
|---|---|---|
| 001 | Monorepo with pnpm workspaces | Current |
| 002 | TypeScript as primary language | Current |
| 003 | Vitest as test runner | Current |
| 004 | ESLint + Prettier for code quality | Current |
| 005 | Commander for CLI framework | Current |
| 006 | Cheerio for HTML parsing | Current |
| 007 | Layered architecture (analysis Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ recommendation Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ action Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ execution) | Current |
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
| 018 | Action Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â execution planning & approval queue | Current |
| 019 | Automation Policy Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â configurable auto-approval rules | Current |
| 020 | Approval Queue Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â multi-step approval workflow | Current |
| 021 | Agent Framework Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â role-specific decision agents | Current |
| 022 | Strategy Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â goal-to-pipeline translation | Current |
| 023 | Mission Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â high-level goal decomposition | Current |
| 024 | DOM Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â selector-anchored patching | Current |
| 025 | Homepage Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â specialized homepage optimization | Current |
| 026 | Content Generation Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â section-patch AI writers | Current |
| 027 | Brand Profile Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â brand-aware content generation | Current |
| 028 | Voice Detection Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â automatic brand voice analysis | Current |
| 029 | Cost Tracker Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â per-provider cost tracking | Current |
| 030 | Rate Limiter Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â provider rate limiting | Current |
| 031 | Retry Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â configurable retry with backoff | Current |
| 032 | Provider Logger Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â structured provider call logging | Current |
| 033 | Prompt History Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â execution history for prompts | Current |
| 034 | Context Builder Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â AI context assembly from knowledge & memory | Current |
| 035 | Project Resolver Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â multi-source project resolution | Current |
| 036 | Knowledge Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â project knowledge store | Current |
| 037 | Memory Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â event-sourced memory | Current |
| 038 | Preflight Validator Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â pre-execution safety checks | Current |
| 039 | Rollback Groups Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â atomic undo grouping | Current |
| 040 | Pipeline Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â dependency-ordered step execution | Current |
| 041 | Skills Registry Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â AI skill definitions | Current |
| 042 | Capability Detection Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â provider capability matrix | Current |
| 043 | Fallback Logic Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â provider fallback on failure | Current |
| 044 | Content Graph Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â deterministic content relationship mapping | Current |
| 045 | Stable IDs Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â deterministic section identification | Current |
| 046 | Gap Detection Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â deterministic content gap analysis | Current |
| 047 | Quality Scores Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â deterministic content quality metrics | Current |
| 048 | Section Detection Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â deterministic section classification | Current |
| 049 | Page DNA Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â deterministic page type & intent classification | Current |
| 050 | Snapshot Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â deterministic website snapshot model | Current |
| 051 | Optimization Orchestrator Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â centralized orchestration layer | Current |
| 052 | DOM Engine Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â Universal Page Model | Current |
| 053 | Site-level topical intelligence belongs in @forge/content-intelligence | Current |
| 054 | Elementor write bridge lives in dom-engine + providers-wordpress + CLI (no new engine, no MCP) | Current |

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

**Decision:** Architecture follows: analysis Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ recommendation Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ action Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ execution.

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

**Rationale:** Safety first Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â no accidental writes to production sites.

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

**Decision:** Mission Engine defines high-level goals and decomposes them into agent Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ strategy Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ pipeline sequences.

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

## ADR-026: Content Generation Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â section-patch AI writers

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

**Decision:** Multi-source project resolution (CLI flag Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ env Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ cwd).

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

## ADR-051: Optimization Orchestrator

**Status:** Current  
**Date:** Sprint 22B

**Decision:** Create a single `@forge/optimization-orchestrator` package that coordinates all engines (Content Intelligence, Content Generation, Review, Optimization Composer, Execution, AI Engine, Knowledge, Memory) in one deterministic workflow.

**Rationale:** Previously, engines were chained ad-hoc through pipelines, agents, or CLI scripts. This created scattered orchestration logic. Centralizing orchestration into one package provides:

1. **Deterministic state machine** Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â all valid transitions are known and enforced
2. **Shared context** Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â `OptimizationContext` carries all data produced by any engine; no engine rebuilds what another already produced
3. **Declarative workflows** Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â workflow definitions are data, not code; new workflows don't require new engine code
4. **Event system** Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â typed events consumable by Knowledge Engine, Memory Engine, future Dashboard/Scheduling without modifying orchestrator logic
5. **Runtime metrics** Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â duration, step durations, tokens, cost, patches, approvals, rejections, rollback count
6. **Engine registry** Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â engines registered by type; orchestrator resolves via registry instead of importing directly

**Why not pipelines?** Pipelines are for data processing steps (read Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ analyze Ä‚Ë˜Ã¢Â€Â Ã¢Â€Â™ recommend), not for coordinating multiple independent engines with a lifecycle state machine.

**Why not agents?** Agents are decision-makers (SEOAgent, ContentAgent), not orchestrators. Agents produce strategy; orchestrators execute strategy.

**Constraints:**
- Provider-independent Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â never imports `providers-wordpress`
- Never generates content Ä‚Ë˜Ã¢Â‚Å¹Ã¢Â€Â delegates to `content-generation`
- Never knows WordPress, Elementor, or any CMS-specific concept

*All ADRs audited and re-indexed Sprint 22A. Duplicate IDs resolved. "Future Decisions" entries that were already accepted have been promoted to Current status with their own ADR numbers.*

---

## ADR-052: DOM Engine & Universal Page Model

**Status:** Current  
**Date:** Sprint 23

**Decision:** Establish `@forge/dom-engine` as the canonical website parser. It transforms raw HTML into a Universal Page Model (Page Ã¢Â†Â’ Regions Ã¢Â†Â’ Sections Ã¢Â†Â’ Blocks Ã¢Â†Â’ Elements Ã¢Â†Â’ Text Nodes Ã¢Â†Â’ Attributes Ã¢Â†Â’ Selectors). Everything that reads or writes HTML must use it Ã¢Â€Â” no other package parses HTML directly.

**Rationale:** HTML parsing, DOM traversal, selector generation, and section extraction logic was scattered across multiple packages (tools, content-intelligence, homepage-engine, optimization-orchestrator). This created duplicated, inconsistent parsing. Centralizing into one package provides:

1. **Single source of truth** Ã¢Â€Â” one parser, one page model, one set of selectors
2. **Builder detection** Ã¢Â€Â” Elementor (containers, sections, widgets), Gutenberg (blocks), Classic Editor, Bricks
3. **Stable IDs** Ã¢Â€Â” deterministic IDs for every region, section, block, element, text node; stable across repeated analyses
4. **Deterministic selectors** Ã¢Â€Â” CSS selector, XPath, DOM path, stable Forge selector, section/block/attribute selectors
5. **Region detection** Ã¢Â€Â” Header, Hero, Navigation, Breadcrumb, Main, Sidebar, Footer, Popup, Modal, Sticky, Hidden, Template parts
6. **Semantic classification** Ã¢Â€Â” Hero, Benefits, Services, Products, Features, Testimonials, FAQ, Comparison, CTA, Pricing, Contact, About, Blog, etc.
7. **DOM diff engine** Ã¢Â€Â” added/removed/modified/moved nodes, attribute changes, structural changes
8. **Rich text model** Ã¢Â€Â” canonical editing model for headings, paragraphs, lists, tables, links, buttons, inline formatting, images, embeds
9. **Rich text patches** Ã¢Â€Â” replace/insert/delete paragraph, heading, button text, CTA, list, table, image alt, caption, widget text, HTML block, shortcode content
10. **DOM validation** Ã¢Â€Â” broken nesting, invalid heading order, duplicate IDs, empty sections, hidden content, broken images, malformed lists/tables, missing landmarks, invalid ARIA

**Why not keep parsing in each package?** Duplicated parsing creates inconsistent results, divergent selectors, and maintenance burden. A single canonical parser ensures every consumer (Review, Execution, WordPress writes, Diff engine, Rollback) uses the same page model.

**Constraints:**
- 100% deterministic Ã¢Â€Â” no AI, no network, no provider calls
- Provider-independent Ã¢Â€Â” never imports providers-wordpress
- Never imports execution-engine, content-generation, homepage-engine
- No dashboards, scheduling, analytics, cloud sync, databases, autonomous execution, or new AI features

---

## ADR-053: Site-level topical intelligence belongs in @forge/content-intelligence

**Status:** Current
**Date:** Sprint 24

**Decision:** Site-level topical intelligence — Site Content Model, topic graph, topic clusters, authority/coverage scoring, content opportunities, refresh detection, and internal link opportunities — lives inside `@forge/content-intelligence` under `src/site/`. It is an extension of the existing package, NOT a new engine (no `@forge/topic-engine`).

**Rationale:**

1. **Same layer, same guarantees.** Site-level intelligence is the same category of work as page-level intelligence: deterministic content understanding with zero AI. It shares the exact same inputs (WebsiteSnapshot, PageDNA, ContentGraph, sections, quality scores), the same constraints (no AI, no network, no providers, no persistence), and the same consumers. A separate package would duplicate the dependency rules, the deterministic guarantees, and the testing surface.

2. **Composition over duplication.** Site-level analysis is built by composing the existing PageDNA / ContentGraph / gap / quality outputs across pages. Keeping it in the same package lets it import those models directly without crossing package boundaries or re-exporting internals through a public API.

3. **One intelligence package, one entry point.** `analyzeSite()` is the natural sibling of `buildPageDNA()`. Consumers (CLI, pipeline-engine, optimization-orchestrator) already depend on `@forge/content-intelligence`; a new package would add a dependency edge to every consumer for no architectural benefit.

4. **Consolidation is the priority near MVP.** SEO Forge is approaching MVP. Adding `@forge/topic-engine` would be exactly the "capability with a new name → new engine" anti-pattern this sprint prohibits. The requirement is a working end-to-end product and architectural consolidation, not more packages.

**How site-level intelligence differs (and why it still belongs here):**

- It aggregates across pages (topics, entities, links, quality) — but aggregation is a function of the same deterministic models.
- It introduces topic clusters and authority scores — but these are deterministic compositions of existing topics/entities/sections/links, explicitly labeled as heuristic diagnostic scores, not semantic AI understanding.
- It detects opportunities and refresh candidates — but it extends the existing `detectGaps` concept; page-level gaps remain owned by `gap/`, site-level opportunities reference the underlying PageDNA/quality/section findings.

**Boundaries:**

- `src/site/` never parses HTML — it consumes the `@forge/dom-engine` Universal Page Model shape (`UniversalPageLike`) and the existing detectors.
- `src/site/` never persists — it consumes the existing knowledge/memory shapes structurally and emits `site-analysis` events that the existing memory system records.
- `src/site/` is intelligence/planning only — no generation, no link modification, no scheduling, no provider writes. Downstream execution stays in the existing Optimization Composer / Review / Execution architecture.


---

## ADR-054: Elementor write bridge lives in dom-engine + providers-wordpress + CLI (no new engine, no MCP)

**Status:** Current
**Date:** Sprint 25

**Decision:** Establish a safe, provider-aware Elementor/WordPress write path by extending existing packages — `@forge/dom-engine` (provider-neutral Elementor document layer), `@forge/providers-wordpress` (transport + companion endpoint), and the CLI composition root (bridge). No `@forge/elementor-engine` or similar package is created, and no Elementor MCP is introduced.

**Rationale:**

1. **Rendered HTML is not Elementor's source of truth.** Elementor stores page structure as structured JSON in the private `_elementor_data` post meta. Editing rendered HTML and sending it back could destroy Elementor structure. The bridge reads the Elementor document, mutates only approved settings on a clone, and writes the whole document atomically with optimistic concurrency.

2. **Direct REST access is not safely available.** `_elementor_data` is private meta, not exposed by the standard wp/v2 REST API. SEO Forge therefore uses a minimal optional companion plugin (Path C) that exposes a controlled, authenticated endpoint and saves through Elementor's native document API (Path D). This is provider-specific and stays inside `@forge/providers-wordpress`.

3. **No Elementor MCP.** None existed in the repository and none is required. SEO Forge works independently of whichever coding agent develops it. The provider abstraction is the source of truth.

4. **Consolidation over new engines.** The Elementor document model is the same category of work dom-engine already owns (parsing, targeting, patching). The transport is the same category of work providers-wordpress already owns (REST, auth, provider-specific APIs). The bridge needs both plus the execution chain, so it lives in the CLI composition root — which already depends on all three packages. A separate bridge package would add a dependency edge to every consumer for no architectural benefit. dom-engine's manifest was also cleaned up during Sprint 25 follow-up: its unused workspace dependencies (`@forge/ai-engine`, `content-generation`, `core`, `execution-engine`, `knowledge-engine`, `prompt-registry`, `review-engine`) were removed so the manifest now matches its actual imports (`@forge/content-intelligence`, `cheerio`).

**Architectural boundaries:**
- Generic packages must not know WordPress REST endpoints, `_elementor_data` meta names, Elementor widget internals, or WordPress post IDs. dom-engine knows Elementor JSON structure and widget settings (format knowledge); providers-wordpress knows endpoints and meta names (provider knowledge).
- All writes still pass through the existing Review → Optimization Composer → Execution Engine → Provider chain; there is no AI → WordPress or Generation → WordPress path.
- Stale patches are rejected (`PATCH_STALE`); dry-run performs zero remote mutations; writes are verified by re-read; rollback restores the exact original document.
