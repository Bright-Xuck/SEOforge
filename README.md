# Forge

**Autonomous Website Optimization Platform — Architecture & CLI Reference**

Forge is a layered, deterministic-first platform for analyzing, generating, reviewing, composing, and executing website optimizations. It integrates with WordPress and other providers through a strict orchestration chain.

---

## Architecture at a Glance

```
Mission
  ↓
Agent
  ↓
Strategy
  ↓
Pipeline
  ↓
Optimization Orchestrator
  ↓
──────────────────────────────────────
DOM Engine            (Universal Page Model — canonical parser)
Content Intelligence  (deterministic)
Content Generation   (section-patches)
Knowledge Engine     (project knowledge)
Memory Engine        (event-sourced memory)
AI Engine            (provider abstraction)
Review               (deterministic, no AI)
Optimization Composer (bundles)
Execution Engine     (apply only)
──────────────────────────────────────
  ↓
Provider             (WordPress REST API)
```

### Layer Boundaries

| Layer | May NOT |
|---|---|
| DOM Engine | Never import AI, providers, execution, homepage-engine |
| Content Intelligence | Never import AI, skills, providers, execution |
| Content Generation | Never import WordPress, never publish, never execute |
| Optimization Composer | Never generate content, never know providers |
| Execution Engine | Never generate content, never plan, never review |
| AI Engine | Never know WordPress, never know Elementor |
| Review Engine | Deterministic only; AI never approves |

---

## Repository Structure

```
apps/
  cli/                          # @forge/cli — Commander CLI

packages/
  action-engine/               # @forge/action-engine — execution planning & approval
  agent-engine/                # @forge/agent-engine — agent framework (SEO, Content, Linking, Schema, Accessibility, Performance, Learning)
  ai-engine/                   # @forge/ai-engine — provider factory, rate limiter, retry, cost tracker
  capabilities/                # @forge/capabilities — deterministic analysis engine
  config/                      # @forge/config — configuration loading & validation
  content-generation/          # @forge/content-generation — AI section-patch generation
  content-intelligence/        # @forge/content-intelligence — PageDNA, ContentGraph, sections, entities, gaps
  context-builder/             # @forge/context-builder — AI context assembly
  core/                        # @forge/core — domain models (no runtime deps)
  dom-engine/                  # @forge/dom-engine — Universal Page Model, builder detection, DOM diff, rich text, validation
  execution-engine/            # @forge/execution-engine — apply approved actions to providers
  homepage-engine/             # @forge/homepage-engine — homepage detection,  Click optimization
  knowledge-engine/            # @forge/knowledge-engine — project knowledge store
  logger/                      # @forge/logger — structured logging
  memory-engine/               # @forge/memory-engine — event-sourced memory store
  mission-engine/              # @forge/mission-engine — mission templates & planner
  optimization-composer/      # @forge/optimization-composer — patch bundling, conflict detection, rollback groups
  optimization-orchestrator/  # @forge/optimization-orchestrator — central orchestration layer
  pipeline-engine/             # @forge/pipeline-engine — pipeline orchestration
  plugin-registry/             # @forge/plugin-registry — extension registry
  preflight-validator/         # @forge/preflight-validator — pre-execution validation
  project-resolver/            # @forge/project-resolver — project name resolution
  prompt-registry/             # @forge/prompt-registry — prompt templates & versions
  providers-wordpress/         # @forge/providers-wordpress — WordPress REST API provider
  recommendation-engine/       # @forge/recommendation-engine — finding → recommendation
  review-engine/               # @forge/review-engine — review sessions, approvals, metrics, exports
  shared/                      # @forge/shared — shared constants & utilities
  skills/                      # @forge/skills — AI skill definitions & pipelines
  strategy-engine/             # @forge/strategy-engine — strategy generation & validation
  tools/                       # @forge/tools — html-parser, website-reader

docs/
  architecture.md              # Unified architecture document
  cli.md                       # CLI reference
  coding_standards.md
  decisions.md                 # Architecture Decision Records
  dependency-graph.md          # Package dependency rules
  development-workflow.md
  packages.md                  # Package responsibility catalog
  project-structure.md
  roadmap.md
  sprint-*.md                  # Sprint records
  vision.md
```

---

## CLI Reference

### Mission Commands

| Command | Description |
|---|---|
| `forge missions list` | List registered mission templates |
| `forge mission info <id>` | Show a mission template |
| `forge mission run <id> [project]` | Plan and execute a mission (`--dry-run`, `--json`) |
| `forge mission validate <id>` | Validate a mission template |
| `forge mission export <id>` | Export as JSON or YAML (`--json`, `--yaml`) |

### Agent Commands

| Command | Description |
|---|---|
| `forge agents list` | List registered agents (`--json`) |
| `forge agents info <id>` | Show agent details |
| `forge agents run <id> [project]` | Execute agent (`--dry-run`, `--json`) |

### Strategy Commands

| Command | Description |
|---|---|
| `forge strategy create [project]` | Build a strategy (`--json`, `yaml`, `--dry-run`) |
| `forge strategy show [project]` | Show existing strategy (`--json`, `--yaml`) |
| `forge strategy validate [project]` | Validate a strategy |
| `forge strategy export [project]` | Export strategy (`--json`, `--yaml`) |

### Pipeline Commands

| Command | Description |
|---|---|
| `forge pipeline list` | List all built-in pipelines (`--json`) |
| `forge pipeline info <id>` | Show pipeline details |
| `forge pipeline run <id> <url>` | Run pipeline (`--dry-run`, `--json`) |

### Legacy Commands

| Command | Description |
|---|---|
| `forge read <url>` | Read website snapshot (`--json`) |
| `forge analyze <url>` | Read analysis report (`--json`) |
| `forge recommend <url>` | Generate recommendations (`--json`) |
| `forge plan <url>` | Generate execution plan (`--json`) |
| `forge validate <url>` | Run preflight validation (`--json`) |
| `forge execute <url>` | Execute plan (dry-run only; `--json`) |

### Content Intelligence (deterministic, no AI)

| Command | Description |
|---|---|
| `forge content analyze` | Build PageDNA (`--project`, `--json`) |
| `forge content graph` | Build ContentGraph (`--project`, `--json`) |
| `forge content sections` | Detect sections (`--project`, `--json`) |
| `forge content entities` | Extract entities (`--project`, `--json`) |
| `forge content gaps` | Detect content gaps (`--project`, `--json`) |
| `forge content quality` | Score quality metrics (`--project`, `--json`) |

### AI Generation (section-patch only)

| Command | Description |
|---|---|
| `forge generate hero` | Generate hero patch (`--project`, `--provider`, `--model`, `--preview`, `--json`) |
| `forge generate faq` | Generate FAQ patch |
| `forge generate cta` | Generate CTA patch |
| `forge generate section <kind>` | Generate specific section patch |
| `forge generate page` | Generate all detected sections |

### AI Writing Engine (Sprint 20)

| Command | Description |
|---|---|
| `forge write hero` | AI write hero section |
| `forge write benefits` | AI write benefits |
| `forge write features` | AI write features |
| `forge write services` | AI write services |
| `forge write products` | AI write products |
| `forge write about` | AI write about |
| `forge write faq` | AI write FAQ |
| `forge write testimonials` | AI write testimonials |
| `forge write cta` | AI write CTA |
| `forge write buying-guide` | AI write buying guide |
| `forge write comparison` | AI write comparison |
| `forge write product` | AI write product |
| `forge write introduction` | AI write introduction |
| `forge write conclusion` | AI write conclusion |
| `forge write contact` | AI write contact |
| `forge write blog` | AI write blog |
| `forge write section <type>` | AI write any section type |
| `forge write preview` | Preview brand/voice profile |
| `forge write validate [content]` | Validate content SEO |
| `forge write score [content]` | Score content quality |

### Review Engine (deterministic, no AI)

| Command | Description |
|---|---|
| `forge review create` | Create review session (`--policy`, `--from <file>`, `--json`) |
| `forge review show <sessionId>` | Show session details |
| `forge review approve <itemId>` | Approve an item (`--session`, `--by`) |
| `forge review reject <itemId>` | Reject an item |
| `forge review edit <itemId>` | Edit item content (`--content`) |
| `forge review comments <sessionId>` | List comments |
| `forge review export <sessionId>` | Export as `md`/`json`/`html` |
| `forge review metrics <sessionId>` | Show approval metrics |
| `forge review apply <sessionId>` | Apply approved session to execution engine (`--dry-run`) |
| `forge review rollback <sessionId>` | Rollback a previously applied session |

### WordPress Provider

| Command | Description |
|---|---|
| `forge wp test <site> <username> <password>` | Test connection (`--json`) |
| `forge wp info <site> <username> <password>` | Site info |
| `forge wp capabilities <site> <username> <password>` | Detect capabilities |
| `forge wp preview` | Preview write (`--field`, `--value`) |
| `forge wp apply` | Apply write |
| `forge wp rollback` | Rollback write (`--revision-id`) |
| `forge fetch <site> <username> <password>` | Fetch all site data |
| `forge connect wordpress` | Connection wizard (instructions) |
| `forge provider` | Show provider info |

### AI Provider Management

| Command | Description |
|---|---|
| `forge ai providers` | List configured providers (`--json`) |
| `forge ai models [provider]` | List models for a provider (`--json`) |
| `forge ai test [provider]` | Health check (`--model`) |
| `forge ai benchmark [provider]` | Latency benchmark |
| `forge ai cost` | Cost tracking (`--provider`, `--project`, `--month`) |
| `forge ai prompt [promptId]` | List/show prompts (`--json`) |
| `forge ai logs` | Provider logs (`--provider`, `--limit`, `--json`) |
| `forge ai history` | Prompt execution history (`--project`, `--limit`, `--json`) |

### DOM Engine (Sprint 23)

| Command | Description |
|---|---|
| `forge dom analyze` | Parse HTML and show Universal Page Model summary (`--json`) |
| `forge dom tree` | Show page tree (regions → sections → blocks) (`--json`) |
| `forge dom diff` | Diff two HTML documents (`--json`) |
| `forge dom validate` | Validate DOM structure (`--json`) |
| `forge dom selectors` | Show selectors for all elements (`--json`) |
| `forge dom builder` | Detect page builder (Elementor/Gutenberg/Classic/Bricks) (`--json`) |
| `forge dom export` | Export Universal Page Model as JSON |

### Optimization Orchestrator

| Command | Description |
|---|---|
| `forge optimize` | Run default optimization workflow (`--project`, `--provider`, `--model`, `--preview`, `--review`, `--apply`, `--json`, `--dry-run`) |
| `forge optimize homepage` | Homepage optimization workflow |
| `forge optimize blog` | Blog optimization workflow |
| `forge optimize category` | Category optimization workflow |
| `forge optimize product` | Product page optimization workflow |
| `forge optimize page` | Generic page optimization workflow |

### Homepage Optimization

| Command | Description |
|---|---|
| `forge homepage analyze` | Deterministic analysis (`--project`, `--json`) |
| `forge homepage plan` | Optimization plan (`--project`, `--json`) |
| `forge homepage preview` | Preview changes (`--project`, `--json`) |
| `forge homepage optimize` | Optimize with approval flow (`--project`, `--policy`, `--ai`, `--provider`, `--model`, `--json`) |

### Execution Engine

| Command | Description |
|---|---|
| `forge execution apply` | Apply execution (`--dry-run`, `--json`) |
| `forge execution rollback` | Rollback execution |

### Project Management

| Command | Description |
|---|---|
| `forge project profile [project]` | Show project summary (`--json`) |
| `forge timeline [project]` | Show event timeline (`--json`) |
| `forge changes [project]` | Show detected changes (`--json`) |

### Skills

| Command | Description |
|---|---|
| `forge skills list` | List AI skills (`--json`) |
| `forge skills info <id>` | Skill details |
| `forge skill run <id> [project]` | Run a single skill (`--provider`, `--model`, `--json`) |

---

## Packages

### `@forge/core`
Core domain models and contracts. Platform-independent, no runtime dependencies.

**Exports:** `---`, `Category`, `Finding`, `AnalysisReport`, `AnalysisRule`, `ReadMode`, `WriteOperation`, `Provider`, `WebsiteSnapshot`

### `@forge/shared`
Shared constants (FORGE_NAME, FORGE_VERSION) and cross-package utilities.

### `@forge/config`
Environment configuration loading and validation.

### `@forge/logger`
Structured logging channel.

### `@forge/tools`
External capabilities:
- `html-parser` — Deterministic HTML parsing (Cheerio)
- `website-reader` — URL → structured `WebsiteSnapshot`

### `@forge/capabilities`
Analysis engine and rules for `WebsiteSnapshot`.

**Exports:** `analyzeWebsite(snapshot) → AnalysisReport`, `analyzeHomepage(snapshot)`, rule constants

### `@forge/plugin-registry`
Central extension registry.

**Exports:** `PluginRegistry`, `Plugin`, `CapabilityManifest`

### `@forge/recommendation-engine`
Finding → recommendation conversion with risk scoring.

### `@forge/action-engine`
Execution planning, approval queue, risk assessment.

### `@forge/pipeline-engine`
Pipeline orchestration. Registers pipelines, executes steps in dependency order.

### `@forge/preflight-validator`
Pre-execution plan validation.

### `@forge/execution-engine`
Applies approved ExecutionPlans to providers. Dry-run by default. Never generates content.

### `@forge/providers-wordpress`
WordPress REST API provider (read & write).

### `@forge/config`
Configuration loading/validation.

### `@forge/ai-engine`
Provider factory, rate limiter, retry engine, cost tracker, prompt history, provider logger.

### `@forge/skills`
Skill registry with per-

### `@forge/agent-engine`
Agent framework: SEOAgent, ClickHouse, LinkingAgent, SchemaAgent, AccessibilityAgent, PerformanceAgent, LearningAgent.

### `@forge/mission-engine`
Mission template sequences: plan → validate → export → execute.

### `@forge/strategy-engine`
Strategy builder, validator, serialization (JSON/YAML).

### `@forge/review-engine`
Review sessions, approval queue, metrics, diff reports, comments, exports (md/json/html).

### `@forge/optimization-composer`
Patch bundler, dependency graph, conflict detector, priority ordering, batch validation.

### `@forge/content-intelligence`
**Deterministic.** PageDNA, ContentGraph, Section detection, Entity extraction, Gap detection, Quality scoring. Never imports AI or providers.

### `@forge/content-generation`
**Section-patch only.** AI section writers (writeHero, writeFaq, writeCta, etc.). Never publishes, never knows WordPress, never writes whole pages.

### `@forge/dom-engine`
**Canonical website parser.** Transforms raw HTML into a Universal Page Model (Page → Regions → Sections → Blocks → Elements → Text Nodes → Attributes → Selectors). Detects builders (Elementor, Gutenberg, Classic, Bricks). Generates stable IDs and deterministic selectors. Provides DOM diff, rich text model, rich text patches, and DOM validation. Everything that reads or writes HTML must use it — no other package parses HTML directly.

**Public APIs:** `parse()`, `buildUniversalPage()`, `detectBuilder()`, `buildSelectors()`, `buildStableIds()`, `diffDom()`, `normalizeRichText()`, `createPatch()`, `validateDom()`

### `@forge/homepage-engine`
Homepage detection, analysis, planning, optimization with Swimlane.

### `@forge/home-module`
Project resolution pipeline (CLI flag → env → cwd).

### `@forge/context-builder`
Assemblies AI context from project knowledge & memory.

---

## Sprint History

Sprint development records are maintained in `docs/sprint-*.md`. The full Sprint history can be found there. This README reflects architecture as of Sprint 23.