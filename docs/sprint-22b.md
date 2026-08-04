# Sprint 22B — Optimization Orchestrator & Engine Wiring

**Version:** v0.22.0  
**Date:** Sprint 22B  
**Type:** Architecture Infrastructure

## Summary

Sprint 22B introduced the `@forge/optimization-orchestrator` package — a central coordination layer that replaces ad-hoc engine chaining. It provides a deterministic state machine, shared context, declarative workflows, typed events, runtime metrics, and an engine registry.

## Changes Made

### New Package: `@forge/optimization-orchestrator`

| File | Purpose |
|---|---|
| `src/types.ts` | Core types — EngineType, WorkflowDefinition, interfaces |
| `src/state-machine.ts` | 13-state deterministic state machine with forward-jump support |
| `src/context.ts` | Single shared `OptimizationContext` — no engine rebuilds |
| `src/workflow.ts` | 6 built-in workflow definitions (homepage, blog, landing, product, category, content-refresh) |
| `src/events.ts` | Typed event bus with state mapping (12 events) |
| `src/metrics.ts` | Runtime metrics — duration, step durations, tokens, cost, patches, approvals |
| `src/registry.ts` | Engine registry — resolves engines by type instead of direct imports |
| `src/errors.ts` | 6 typed error classes (StateTransition, MissingEngine, MissingContext, etc.) |
| `src/lifecycle.ts` | Lifecycle hooks system |
| `src/orchestrator.ts` | Main `OptimizationOrchestrator` class |
| `src/index.ts` | Barrel export |
| `src/orchestrator.test.ts` | 28 tests (unit + integration) |

### Engine Adapters

Created adapters that wrap real engines into the orchestrator's `Engine` interface:

| Adapter | Wraps | Role |
|---|---|---|
| `content-intelligence-adapter.ts` | `@forge/content-intelligence` | Analyzes page DNA, content graph, sections, gaps, quality scores |
| `content-generation-adapter.ts` | `@forge/content-generation` | Generates section patches only — never whole pages, never publishes |
| `review-adapter.ts` | `@forge/review-engine` | Creates and applies review sessions from generated patches |
| `composer-adapter.ts` | `@forge/optimization-composer` | Bundles patches, builds dependency graph, detects conflicts |
| `execution-adapter.ts` | `@forge/execution-engine` | Executes approved actions only — never generates, never plans |

### CLI Integration

Added commands to `apps/cli/src/index.ts`:

| Command | Description |
|---|---|
| `forge optimize [project]` | Run a full optimization workflow (analyse → generate → review → compose → execute) |
| `forge workflow list` | List all available workflows |
| `forge workflow show <id>` | Show workflow step details |

### Documentation

- `docs/decisions.md` — Added **ADR-051: Optimization Orchestrator**
- `README.md` — Added orchestrator to workspace tree
- `docs/architecture.md` — Added orchestrator layer, import rules, Mermaid flow
- `docs/project-structure.md` — Added orchestrator directory + ownership matrix
- `docs/packages.md` — Added orchestrator package profile
- `docs/dependency-graph.md` — Added orchestrator node with dependencies + anti-patterns
- Deleted obsolete `docs/sprint-1.md` and `docs/sprint-7.md`

### Dependency Changes

- `packages/optimization-orchestrator/package.json` — Added `@forge/prompt-registry`, `@forge/action-engine`, `cheerio`
- `apps/cli/package.json` — Added `@forge/optimization-orchestrator`

## Key Design Decisions (ADR-051)

1. **Engine registry** — orchestrator never imports engines directly
2. **Forward-jump state machine** — workflows can skip intermediate states
3. **Shared context** — no engine rebuilds what another produced
4. **Declarative workflows** — workflow definitions are data, not code
5. **Provider-independent** — never imports `providers-wordpress`
6. **Execution only** — orchestrator never generates content, never plans, never reviews

## Verification

- [x] `pnpm build --filter=@forge/optimization-orchestrator` — 20/20 tasks passed
- [x] `pnpm build --filter=@forge/cli` — 30/30 tasks passed
- [x] `vitest run` — 28/28 orchestrator tests passed