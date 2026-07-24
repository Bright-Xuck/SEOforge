# Forge Architectural Decisions

**Version:** 1.0.0  
**Status:** Active  
**Owner:** Bright Ndode

---

# Purpose

This document records every significant architectural and technical decision made throughout the lifetime of Forge.

The purpose is not to document _what_ the project uses, but _why_ those choices were made.

Every future contributor should understand the reasoning behind a decision before proposing changes.

If an existing decision becomes obsolete, do not delete it.

Instead:

- Mark it as Superseded
- Reference the replacement decision
- Record why the change occurred

This document is a historical record.

---

# Decision Status

Each decision must have one of the following statuses:

- Proposed
- Accepted
- Superseded
- Deprecated
- Rejected

---

# Decision Template

Every new decision must follow this format.

---

## Decision

### ID

ADR-XXXX

### Title

Short descriptive title.

### Status

Accepted

### Date

YYYY-MM-DD

### Owner

Person responsible.

---

### Context

What problem exists?

Why is a decision required?

---

### Decision

Describe the chosen solution.

---

### Alternatives Considered

List every realistic alternative.

Explain why each was rejected.

---

### Consequences

Positive consequences.

Negative consequences.

Tradeoffs.

---

### Future Review

When should this decision be reconsidered?

---

# Accepted Decisions

---

## ADR-0001

### Title

Use TypeScript Across The Entire Codebase

### Status

Accepted

### Date

2026-07-14

### Context

Forge will become a large multi-package project.

Static typing reduces maintenance cost.

---

### Decision

All production source code will be written in TypeScript using strict mode.

JavaScript is permitted only where tooling requires it.

---

### Alternatives

JavaScript

Rejected.

Lack of type safety.

Lower maintainability.

---

### Consequences

Pros

- Better tooling
- Better refactoring
- Strong typing
- Improved developer experience

Cons

- Slightly slower initial development

---

## ADR-0002

### Title

Monorepo Architecture

### Status

Accepted

### Date

2026-07-14

### Context

Forge will eventually contain multiple applications.

---

### Decision

Forge will use a pnpm workspace monorepo.

Applications and packages will live inside one repository.

---

### Alternatives

Multiple repositories.

Rejected.

Would duplicate configuration.

Harder dependency management.

---

### Consequences

Pros

- Shared packages
- Shared tooling
- Easier refactoring

Cons

- Larger repository

---

## ADR-0003

### Title

Package Manager

### Status

Accepted

### Date

2026-07-14

### Decision

pnpm will be used.

---

### Alternatives

npm

Yarn

Rejected.

pnpm offers:

- faster installs
- better disk usage
- strict dependency isolation
- excellent monorepo support

---

## ADR-0004

### Title

Repository Build System

### Status

Accepted

### Date

2026-07-14

### Decision

Turborepo will orchestrate builds, linting, testing and task execution.

---

### Alternatives

Nx

Lerna

Custom scripts

Rejected.

Turborepo provides a simpler developer experience.

---

## ADR-0005

### Title

Platform Independence

### Status

Accepted

### Decision

Forge Core must never depend directly on WordPress.

WordPress is a plugin.

---

### Reason

Future support includes:

- Shopify
- Ghost
- Webflow
- Static websites

---

## ADR-0006

### Title

AI Provider Independence

### Status

Accepted

### Decision

Business logic communicates only through provider interfaces.

No provider SDK may appear outside the AI package.

---

### Supported Providers

- Ollama
- LM Studio
- OpenRouter
- Claude
- Gemini
- OpenAI

---

## ADR-0007

### Title

Human Approval Required

### Status

Accepted

### Decision

Forge never publishes website changes automatically.

All production modifications require explicit approval.

---

### Reason

Protects client websites.

Prevents accidental changes.

Maintains trust.

---

## ADR-0008

### Title

Capabilities Instead of Agents

### Status

Accepted

### Decision

Forge uses Capabilities.

Not Agents.

Examples

Homepage Analysis

Accessibility

Schema Validation

Content Review

Technical Audit

---

### Reason

Capabilities are implementation independent.

A capability may use:

- Rules
- AI
- Machine Learning
- Static Analysis

without changing terminology.

---

## ADR-0009

### Title

AI Is Optional

### Status

Accepted

### Decision

Forge must remain useful without an LLM.

Capabilities should use deterministic logic whenever possible.

AI enhances reasoning.

It should not replace algorithms.

---

## ADR-0010

### Title

Prompt Registry

### Status

Accepted

### Decision

Prompts are versioned assets.

Prompts are never embedded inside source files.

---

## ADR-0011

### Title

Local AI First

### Status

Accepted

### Decision

Default AI provider:

Ollama.

Cloud providers remain optional.

Forge must function entirely offline whenever practical.

---

## ADR-0012

### Title

CLI Before Dashboard

### Status

Accepted

### Decision

Initial interaction happens through a CLI.

The dashboard will be introduced after core functionality is stable.

---

### Reason

Allows faster iteration.

Reduces UI distractions.

Improves architecture.

---

## ADR-0013

### Title

Reports Are Outputs

### Status

Accepted

### Decision

Reports never contain business logic.

Reports render structured data.

Analysis belongs elsewhere.

---

## ADR-0014

### Title

Small Incremental Sprints

### Status

Accepted

### Decision

Large implementations are prohibited.

Every sprint should produce a working increment.

---

## ADR-0015

### Title

Explainable Recommendations

### Status

Accepted

### Decision

Every recommendation must include:

- Evidence
- Reason
- Expected Impact
- Confidence
- Risk
- Rollback Strategy

Forge never produces unexplained recommendations.

---

## ADR-0018

## Title

Action Engine for Execution Planning

## Status

Accepted

## Date

2026-07-15

## Owner

Bright Ndode

---

### Context

Recommendations identify issues but do not specify how to execute fixes. Forge needs an execution planning layer that transforms recommendations into concrete, testable actions with risk classification and rollback capability.

---

### Decision

Create `@forge/action-engine` package with:

- `Action` model containing all execution metadata
- `ExecutionPlan` model grouping actions with summary
- Deterministic mapping from Recommendation to Action
- Risk classification based on action type
- No execution - planning only (consistent with Sprint 5 scope)

---

### Consequences

Positive:

- Clear separation between recommendations and execution
- Deterministic planning enables testing without side effects
- Risk classification supports approval workflows

Negative:

- Additional abstraction layer to maintain

---

# ADR-0019

## Title

Automation Policy Engine

## Status

Accepted

## Date

2026-07-15

## Owner

Bright Ndode

---

### Context

Different actions have different risk levels. Some actions (missing alt text, meta description) are safe to auto-execute. Others (slug changes, content rewrites) require human approval. A deterministic policy engine is needed to classify risk.

---

### Decision

Create a policy engine with:

- Configurable risk rules per finding type
- Default policies that can be overridden
- Safe: Missing Alt Text, Missing Meta Description, Missing Open Graph
- Moderate: Missing Canonical, Empty Anchor Text
- High: Title modifications
- Critical: Content rewrites, slug changes
- Policies declared in JSON format

---

### Consequences

Positive:

- Deterministic, testable risk classification
- Configurable policies
- Clear approval boundaries

Negative:

- Policies must be maintained as new action types are added

---

# ADR-0020

## Title

Approval Queue System

## Status

Accepted

## Date

2026-07-15

## Owner

Bright Ndode

---

### Context

High-risk actions require human review before execution. A persistent, auditable approval queue is needed to track pending, approved, rejected, and expired actions.

---

### Decision

Create an approval queue with:

- `ApprovalItem` model with action reference, reason, risk level
- Status tracking: pending, approved, rejected, expired
- Optional preview field for user review
- In-memory implementation (persistence comes later)

---

### Consequences

Positive:

- Clear audit trail
- User control over risky actions
- Configurable timeouts

Negative:

- Additional user interaction step

---

# ADR-0021

## Title

Project Memory Models

## Status

Accepted

## Date

2026-07-15

## Owner

Bright Ndode

---

### Decision

Create project memory types only (no implementation in Sprint 5):

- `ProjectContext`: site settings, brand voice, target audience, goals
- `WebsiteMemory`: crawl history, analysis history, recommendation history

---

### Consequences

Positive:

- Enables future learning features
- Type safety across memory operations
- Clear data model for memory layer

Negative:

- Types may evolve as requirements clarify

---

# ADR-0022

## Title

Action Provider Extension

## Status

Accepted

## Date

2026-07-15

## Owner

Bright Ndode

---

### Context

The plugin registry needs to support action providers - plugins that can execute specific action types on specific platforms (WordPress, Shopify, etc.).

---

### Decision

Add `ActionProvider` interface to plugin registry:

- `supportedActions` array declaring capabilities
- `supportedPlatforms` array for target platforms
- Version information
- Integrated with existing `Plugin` interface

---

### Consequences

Positive:

- Unified plugin system
- Clear action-provider mapping
- Platform independence preserved

Negative:

- Slight increase in plugin interface complexity

---

## ADR-0023

### Title

Pipeline-First Workflow Orchestration

### Status

Accepted

### Date

2026-07-17

### Owner

Bright Ndode

---

### Context

Forge had hardcoded orchestration spread across the CLI and execution helpers. Sprint 8 requires reusable workflows, step registration, dependency resolution, and a single orchestration layer that can run existing capabilities without duplicating business logic.

### Decision

Add a pipeline layer with reusable pipeline definitions, sequential execution, dependency resolution, shared execution context, pipeline events, and registry support for pipelines and steps.

Existing command flows should delegate to pipeline execution helpers instead of directly coordinating multiple engines.

### Alternatives Considered

Keeping the existing command-by-command orchestration. Rejected because it keeps workflow logic duplicated and hardcoded.

Moving business logic into the pipeline engine. Rejected because the engine must remain domain-agnostic.

### Consequences

Positive:

- Removes hardcoded orchestration from the CLI
- Makes workflows reusable and inspectable
- Keeps business logic inside existing packages

Negative:

- Adds one more abstraction layer to maintain

### Future Review

Revisit after the first non-CLI pipeline consumers exist, such as scheduling or dashboard subscribers.

---

## ADR-0024

### Title

Separate Knowledge From Memory

### Status

Accepted

### Date

2026-07-17

### Owner

Bright Ndode

---

### Context

Sprint 9 introduces persistent project knowledge and historical event memory. Forge needs a stable way to model slow-changing facts separately from event timelines so future AI systems can reason over both without conflating them.

### Decision

Create a knowledge layer for persistent project facts and a memory layer for append-only historical events. The knowledge layer stores brand, industry, products, services, keywords, plugins, structure, and other durable site facts. The memory layer stores crawls, analyses, recommendations, validations, executions, approvals, rejections, and pipeline events.

Both layers are persisted behind JSON-based storage interfaces for now.

### Alternatives Considered

Keeping one combined store. Rejected because it makes stable facts and event history harder to reason about and update independently.

Moving directly to a database. Rejected for Sprint 9 because JSON storage is simpler, testable, and sufficient for the current stage.

### Consequences

Positive:

- clear separation of stable and volatile project data
- easier future database migration
- keeps AI consumers decoupled from storage details

Negative:

- two storage abstractions instead of one

### Future Review

Revisit when the project needs multi-user sync, query indexing, or cross-project analytics.

---

## ADR-0025

### Title

AI Skills Platform and Provider Isolation

### Status

Accepted

### Date

2026-07-17

### Owner

Bright Ndode

---

### Context

Sprint 10 introduces AI capabilities, but Forge should not hardcode providers or let AI touch raw HTML. The platform needs a provider-agnostic orchestration layer and reusable skills that operate on structured context only.

### Decision

Create an AI engine to orchestrate generic providers, define skill contracts with structured inputs/outputs and output validation, and store prompts in a dedicated prompt registry. AI providers remain adapters only.

### Consequences

Positive:

- provider independence is preserved
- skills remain reusable pipeline steps
- prompts are versioned and testable

Negative:

- additional abstraction layers to maintain

### Future Review

Revisit when adding multi-step agentic reasoning or provider-specific optimization.

---

## ADR-0018

### Title

Hardening Pass for Sprint 10 AI Layer

### Status

Accepted

### Date

2026-07-17

### Owner

Bright Ndode

---

### Context

Sprint 10 shipped the AI skills layer, but the first implementation used a few shortcuts to move quickly: implicit project defaults, raw context handoff, unstructured prompt definitions, and weak provider capability checks.

### Decision

Add explicit project resolution, a structured AI context builder, a versioned prompt registry, declared provider capabilities, and typed AI-specific errors before adding any more AI features.

### Consequences

Positive:

- hidden defaults are removed
- prompt and skill metadata become testable
- provider and skill contracts are clearer

Negative:

- a few extra packages and abstractions to maintain

### Future Review

Revisit when Forge adds multi-provider routing or mission-level orchestration.

---

## ADR-0019

### Title

Introduce an Agent Framework Above Pipelines and Skills

### Status

Accepted

### Date

2026-07-17

### Owner

Bright Ndode

---

### Context

Forge now has reusable pipelines and focused skills. The next architectural layer is a deterministic agent layer that can choose which pipeline to run based on project context, findings, and memory without calling providers directly.

### Decision

Add an agent engine with explicit agent metadata, deterministic decision policies, a registry for validation and lookup, and a CLI surface for inspecting and running agents. Agents orchestrate pipelines only.

### Consequences

Positive:

- decision-making is separated from execution
- agents stay provider-independent
- the CLI can expose mission-level orchestration without new runtime complexity

Negative:

- another orchestration layer to maintain

### Future Review

Revisit when Forge introduces autonomous reasoning or scheduling.

---

## ADR-0020

### Title

Introduce a Strategy Engine Between Agents and Pipelines

### Status

Accepted

### Date

2026-07-17

### Owner

Bright Ndode

---

### Context

Agents currently choose pipelines directly, which is too coarse for mission-level orchestration. Forge needs an intermediate strategy layer that can capture objectives, selected pipelines, selected skills, estimates, risk, and approval requirements before execution.

### Decision

Add a strategy engine that converts agent context into strategies. Pipelines become the execution layer for strategies, and strategies become the serializable, validated unit of planning.

### Consequences

Positive:

- the orchestration chain becomes Mission → Agent → Strategy → Pipeline → Skill → Provider
- execution plans gain richer metadata and validation
- strategy state can be stored and replayed from memory

Negative:

- more domain objects and transformation code to maintain

### Future Review

Revisit when Forge introduces autonomous agent reasoning or external scheduling.

---

## ADR-0026

### Title

Introduce a Mission Engine Above Agents and Strategies

### Status

Accepted

### Date

2026-07-17

### Owner

Bright Ndode

### Context

Sprint 12 introduced strategies as the planning unit between agents and pipelines, but the user-facing orchestration layer still needed a place to represent full missions, mission templates, and mission lifecycle history without collapsing everything into a single strategy object.

### Decision

Add `@forge/mission-engine` as a library-first orchestration layer above agents and strategies. Missions own templates, planning, execution order, summaries, and lifecycle memory events. The mission layer coordinates existing agents and strategies rather than replacing them.

### Alternatives Considered

Extending the strategy engine to cover mission templates and lifecycle events. Rejected because strategies are execution plans, not user-level missions.

Keeping mission orchestration only inside the CLI. Rejected because mission planning should be reusable by future apps and automation surfaces.

### Consequences

Positive:

- mission planning becomes reusable and testable
- user-facing workflows can be expressed as named templates
- mission history can be tracked separately from strategy history

Negative:

- one more orchestration package to maintain

### Future Review

Revisit when mission execution needs persistence, scheduling, or remote job execution.

---

## ADR-0027

### Title

Introduce a Safe WordPress Write Provider

### Status

Accepted

### Date

2026-07-17

### Owner

Bright Ndode

### Context

Sprint 14 transitions Forge from read-only inspection to approval-gated website modification. WordPress writes must remain isolated in the provider layer, with execution and missions calling interfaces rather than REST APIs directly.

### Decision

Extend the WordPress provider with write operations for content, SEO, media, schema, taxonomy, redirects, preview, and rollback. Add structured write results, diffs, and revision references. Keep execution provider-agnostic and preserve read-only compatibility.

### Alternatives Considered

Placing WordPress REST calls in the execution engine. Rejected because provider logic must stay inside the provider package.

Implementing writes only as CLI-specific behavior. Rejected because the write capability must be reusable by missions and future apps.

### Consequences

Positive:

- approved writes can be executed safely
- rollback and preview become first-class
- content editing can evolve toward section-level operations later

Negative:

- the provider API surface becomes significantly larger

### Future Review

Revisit when section-level content editing and richer revision APIs are needed.

---

## ADR-0028

### Title

Introduce a Deterministic Homepage Optimization Vertical Slice

### Status

Accepted

### Date

2026-07-17

### Owner

Bright Ndode

### Context

Sprint 15 is Forge's first production-ready vertical slice. The platform needs a deterministic homepage workflow that detects the homepage, analyzes it, generates an optimization plan, previews proposed changes, and executes only after approval.

### Decision

Add a homepage optimization layer that remains provider-independent and non-AI. The layer should expose homepage detection, homepage analysis, optimization planning, preview objects, and mission integration for homepage optimization workflows.

### Alternatives Considered

Extending the general audit pipeline only. Rejected because this sprint needs a dedicated end-to-end homepage workflow.

Using AI for homepage optimization. Rejected because Sprint 15 explicitly forbids AI generation.

### Consequences

Positive:

- first production slice becomes concrete and testable
- homepage workflows get their own deterministic analysis and planning model
- preview-first design reduces risk before execution

Negative:

- another domain-specific layer to maintain

### Future Review

Revisit when Sprint 16 introduces content intelligence and richer section-level generation.

---

# Future Decisions

## ADR-0029

### Title

Introduce a Deterministic Content Intelligence Engine

### Status

Accepted

### Date

2026-07-19

### Owner

Bright Ndode

### Context

Forge must understand website content before AI is allowed to modify it. Sprint 15 delivered a deterministic homepage optimization slice, but the platform still lacked a general, reusable content-understanding layer that future AI generation could depend on. Without it, every future content skill would re-parse raw HTML and re-derive page structure, duplicating logic and producing inconsistent understanding.

### Decision

Add `@forge/content-intelligence` (v0.16.0) as a deterministic, offline content-understanding package. It consumes a `WebsiteSnapshot` (re-parsing `rawHtml` with Cheerio) and produces structured intelligence: page type, search intent, audience profile, section inventory, entity extraction, topic extraction, a Content Graph (Page → Section → Block → Paragraph → Sentence), a Page DNA aggregate, deterministic quality scores, and content-gap detection.

The package must never import AI providers, the Prompt Registry, skill packages, or LLM SDKs. It generates no text and rewrites no content. It is a building block consumed by future Missions, Agents, Strategies, Skills, and the Homepage Engine.

The new understanding flow is:

```text
Website → DOM → Content Intelligence → Page DNA → Content Graph → Optimization Plan → Content Generation (future)
```

### Alternatives Considered

Using an LLM for entity extraction and section classification. Rejected because Sprint 16 explicitly forbids AI, requires determinism, and must work fully offline. A gated, optional LLM enrichment layer may be added later without violating this decision (consistent with ADR-0009).

Building the understanding logic directly inside the Homepage Engine and Skills. Rejected because it would duplicate logic and prevent reuse; a shared package keeps the orchestration chain clean (Mission → Agent → Strategy → Pipeline → Skill → Provider).

### Consequences

Positive:

- a single, testable, deterministic source of content understanding
- reusable pipeline steps (Content Analysis, Content Graph, Page DNA, Gap Detection, Entity Extraction)
- Homepage Engine can enrich its analysis additively without breaking existing output shapes
- clear boundary: understanding is separated from generation

Negative:

- an additional package and abstraction layer to maintain
- entity extraction is heuristic-only (no NER) and limited in accuracy
- double HTML parsing (html-parser plus content-intelligence re-parse of rawHtml)

### Future Review

Revisit when a consumer needs historical Page DNA comparison (add persistence/migration), or when an optional gated LLM enrichment layer is justified.

---

## ADR-0030

### Title

Introduce a Section-Scoped Content Generation Engine

### Status

Accepted

### Date

2026-07-20

### Owner

Bright Ndode

### Context

Sprint 17 introduces Forge's first AI-powered content generation layer. The platform already has deterministic Content Intelligence (Sprint 16) as the source of truth. The risk is that AI generation could bypass understanding, rewrite entire pages blindly, or bypass the Prompt Registry and AI Engine. Generation must be scoped, reviewable, and additive.

### Decision

Add `@forge/content-generation` (v1.7.0-beta.1) as a section-scoped generation layer. It consumes Content Intelligence (Page DNA + Content Graph), builds prompts via a dedicated Prompt Builder, calls AI providers through the existing AI Engine, validates output for content safety, and emits self-contained `ContentPatch` + `SectionDiff` + `Preview` artifacts.

Hard rules:

- AI generates only targeted section improvements, never a whole-page rewrite.
- Content Intelligence is the source of truth; generation never bypasses it.
- Prompts are composed via the Prompt Builder from registry-backed `PromptDefinition`s — never manual string concatenation.
- AI providers are reached only through the AI Engine.
- Every output becomes a `ContentPatch`.
- No execution, no publishing, no WordPress writes in Sprint 17 (Sprint 18 handles review & apply).

### Alternatives Considered

Whole-page generation. Rejected because it is high-risk, hard to review, and violates the section-scoped policy.

Embedding prompts directly in generators. Rejected because it bypasses the Prompt Registry (ADR-0010) and breaks versioning/testability.

### Consequences

Positive:

- generation is scoped, reviewable, and diffable
- prompts stay versioned and testable
- clear boundary between understanding and generation

Negative:

- an additional package and abstraction layer to maintain
- providers remain mocked in Sprint 17 (real swap deferred)

### Future Review

Revisit in Sprint 18 when adding visual review, approval queue, and execution wiring.

---

## ADR-0031

### Title

Section-Level AI Policy — No Whole-Page Rewrites

### Status

Accepted

### Date

2026-07-20

### Owner

Bright Ndode

### Context

AI content generation must improve websites without destroying existing structure or surprising the user. A whole-page rewrite is hard to review, risky to approve, and contradicts Forge's explainability principle (ADR-0015).

### Decision

All AI generation operates at the section level. A generator receives a single `SectionInfo` plus Page DNA, Project Context, Knowledge, Memory, Mission context, Brand, target keyword, intent, and audience. It returns a `GeneratedSection` describing the current and proposed section, the reason, expected SEO impact, confidence, warnings, and estimated token cost. The system never produces a full-page replacement.

### Alternatives Considered

Page-level generation with selective application. Rejected because it is harder to review and contradicts the section-scoped policy.

### Consequences

Positive:

- every change is explainable and reviewable
- lower risk of destructive edits
- aligns with ADR-0007 (human approval required)

Negative:

- some cross-section improvements (e.g., global tone) are out of scope for Sprint 17

### Future Review

Revisit if a future mission explicitly requires coordinated multi-section generation.

---

## ADR-0032

### Title

Brand Profile Contracts in Core, Storage in Knowledge

### Status

Accepted

### Date

2026-07-20

### Owner

Bright Ndode

### Context

The content generation engine needs brand voice, tone, guidelines, audience, values, and constraints to generate on-brand content. These types must be shared across packages, but the actual brand profiles are project-specific knowledge.

### Decision

Define brand profile contracts (`BrandProfile`, `BrandVoice`, `BrandTone`, `BrandGuidelines`, `BrandAudience`, `BrandValue`, `BrandConstraint`) in `@forge/core` as interfaces only. Store actual brand profiles in the Knowledge layer (`projects/<project>/knowledge/brand.json`) via `knowledge-engine`. The generator asks the Knowledge Engine for the brand profile and never loads the JSON file directly.

### Alternatives Considered

Putting brand types inside content-generation. Rejected because brand is cross-cutting and belongs in core contracts.

Putting brand storage inside content-generation. Rejected because storage belongs to the Knowledge layer (ADR-0024).

### Consequences

Positive:

- brand contracts are shared and stable
- storage stays in the knowledge layer
- generators remain decoupled from file I/O

Negative:

- core gains a small set of brand interfaces

### Future Review

Revisit when brand profiles need versioning or multi-brand support.

---

## ADR-0033

### Title

Review Engine Package and Deterministic Approval Policy

### Status

Accepted

### Date

2026-07-21

### Owner

Bright Ndode

### Context

Sprint 17 emits candidate `ContentPatch` artifacts but has no gate before Execution. Without a review layer, generated content could reach WordPress without human approval, and AI could implicitly make approval decisions. We need a deterministic review/approval layer that sits between Content Generation and Execution, enforces "nothing reaches WordPress until it has passed through Review," and guarantees AI never approves or overrides a reviewer.

### Decision

Create `packages/review-engine` (`@forge/review-engine`, v0.18.0) as the review/approval layer. The package is **deterministic and provider-independent**: it contains **no LLM calls** and **must never import** `ai-engine`, `skills`, or `prompt-registry`. Approval is driven by deterministic policies (Strict, Balanced, Automatic, Enterprise) and explicit reviewer decisions; the Automatic policy may only auto-approve low-risk, high-confidence, policy-passing patches. `compareContent()` is a pure function with no network, randomness, or AI. Sessions persist under `projects/<project>/reviews/{active,completed}/<sessionId>.json` with a lightweight `index.json`. `forge homepage optimize` stops at a Review Session rather than executing. `forge review apply` has **no `--force`** flag — it verifies completion + policy, builds an `ExecutionPlan` from approved patches, and hands off to the Execution Engine, which decides dry-run vs real.

### Alternatives Considered

Embedding review inside Content Generation. Rejected because it would blur the one-way dependency and let generation depend on reviewer state.

Letting the Execution Engine perform approval. Rejected because approval is a distinct concern and Execution must remain a pure executor.

Adding a `--force` flag to `review apply`. Rejected because it would bypass the completion/policy gate and violate "nothing reaches WordPress until reviewed."

### Consequences

Positive:

- a single deterministic gate before any WordPress write
- AI is provably excluded from approval decisions
- reviewer state is explicit, persisted, and auditable
- homepage optimization is safely preview-first

Negative:

- an additional package and pipeline steps to maintain
- reviewers must act before any execution can occur

### Future Review

Revisit when a visual review UI, scheduling, or background workers are introduced (Sprint 19+).

---

Examples of future ADRs include:

- Database Selection
- Memory Architecture
- Plugin SDK
- Authentication
- Cloud Synchronization
- Marketplace
- Desktop Application
- VS Code Extension
- Multi-user Support
- Distributed Execution


## ADR-0016

### Title

Reconcile Package Structure Between architecture.md and project-structure.md

### Status

Superseded

Resolved By: ADR-0017

### Date

2026-07-14

### Owner

Bright Ndode

---

### Context

`architecture.md` (v1.1) defines a package structure using `domain`, `application`, `uwm`, `ai-providers`, `vision-providers`, `crawler`, `prompts`, `apps/web`, `apps/worker`. `project-structure.md` defines a different structure using `core`, `config`, `logger`, `ai`, `tools`, `skills`, `providers`, `workflows`, `memory`, `reports`, `shared`, `apps/cli`, `apps/dashboard`, `apps/desktop` plus top-level `prompts/` and `reports/` folders. Sprint 1 was implemented using `project-structure.md` as the source of truth because it is more granular and sprint-1.md explicitly names the packages `core`, `config`, `logger`, `shared`, `apps/cli`.

---

### Decision

Sprint 1 follows `project-structure.md` naming and organization. Before Sprint 2 begins, `architecture.md` and `project-structure.md` must be reconciled into a single authoritative structure document. The reconciled version should explicitly map to sprint deliverables.

---

### Alternatives Considered

Following `architecture.md`'s structure for Sprint 1. Rejected because sprint-1.md explicitly names packages that match `project-structure.md`.

Creating a new authoritative structure document immediately. Deferred to Sprint 2 planning to avoid blocking foundation work.

---

### Consequences

Positive: Sprint 1 is unambiguous and can proceed without structural decisions blocking implementation.

Negative: The repository must undergo a structural reconciliation pass before Sprint 2, which may result in folder renames or moves.

---

### Future Review

Resolved by ADR-0017.

---

## ADR-0017

### Title

Adopt project-structure.md as the Single Source of Truth for Package Layout

### Status

Accepted

### Date

2026-07-15

### Owner

Bright Ndode

---

### Context

ADR-0016 identified a conflict between `architecture.md` (which uses conceptual names like `domain`, `crawler`, `uwm`, `apps/web`) and `project-structure.md` (which uses implementation names like `core`, `tools`, `apps/cli`). Sprint 1 was built to `project-structure.md`. Sprint 2 requires a resolved, consistent structure before adding `packages/tools`.

---

### Decision

`project-structure.md` is the authoritative document for all package layout, folder organization, and dependency boundary decisions. `architecture.md` remains authoritative for conceptual design (UWM, Skill contract, Orchestrator, Explainability, provider independence) but its package names are strategic sketches that map onto the real layout as follows:

| architecture.md concept             | Actual package (project-structure.md)                                          |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `domain`                            | `packages/core`                                                                |
| `crawler`                           | `packages/tools/website-reader`                                                |
| `uwm`                               | `packages/core` (UWM types live in core until a separate package is justified) |
| `ai-providers` / `vision-providers` | `packages/ai` (future)                                                         |
| `skills`                            | `packages/skills` (future)                                                     |
| `application` (Orchestrator)        | `packages/workflows` (future)                                                  |
| `prompts`                           | top-level `prompts/` (both agree)                                              |

No existing packages are renamed. Future packages follow `project-structure.md` naming.

---

### Alternatives Considered

Adopting `architecture.md`'s structure. Rejected because Sprint 1 is already built to `project-structure.md` and renaming would create churn without value.

Creating a third merged document. Rejected as unnecessary overhead — the mapping table above resolves the ambiguity.

---

### Consequences

Positive: Clear, single authority for package layout. No renames needed. Sprint 2 can proceed.

Negative: Developers must cross-reference the mapping table when reading `architecture.md`'s strategic sketches.

---

### Future Review

Revisit if a package's responsibility grows to justify splitting (e.g., if `packages/core` becomes too large, extract UWM types into a dedicated package).

---

## ADR-0034

### Title

Replace Mock AI Providers with Production Implementations

### Status

Accepted

### Date

2026-07-22

### Context

Sprint 17 introduced mock AI providers behind the `AIProvider` interface. Sprint 19 requires production-ready implementations for five providers: OpenAI, Anthropic, Google Gemini, OpenRouter, and Ollama. The provider abstraction must be preserved so no consumer code changes when switching providers.

### Decision

Implement five production providers, each in its own file under `packages/ai-engine/src/providers/`. Each implements the `AIProvider` interface with `generate()`, `stream()`, and `health()` methods. Configuration loads through `@forge/config` via environment variables — no hardcoded values. The `ProviderFactory` creates providers from configuration; no package instantiates providers directly.

### Alternatives Considered

Keeping mock providers. Rejected because real API integration is required for production use.

Using a single monolithic provider file. Rejected in favor of one file per provider for testability and maintainability.

### Consequences

Positive: Production-ready AI integration. No consumer code changes needed.

Negative: API keys must be configured per environment.

---

## ADR-0035

### Title

Deterministic Retry Engine with Exponential Backoff

### Status

Accepted

### Date

2026-07-22

### Context

AI provider calls can fail transiently (429 rate limits, 503 service unavailable, timeouts, connection failures). Validation failures (400, 401, 403, 404, 422) should never be retried. Retry logic must be deterministic and configurable.

### Decision

Implement `RetryEngine` with configurable `maxRetries` (default 3), `baseDelay` (default 1000ms), `maxDelay` (default 30000ms). Uses exponential backoff with deterministic jitter. Retries only for 429, 503, timeouts, and connection failures. Never retries validation failures.

### Alternatives Considered

Using a third-party retry library. Rejected to keep the dependency footprint minimal and ensure deterministic behavior.

Retrying all errors. Rejected because validation failures indicate a bug, not a transient condition.

### Consequences

Positive: Resilient provider calls. Predictable retry behavior.

Negative: Slightly more code to maintain.

---

## ADR-0036

### Title

In-Memory Rate Limiting per Provider

### Status

Accepted

### Date

2026-07-22

### Context

AI providers have rate limits (requests/minute, tokens/minute, concurrent requests). Forge must throttle requests to avoid hitting provider limits. No external Redis dependency is allowed.

### Decision

Implement in-memory token bucket algorithm per provider. Tracks requests/minute, tokens/minute, and concurrent requests using a sliding window. No external Redis — in-memory only.

### Alternatives Considered

External Redis-based rate limiting. Rejected because it adds infrastructure complexity for a single-user desktop application.

No rate limiting. Rejected because it would cause provider errors and wasted API calls.

### Consequences

Positive: Provider-safe request throttling. No infrastructure dependencies.

Negative: Rate limits reset on process restart.

---

## ADR-0037

### Title

Provider-Aware Fallback Chain

### Status

Accepted

### Date

2026-07-22

### Context

When a provider fails (after retries), Forge should fall back to another provider rather than failing the entire request. Fallback must only occur when the fallback provider is compatible with the request's capabilities.

### Decision

Implement `FallbackChain` with the order: OpenAI → Anthropic → Gemini → OpenRouter → Ollama. Fallback only when the provider is compatible (capability check). `ProviderFallbackError` when all providers fail.

### Alternatives Considered

Random fallback order. Rejected because deterministic order is more predictable and debuggable.

No fallback. Rejected because it reduces reliability.

### Consequences

Positive: Graceful degradation when providers are unavailable.

Negative: Fallback adds latency when primary provider fails.

---

## ADR-0038

### Title

Cost Tracking per Provider, Project, Mission, and Month

### Status

Accepted

### Date

2026-07-22

### Context

AI provider usage incurs costs. Forge must track estimated costs to help users understand spending. Costs vary by provider, model, and usage patterns.

### Decision

Implement `CostTracker` that tracks estimated costs per provider, project, mission, and month. Uses a per-provider pricing table (input/output tokens per 1K). Stores data locally in `projects/<project>/costs/`. Costs are estimates based on token counts and published pricing.

### Alternatives Considered

Real-time billing API integration. Rejected as over-engineering — estimates are sufficient for a single-user tool.

No cost tracking. Rejected because users need visibility into AI spending.

### Consequences

Positive: Visibility into AI provider costs. Local storage means no external dependencies.

Negative: Costs are estimates, not actual bills.

---

## ADR-0039

### Title

Optimization Composer Layer between Review and Execution

### Status

Accepted

### Date

2026-07-22

### Context

Review produces a flat list of approved patches. Executing them in random order is risky — patches may conflict, have dependencies, or need prioritization. A composition layer is needed between Review and Execution.

### Decision

Create `@forge/optimization-composer` package with: PatchGraph (DAG of dependencies), ConflictDetector (selector-level conflict detection), PatchBundler (logical grouping), GoalAssigner (optimization goals), PriorityAssigner (critical/high/medium/low), PreviewGenerator (deterministic impact estimation), and BatchValidator (validates patches together). The flow is always Generate → Review → Compose → Validate → Execute. Review never leads to immediate execution.

### Alternatives Considered

Executing patches directly from Review. Rejected because it risks conflicts and ignores dependencies.

Adding composition logic to the Execution Engine. Rejected because composition is a distinct concern.

### Consequences

Positive: Safe, dependency-aware, prioritized execution. Clear separation of concerns.

Negative: Additional step in the pipeline adds minor latency.

---

## ADR-0040

### Title

Prompt Registry Expansion with Versions, Provider Overrides, and Schema Validation

### Status

Accepted

### Date

2026-07-22

### Context

Sprint 10 introduced a basic prompt registry. Sprint 19 requires expanded capabilities: versioning, provider-specific overrides, variable schema validation, compatibility checks, and recommended model hints.

### Decision

Expand `PromptRegistry` with: `versions` (semver), `providerOverrides` (per-provider prompt variants), `variables` (with schema validation), `compatibility` (required capabilities), `recommendedModels`. New methods: `validateVariables()`, `getCompatibleProviders()`, `getRecommendedModel()`, `checkCompatibility()`. Upgrade `PromptRenderer` to support conditionals (`{{#if}}`), loops (`{{#each}}`), partials (`{{>}}`), escaping (`{{escape}}`), strict validation, and missing variable detection.

### Alternatives Considered

Keeping the simple string-based registry. Rejected because it doesn't scale to multiple providers and versions.

Using a third-party template engine. Rejected to keep the dependency footprint minimal.

### Consequences

Positive: Versioned, validated, provider-aware prompts. Better prompt quality and debuggability.

Negative: More complex prompt definitions.

---

# Decision Review Policy

Architectural decisions should be reviewed when:

- Requirements change
- Significant technical debt appears
- Better alternatives emerge
- Performance becomes unacceptable
- Scalability is affected

Changes should create new ADRs rather than rewriting history.

---

## ADR-0026

### Title

Content Generation Owns AI Writing — No Separate Writing Engine

### Status

Accepted

### Date

2026-07-24

### Owner

Bright Ndode

---

### Context

Sprint 20 planning initially proposed a new `@forge/ai-writing-engine` package. However, reviewing the architecture revealed that `@forge/content-generation` already owns content generation. Creating a new package would split ownership of the same responsibility across two packages, duplicating infrastructure, providers, and validation logic.

The original Sprint 17 scope included: section generators, prompt builder, context aggregation, AI provider abstraction. These are exactly the primitives needed for production-grade AI writing. No new package is needed.

### Decision

All AI writing capabilities will be implemented inside `@forge/content-generation`, not in a new package. New modules are added as subdirectories: `brief/`, `brand/`, `prompts/`, `writers/`, `validator/`, `scoring/`.

### Alternatives Considered

Creating `@forge/ai-writing-engine`. Rejected because it duplicates ownership of content generation responsibilities, breaks the single-responsibility package rule, and would require cross-package orchestration that already exists naturally inside a single package.

### Consequences

Positive:
- Single owner for all content generation (brand, writing, validation, scoring)
- No infrastructure duplication (providers, prompts, context)
- Clean knowledge boundaries
- Easier testing and debugging

Negative:
- Larger package with more internal modules
- Requires clear internal module boundaries to prevent coupling

### Future Review

Revisit if the package grows beyond 10k lines of source code, at which point extracting `validator/` into a separate validator package may be warranted.

---

## ADR-0027

### Title

BrandProfile Lives in @forge/core

### Status

Accepted

### Date

2026-07-24

### Owner

Bright Ndode

---

### Context

Brand identity data is consumed by multiple packages: content-generation (for writing), context-builder (for AI prompts), homepage-engine (for optimization), and CLI (for display). Placing it inside `@forge/content-generation` would force downstream consumers to depend on a generation package they don't need.

### Decision

`BrandProfile` is defined as an interface in `@forge/core`. It is constructed deterministically by content-generation's brand module, consumed by context-builder for AI prompt enrichment, and used in homepage optimization.

### Alternatives Considered

Placing `BrandProfile` in `@forge/content-generation`. Rejected because it creates unnecessary dependencies for packages that only consume the profile type.

Placing `BrandProfile` in `@forge/content-intelligence`. Rejected because content-intelligence must never know about brand identity (it analyzes content, not brands).

### Consequences

Positive:
- Single source of truth for brand identity type
- No circular dependencies
- All consumers import from core

Negative:
- None significant

### Future Review

No review needed unless the brand model grows into a standalone domain package.

---

## ADR-0028

### Title

Content Validation Is Deterministic — No LLM Validation

### Status

Accepted

### Date

2026-07-24

### Owner

Bright Ndode

---

### Context

After AI generates content, it must be validated for quality, brand compliance, EEAT signals, readability, and SEO. Using an LLM for validation would be expensive, slow, non-deterministic, and introduce model-specific biases.

### Decision

All content validation is deterministic (no LLM calls). The validator module in content-generation uses:
- Keyword coverage analysis (string matching)
- Heading quality checks (regex, hierarchy rules)
- Duplicate phrase detection (n-gram comparison)
- Placeholder detection (regex)
- Brand terminology checks (string inclusion)
- Prohibited word checks (string exclusion)
- Flesch-Kincaid readability (formula)
- EEAT signal detection (pattern matching)
- CTA presence checks (string matching)
- Internal link suggestion (rule-based)

### Alternatives Considered

LLM-based validation. Rejected due to cost, latency, non-determinism, and the inability to enforce brand rules consistently.

### Consequences

Positive:
- Deterministic, testable, predictable
- Zero cost per validation
- Always consistent
- Can be run in CI/CD

Negative:
- Cannot detect nuanced semantic issues that an LLM might catch
- May produce false positives/negatives for complex quality evaluations

### Future Review

Revisit if deterministic validation proves insufficient for quality assurance. A hybrid approach (deterministic pre-check + optional LLM review) could be considered.

---

## ADR-0029

### Title

Capabilities vs Skills — Formal Boundary Documented

### Status

Accepted

### Date

2026-07-24

### Owner

Bright Ndode

---

### Context

The codebase has both `@forge/capabilities` (analysis rules and engine) and `@forge/skills` (AI-powered tasks). The boundary between them was not clearly defined, creating confusion about where new functionality belongs.

### Decision

Formal boundary:
- **Capabilities** = deterministic business logic. Zero AI. Examples: analysis rules, recommendation generators, content intelligence.
- **Skills** = AI-powered tasks. Require an AI provider. Examples: meta description generation, section writing, entity analysis.

Capabilities may be consumed by Skills, but Skills must never be consumed by Capabilities.

### Consequences

Positive:
- Clear decision framework for new features
- Prevents accidental AI dependency in deterministic paths
- Easier testing (capabilities are pure logic)

Negative:
- Requires awareness of the boundary during implementation

### Future Review

Revisit if the boundary proves too restrictive or if hybrid capability-skill modules emerge.

---

## ADR-0030

### Title

Ownership Declarations Required for Every Package

### Status

Accepted

### Date

2026-07-24

### Owner

Bright Ndode

---

### Context

The Sprint 20 retrospective identified that duplicate package ownership (proposed `ai-writing-engine` alongside existing `content-generation`) was the root cause of architectural drift. To prevent this in future sprints, every package should explicitly declare what it owns and does not own.

### Decision

Every package in the monorepo must include, either in its README or in a comment in its `package.json`, a declaration of:
- **Owns**: The responsibilities this package owns exclusively
- **Does NOT own**: Responsibilities that belong to other packages

Before adding a feature in a future sprint, the first question must be: "Which package already owns this responsibility?" If the answer is "this package," extend it. If "none," create a new package.

### Alternatives Considered

Informal knowledge sharing. Rejected because it relies on memory and breaks as the team grows.

Centralized ownership registry. Rejected as over-engineering for a single-developer project.

### Consequences

Positive:
- Prevents package sprawl
- Keeps architecture coherent over time
- Self-documenting package boundaries

Negative:
- Requires maintenance when responsibilities change

### Future Review

Revisit when the first ownership conflict occurs (two packages claiming the same responsibility).

---

# Final Principle

Architectural consistency is more valuable than short-term convenience.

Every accepted decision should make Forge easier to understand, easier to extend, and easier to maintain.
