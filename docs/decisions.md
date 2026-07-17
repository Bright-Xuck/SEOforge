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

# Future Decisions

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

# Decision Review Policy

Architectural decisions should be reviewed when:

- Requirements change
- Significant technical debt appears
- Better alternatives emerge
- Performance becomes unacceptable
- Scalability is affected

Changes should create new ADRs rather than rewriting history.

---

# Final Principle

Architectural consistency is more valuable than short-term convenience.

Every accepted decision should make Forge easier to understand, easier to extend, and easier to maintain.
