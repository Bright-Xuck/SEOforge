# Forge

AI Operating System for Websites.

Forge is a modular, extensible platform for understanding, improving, operating, and maintaining websites. It is not an SEO tool, chatbot, or WordPress plugin — SEO is one capability among many.

Sprint 8 introduces the Pipeline layer. Core workflows now execute through reusable pipeline steps, and the CLI exposes `forge pipeline list`, `forge pipeline info <id>`, and `forge pipeline run <id> <url>`.
Sprint 9 adds project knowledge and memory commands:
`forge project profile`, `forge timeline`, and `forge changes`.
Sprint 10 adds the AI Skills Platform:
`forge skills list`, `forge skills info <id>`, and `forge skill run <id>`.
Sprint 10 hardening removes silent project fallback and adds explicit project resolution, structured AI context, prompt registry metadata, and provider capability checks.
Sprint 11 adds the Agent Framework:
`forge agents list`, `forge agent info <id>`, and `forge agent run <id>`.
Sprint 12 adds the Strategy Engine:
`forge strategy create`, `forge strategy show`, `forge strategy validate`, and `forge strategy export`.
Sprint 13 adds the Mission Engine:
`forge missions list`, `forge mission info <id>`, `forge mission run <id>`, `forge mission validate <id>`, and `forge mission export <id>`.
Sprint 14 adds the WordPress Write Provider:
`forge wp preview`, `forge wp apply`, `forge wp rollback`, `forge execution apply`, and `forge execution rollback`.
Sprint 15 adds the Homepage Optimization vertical slice:
`forge homepage analyze`, `forge homepage plan`, `forge homepage preview`, and `forge homepage optimize`.
Sprint 16 adds the Content Intelligence Engine:
`forge content analyze`, `forge content graph`, `forge content dna`, `forge content sections`, and `forge content entities`.
Sprint 17 adds the Section Content Generation Engine:
`forge generate hero`, `forge generate faq`, `forge generate cta`, `forge generate section`, and `forge generate page` (each with `--preview`, `--provider`, `--model`, `--project`, `--dry-run`, and `--json`).
Sprint 18 adds the Review Engine:
`forge review create`, `forge review show`, `forge review approve`, `forge review reject`, `forge review edit`, `forge review export`, `forge review metrics`, `forge review comments`, `forge review apply`, and `forge review rollback` (each with `--project`, `--json`, and `--format` where relevant). `forge homepage optimize` now stops at a Review Session instead of executing.
Sprint 19 adds Production AI Providers and the Optimization Composer:
`forge ai providers`, `forge ai models`, `forge ai test`, `forge ai benchmark`, `forge ai cost`, `forge ai prompt`, `forge ai logs`, `forge ai history`, `forge compose`, `forge compose graph`, `forge compose bundles`, `forge compose conflicts`, `forge compose preview`, `forge compose validate`, and `forge compose execute`.
Sprint 20 adds the AI Content Generation Engine to `@forge/content-generation`:
`forge write hero`, `forge write faq`, `forge write blog`, `forge write section`, `forge write preview`, `forge write validate`, `forge write score`, alongside brand-aware writing, deterministic validation, quality scoring, and expanded pipeline integration.
Sprint 21 adds the DOM Mapping & Smart Patch Engine:
`forge dom map`, `forge dom preview`, `forge dom patch`, `forge dom validate`, `forge dom inspect`, alongside deterministic DOM mapping with stable anchors, Elementor/Gutenberg/generic-HTML builder support, and a Smart Patch Engine that applies ContentPatch objects to preview HTML only.

---

## Requirements

- **Node.js** >= 20
- **pnpm** >= 9

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Read a website
forge read https://example.com

# Analyze a website for issues
forge analyze https://example.com

# Generate recommendations
forge recommend https://example.com

# Generate execution plan
forge plan https://example.com

# Pipeline commands
forge pipeline list
forge pipeline info read
forge pipeline run execute https://example.com

# Legacy commands still work through pipelines
forge read https://example.com
forge analyze https://example.com
forge recommend https://example.com
forge plan https://example.com

# Project knowledge
forge project profile my-project
forge timeline my-project
forge changes my-project

# Skills commands
forge skills list
forge skills info skill.generate-meta-description
forge skill run skill.generate-meta-description
```

---

## Workspace Structure

```
forge/
├── apps/
│   └── cli/              # Command-line interface
├── packages/
│   ├── core/             # Domain models, interfaces, base contracts
│   ├── config/           # Configuration loading and validation
│   ├── logger/           # Structured logging
│   ├── shared/           # Reusable utilities and constants
│   ├── tools/            # External capabilities (website reader, html parser)
│   ├── capabilities/     # Analysis rules and engine
│   ├── plugin-registry/  # Central registry for all extensions
│   ├── recommendation-engine/  # Deterministic recommendation generation
│   ├── action-engine/    # Execution planning and approval management
│   ├── homepage-engine/  # Deterministic homepage analysis and optimization
│   ├── content-intelligence/  # Deterministic content understanding (Page DNA, Content Graph)
│   ├── ai-engine/        # AI provider abstraction, retry engine, rate limiting, cost tracking
│   ├── optimization-composer/  # PatchGraph, conflict detection, bundles, goals, priorities, preview
│   ├── dom-engine/       # DOM mapping, selector resolution, smart patching, builder support
│   └── execution-engine/ # Execution with rollback groups
├── docs/                 # Architecture and design documentation
└── tests/                # Repository-level tests
```

---

## CLI Commands

### `forge read <url>`

Read a website and produce a structured snapshot.

### `forge analyze <url>`

Read and analyze a website, producing a list of findings sorted by severity.

### `forge recommend <url>`

Read, analyze, and generate deterministic recommendations for fixing issues.

### `forge plan <url>`

Read, analyze, generate recommendations, and produce an execution plan with risk assessment and approval queue.

### `forge validate <url>`

Read, analyze, plan, and validate an execution plan.

### `forge execute <url>`

Read, analyze, plan, validate, and dry-run execution.

### `forge pipeline list`

List built-in pipelines.

### `forge pipeline info <id>`

Show pipeline details, steps, and dependencies.

### `forge pipeline run <id> <url>`

Run a pipeline by ID. Supports `--json` and `--dry-run`.

### `forge project profile [project]`

Show project knowledge and history summary.

### `forge timeline [project]`

Show the project timeline.

### `forge changes [project]`

Show detected changes for the project.

### `forge skills list`

List registered AI skills.

### `forge skills info <id>`

Show skill details, requirements, and outputs.

### `forge skill run <id>`

Run a skill against structured project context. Supports `--provider`, `--model`, and `--json`.

### `forge missions list`

List registered mission templates.

### `forge mission info <id>`

Show a mission template.

### `forge mission run <id>`

Plan and execute a mission for a project. Supports `--dry-run` and `--json`.

### `forge mission validate <id>`

Validate a mission template.

### `forge mission export <id>`

Export a mission template as JSON or YAML.

### `forge wp preview`

Preview a WordPress write operation without modifying the site.

### `forge wp apply`

Apply a WordPress write operation after approval.

### `forge wp rollback`

Rollback a previous WordPress write operation using stored revision data.

### `forge execution apply`

Apply an approved execution against a provider-backed target.

### `forge execution rollback`

Rollback an approved execution using stored rollback data.

### `forge homepage analyze`

Analyze a homepage deterministically without AI.

### `forge homepage plan`

Generate a homepage optimization plan from detected issues and heuristics.

### `forge homepage preview`

Preview homepage optimization changes without writes.

### `forge homepage optimize`

Optimize a homepage through the approval-gated execution flow.

### `forge content analyze`

Analyze a page deterministically and produce a structured content-intelligence report (page type, intent, sections, entities, quality, gaps). Supports `--json` and `--project`.

### `forge content graph`

Build a Content Graph (Page → Section → Block → Paragraph → Sentence) for a page. Supports `--json` and `--project`.

### `forge content dna`

Build a Page DNA object summarizing a page's structure, intent, entities, and signals. Supports `--json` and `--project`.

### `forge content sections`

Detect content sections (hero, features, faq, pricing, etc.) on a page. Supports `--json` and `--project`.

### `forge content entities`

Extract deterministic entities (brands, products, people, organizations, etc.) from a page. Supports `--json` and `--project`.

### `forge ai providers`

List configured AI providers with their capabilities (streaming, vision, JSON mode, etc.).

### `forge ai models`

List available models for a given provider.

### `forge ai test`

Test a provider connection by making a lightweight health check.

### `forge ai benchmark`

Benchmark provider performance (latency, tokens/second).

### `forge ai cost`

Show cost tracking report per provider, project, mission, and month.

### `forge ai prompt`

Manage the prompt registry: list, info, render, validate.

### `forge ai logs`

View AI request logs (provider, model, tokens, latency, cost, errors).

### `forge ai history`

View prompt execution history per project.

### `forge compose`

Run the Optimization Composer on a review session. Transforms reviewed patches into structured, dependency-aware, prioritized bundles.

### `forge compose graph`

Show the PatchGraph for a session — a DAG of patch dependencies.

### `forge compose bundles`

List patch bundles grouped by optimization goal.

### `forge compose conflicts`

Show detected conflicts where multiple patches touch the same selector.

### `forge compose preview`

Generate an optimization preview with estimated SEO/UX/content quality impact.

### `forge compose validate`

Run batch validation on composed bundles.

### `forge compose execute`

Execute composed patches in priority order (critical → high → medium → low).

### `forge dom map`

Build a DOM map from HTML, detecting sections, blocks, anchors, and selectors. Supports `--json` and `--project`.

### `forge dom preview`

Generate preview HTML (before.html, after.html, diff.html) from a DOM map and ContentPatch. Supports `--json` and `--project`.

### `forge dom patch`

Apply a ContentPatch to a DOM map and produce a PatchPreview. Supports `--json` and `--project`.

### `forge dom validate`

Validate a ContentPatch against a DOM map (selector exists, anchor valid, block exists, safe operation, correct type). Supports `--json` and `--project`.

### `forge dom inspect`

Inspect a DOM map showing sections, blocks, anchors, and selectors with confidence levels. Supports `--json` and `--project`.

---

## Packages

### `@forge/core`

Core domain models and base contracts. Platform-independent with no runtime dependencies.

**Analysis types:**

- `Severity` — info | low | medium | high | critical
- `Category` — seo | accessibility | performance | content | metadata | links | images | technical
- `Finding` — structured finding with evidence, confidence, fixable flag
- `AnalysisReport` — collection of findings with summary counts
- `AnalysisRule` — interface for deterministic analysis rules

### `@forge/tools`

External capabilities package containing:

- `@forge/tools/html-parser` — Deterministic HTML parsing using Cheerio
- `@forge/tools/website-reader` — Reads a URL and returns a structured WebsiteSnapshot

### `@forge/capabilities`

Analysis engine and rules for WebsiteSnapshot.

**Exports:**

- `analyzeWebsite(snapshot)` — Run all rules, return AnalysisReport
- `analyzeHomepage(snapshot)` — Homepage-specific analysis (via `./homepage` subpath)
- Rule constants for individual rule testing

### `@forge/plugin-registry`

Central registry for all extensions in Forge.

**Exports:**

- `PluginRegistry` — Registry with register, unregister, get, list, exists, clear methods
- `Plugin` — Interface for all plugin types
- `CapabilityManifest` — Self-describing capability metadata

### `@forge/recommendation-engine`

Deterministic recommendation generation from analysis findings.

**Exports:**

- `generateRecommendations(report)` — Transform AnalysisReport to RecommendationReport
- Recommendation generator types and interfaces

### `@forge/action-engine`

Execution planning and approval management for Sprint 5.

**Exports:**

- `generateExecutionPlan(report)` — Generate execution plan from recommendation report
- `ApprovalQueue` — In-memory approval queue implementation
- `getRiskLevel(findingId)` — Determine risk level for a finding
- `getActionType(findingId)` — Determine action type for a finding
- `isAutomatable(risk)` — Check if action can be auto-executed
- `requiresApproval(risk)` — Check if action requires approval
- `Action`, `ExecutionPlan`, `RiskLevel`, `ActionType` types

### `@forge/ai-engine`

AI provider abstraction layer with production provider implementations.

**Exports:**

- `AIProvider` interface with `generate()`, `stream()`, `health()` methods
- `ProviderFactory` — creates providers from configuration
- `AIRequest`, `AIResponse`, `ProviderCapabilities` types
- `RetryEngine` — deterministic retry with exponential backoff
- `RateLimiter` — in-memory per-provider throttling
- `FallbackChain` — OpenAI → Anthropic → Gemini → OpenRouter → Ollama
- `CostTracker` — per-provider, per-project, per-mission cost tracking
- `AIRequestLogger` — structured AI request logging
- `PromptHistory` — persistent prompt execution history
- Provider implementations: OpenAI, Anthropic, Gemini, OpenRouter, Ollama

### `@forge/optimization-composer`

Transforms reviewed patches into structured, dependency-aware, prioritized bundles.

**Exports:**

- `compose(patches)` — Main composition function
- `PatchGraph` — DAG of patch dependencies
- `ConflictDetector` — selector-level conflict detection
- `PatchBundler` — groups patches into logical bundles
- `GoalAssigner` — assigns optimization goals to bundles
- `PriorityAssigner` — assigns critical/high/medium/low priorities
- `PreviewGenerator` — deterministic optimization preview
- `PatchBundle`, `PatchConflict`, `OptimizationGoal`, `OptimizationPreview` types

### `@forge/dom-engine`

DOM mapping and smart patch engine for precise content targeting.

**Exports:**

- `detectFormat()` — Detect Elementor, Gutenberg, or generic HTML format
- `mapHtmlToDom()` — Build a DOM map from raw HTML (sections, blocks, anchors, selectors)
- `resolveSelector()` — Resolve a selector using multiple fallback strategies (CSS, XPath, text anchor, heading anchor, structural)
- `buildTextAnchor()`, `buildSiblingAnchor()`, `buildHeadingAnchor()`, `buildStructuralPath()` — Stable anchor builders
- `applyContentPatch()` — Apply a ContentPatch to a DOM map and produce a PatchPreview
- `validatePatchAgainstTree()` — Validate a patch against the DOM tree
- `mergePatches()` — Merge multiple patches with conflict detection
- `applyPatches()` — Apply a sequence of patches in order
- `parseElementorData()` — Parse Elementor JSON into a content node tree
- `parseGutenbergBlocks()` — Parse Gutenberg block grammar into content nodes
- `renderHtmlPreview()` — Generate before/after/diff HTML preview
- `renderStructuredPreview()` — Generate structured patch preview
- CLI functions: `mapPage()`, `previewPatches()`, `patchContent()`, `validatePatches()`, `inspectPage()`

---

## Sprint 2 — Website Reader Foundation (v0.2.0)

- ✅ `@forge/core` extended with `WebsiteSnapshot` and `WebsiteReadError`
- ✅ `@forge/tools` package created with `html-parser` and `website-reader`
- ✅ CLI extended with `forge read` command
- ✅ Unit tests with fixture HTML files (26 total tests)

---

## Sprint 3 — Analysis Engine (v0.3.0)

- ✅ `@forge/core` extended with `Severity`, `Category`, `Finding`, `AnalysisReport`, `AnalysisRule`, `Evidence`
- ✅ `@forge/capabilities` package created
- ✅ `homepage-analysis` capability implemented
- ✅ 21 analysis rules implemented (deterministic, no AI)
- ✅ CLI extended with `forge analyze` command
- ✅ Unit tests for analysis engine and rules (8 tests)

**Rules implemented:**

| Code                       | Title                      | Severity | Category      |
| -------------------------- | -------------------------- | -------- | ------------- |
| MISSING_TITLE              | Missing Title              | critical | seo           |
| TITLE_TOO_SHORT            | Title Too Short            | low      | seo           |
| TITLE_TOO_LONG             | Title Too Long             | medium   | seo           |
| TITLE_DUPLICATE_WORDS      | Duplicate Words in Title   | low      | seo           |
| MISSING_META_DESCRIPTION   | Missing Meta Description   | high     | seo           |
| META_DESCRIPTION_TOO_SHORT | Meta Description Too Short | low      | seo           |
| META_DESCRIPTION_TOO_LONG  | Meta Description Too Long  | medium   | seo           |
| MISSING_H1                 | Missing H1                 | high     | seo           |
| MULTIPLE_H1                | Multiple H1                | medium   | seo           |
| HEADING_HIERARCHY          | Skipped Heading Level      | low      | seo           |
| MISSING_ALT                | Missing Alt Text           | medium   | accessibility |
| EMPTY_ALT                  | Empty Alt Text             | low      | accessibility |
| EMPTY_ANCHOR_TEXT          | Empty Anchor Text          | low      | seo           |
| SUSPICIOUS_URLS            | Suspicious URLs            | info     | links         |
| EXTERNAL_LINK_REL          | External Link Needs Rel    | info     | links         |
| MISSING_CANONICAL          | Missing Canonical          | medium   | seo           |
| MISSING_OG                 | Missing Open Graph         | high     | metadata      |
| MISSING_TWITTER            | Missing Twitter Card       | low      | metadata      |
| ROBOTS_NOINDEX             | noindex Directive          | critical | seo           |
| ROBOTS_NOFOLLOW            | nofollow Directive         | medium   | seo           |
| MISSING_LANG               | Missing Language           | low      | accessibility |
| MISSING_JSONLD             | Missing JSON-LD            | info     | technical     |

---

## Sprint 4 — Recommendation Engine + Plugin Registry (v0.4.0)

### Part 1: Sprint 3 Improvements

- ✅ Removed `RecommendationPlaceholder` from Finding (separate concepts)
- ✅ Stable Finding IDs using deterministic format (e.g., `seo.missing_title`)
- ✅ Rule Metadata with id, name, version, description, category, defaultSeverity
- ✅ Capability Manifest with id, name, version, description, supportedPlatforms, requiredTools, supportedInputs, supportedOutputs

### Part 2: Plugin Registry

- ✅ `@forge/plugin-registry` package created
- ✅ `PluginRegistry` class with register, unregister, get, list, exists, clear methods
- ✅ Strong typing for plugins with `Plugin` and `CapabilityManifest` interfaces
- ✅ Duplicate registration protection with `PluginAlreadyRegisteredError`
- ✅ `PluginNotFoundError` for missing plugins

### Part 3: Recommendation Engine

- ✅ `@forge/recommendation-engine` package created
- ✅ `generateRecommendations(report)` transforms AnalysisReport to RecommendationReport
- ✅ Recommendation generators for all core findings
- ✅ Deterministic, no-AI recommendation generation

**Recommendation Generators Implemented:**

| Finding ID               | Priority   | Difficulty | Impact |
| ------------------------ | ---------- | ---------- | ------ |
| seo.missing_title        | critical   | easy       | high   |
| seo.missing_meta_description | high    | easy       | high   |
| seo.title_too_short      | low        | easy       | medium |
| seo.title_too_long       | medium     | easy       | medium |
| seo.missing_h1           | high       | easy       | high   |
| seo.multiple_h1          | medium     | medium     | medium |
| metadata.missing_og      | high       | easy       | high   |
| seo.missing_canonical    | medium     | easy       | medium |
| accessibility.missing_lang | low      | easy       | low    |
| technical.missing_jsonld   | low       | medium     | high   |
| seo.robots_noindex       | critical   | easy       | high   |

### New Types (Sprint 4)

**Recommendation Types:**

- `Priority` — critical | high | medium | low
- `Difficulty` — easy | medium | hard
- `Impact` — high | medium | low
- `Recommendation` — action with steps, references, impact
- `RecommendationReport` — recommendations with summary and effort estimates
- `RecommendationStep` — ordered implementation steps

---

## Sprint 5 — Action Engine Foundation (v0.5.0)

### Action Engine Package

- ✅ `@forge/action-engine` package created
- ✅ Action types defined: `Action`, `ExecutionPlan`, `RiskLevel`, `ActionType`, `ActionStatus`
- ✅ Risk assessment with Policy Engine
- ✅ Action-to-recommendation mapping
- ✅ Approval Queue for manual review workflow
- ✅ CLI extended with `forge plan` command

### Risk Classification

Actions are classified by risk level:

| Risk Level | Automatable | Requires Approval | Examples |
| ---------- | ----------- | ----------------- | -------- |
| safe       | ✅          | ❌               | Adding title, meta description, Open Graph |
| moderate   | ❌          | ✅               | Adding canonical, fixing heading hierarchy |
| high       | ❌          | ✅               | Title length adjustments, adding alt text |
| critical   | ❌          | ✅               | Removing noindex directive |

### Execution Plan

The execution plan includes:

- Actions derived from recommendations
- Risk summary breakdown
- Approval queue for non-automated actions
- Estimated duration calculation

---

## Sprint 18 — Review Engine (v0.18.0)

The Review Engine sits between Content Generation and Execution. Nothing reaches WordPress until it has passed through Review.

- ✅ `@forge/review-engine` package created (deterministic, provider-independent, no LLM)
- ✅ `ReviewSession` / `ReviewItem` model: every `ContentPatch` becomes a reviewable item
- ✅ Pure deterministic `compareContent()` comparison engine (word/sentence/entity/keyword/heading deltas, readability + SEO delta)
- ✅ Approval policies: Strict, Balanced, Automatic, Enterprise (AI never approves)
- ✅ Filtering (section/severity/confidence/status/provider/generator/patch type) and sorting (confidence/severity/impact/createdAt/section)
- ✅ Review metrics: approval rate, rejection rate, average confidence/impact, warnings, high-risk changes, token estimate, execution time
- ✅ Markdown / JSON / HTML report exports
- ✅ Memory events recorded (review-created/approved/rejected/commented/completed)
- ✅ Per-project knowledge tracking (average approval rate, preferred review style, common rejected patterns, frequently edited sections)
- ✅ Pipeline Engine gains seven reusable steps — review-create, review-filter, review-sort, review-approve, review-export, review-summary, review-metrics
- ✅ Homepage Optimization now produces a Review Session instead of executing immediately
- ✅ CLI gains a `forge review` command group: `create`, `show`, `approve`, `reject`, `edit`, `export`, `metrics`, `comments`, `apply`, `rollback`
- ✅ Sessions persisted under `projects/<project>/reviews/{active,completed}/<sessionId>.json` with a lightweight `index.json`

**Review flow:**

```text
ContentPatch
  ↓
Review Engine (ReviewSession, compareContent, policies, metrics)
  ↓
Approval
  ↓
Execution Plan
  ↓
Execution Engine (dry-run OR real, provider decides)
  ↓
Provider
```

**Out of scope:** visual review UI, scheduling, background workers, publishing, WordPress writes, real AI approval (Sprint 19+).

---

## Sprint 19 — Production AI Providers + Optimization Composer (v0.19.0)

Sprint 19 replaces all mock AI providers with production-ready implementations and introduces the Optimization Composer layer between Review and Execution.

### Production AI Providers

- ✅ Five production providers: OpenAI, Anthropic, Google Gemini, OpenRouter, Ollama
- ✅ All providers implement the common `AIProvider` interface
- ✅ Provider configuration system via `@forge/config` (no hardcoded values)
- ✅ `ProviderFactory` creates providers from configuration
- ✅ Provider capabilities: streaming, system prompts, JSON mode, vision, reasoning, function calling, large context
- ✅ `AIRequest` / `AIResponse` models with full metadata
- ✅ Deterministic retry engine (429/503/timeout only, exponential backoff)
- ✅ In-memory rate limiting (per-provider, sliding window)
- ✅ Provider-aware fallback chain (OpenAI → Anthropic → Gemini → OpenRouter → Ollama)
- ✅ Cost tracking per provider, project, mission, month
- ✅ AI request logging (never stores API keys)
- ✅ Prompt execution history persisted to disk
- ✅ Prompt registry expanded with versions, provider overrides, schema validation, compatibility
- ✅ Prompt rendering upgraded with conditionals, loops, partials, escaping, strict validation
- ✅ Context builder expanded with project profile, knowledge graph, memory timeline, mission, strategy, Page DNA, section, brand profile, competitor snapshot, review summary, previous patches
- ✅ CLI commands: `forge ai providers`, `forge ai models`, `forge ai test`, `forge ai benchmark`, `forge ai cost`, `forge ai prompt`, `forge ai logs`, `forge ai history`
- ✅ Pipeline integration: ai-request, ai-response, prompt-render, provider-select, provider-fallback, cost-record, history-record
- ✅ Homepage generation uses real providers
- ✅ Section generation uses real providers
- ✅ Mock providers removed

### Optimization Composer

The Composer sits between Review and Execution, transforming flat patch lists into structured, dependency-aware, prioritized bundles.

- ✅ **PatchGraph** — DAG of patch dependencies (e.g., Hero → CTA → FAQ → Schema)
- ✅ **Conflict Detection** — detects when multiple patches touch the same selector
- ✅ **Patch Bundles** — groups patches into logical bundles (Homepage Optimization, Blog Improvements, etc.)
- ✅ **Optimization Goals** — every bundle knows WHY it exists (Increase conversions, Improve Local SEO, etc.)
- ✅ **Rollback Groups** — rollback entire bundles as one transaction
- ✅ **Optimization Preview** — deterministic preview with estimated SEO/UX/content quality impact
- ✅ **Batch Validation** — validates patches together, not separately
- ✅ **Patch Priorities** — critical → high → medium → low execution order
- ✅ CLI commands: `forge compose`, `forge compose graph`, `forge compose bundles`, `forge compose conflicts`, `forge compose preview`, `forge compose validate`, `forge compose execute`

**New flow:**

```text
Generate
  ↓
Review
  ↓
Compose (PatchGraph → Conflict Detection → Bundles → Goals → Priorities → Preview)
  ↓
Validate (Batch Validation)
  ↓
Execute (Priority order, Rollback Groups)
```

**Out of scope:** scheduling, dashboard, analytics, cloud sync, database, background workers, publishing, automatic execution.

---

## Sprint 20 — AI Content Generation Engine (v0.20.0)

Sprint 20 builds Forge's first production-grade AI writing system capable of generating high-quality, EEAT-focused, 2026-standard SEO content. It expands `@forge/content-generation` with brand-aware writers, deterministic validation, quality scoring, and full pipeline integration.

**Architectural correction:** No new `ai-writing-engine` package was created. All AI writing capabilities belong inside `@forge/content-generation`, which already owns content generation.

### Brand Profile in `@forge/core`

- ✅ `BrandProfile` interface moved to `@forge/core` (reused across content-generation, context-builder, homepage-engine, CLI)

### Content Generation Expansion

- ✅ **ContentBriefBuilder** — deterministic brief construction from PageDNA + BrandProfile + KnowledgeGraph + MemoryStore
- ✅ **VoiceProfile** — deterministic voice detection (Professional, Friendly, Luxury, Technical, Medical, Legal, Playful, Corporate, Educational, Conversational, Minimalist, Authoritative) plus sentence/paragraph/passive voice/reading grade metrics
- ✅ **15 Specialized Writers** — hero, benefits, features, services, products, about, FAQ, buying guide, comparison, testimonials, CTA, contact, introduction, conclusion, blog
- ✅ **BaseSectionWriter** — shared base class for all writers (provider selection, prompt composition, response parsing, validation, patch creation)
- ✅ **PromptComposer** — registry-backed prompt composition (integrates with existing `@forge/prompt-registry`)
- ✅ **Deterministic Validator** — SEO, quality, EEAT, readability, compliance (no LLM calls)
- ✅ **Quality Scorer** — seoScore, eeatScore, readabilityScore, naturalnessScore, brandVoiceScore, overallScore

### Pipeline Integration

- ✅ 8 new pipeline steps: content-brief, brand-profile, voice-profile, writer-select, prompt-compose, ai-write, content-validate, content-score

### Homepage Engine Update

- ✅ Homepage optimization now uses: PageDNA → BrandProfile → ContentBrief → Writer → Validation → Scoring → ContentPatch → Review

### CLI

- ✅ `forge write hero`, `forge write faq`, `forge write blog`, `forge write section`, `forge write preview`, `forge write validate`, `forge write score`
- ✅ All support `--project`, `--provider`, `--model`, `--json`, `--preview`, `--dry-run`

### Constraints

- ❌ No automatic publishing, WordPress execution, scheduling, background jobs, dashboards, analytics, cloud sync, database, autonomous execution
- ✅ All content becomes `ContentPatch` → `Review` → `Compose` → `Execute`
- ✅ Provider-agnostic through `@forge/ai-engine`

**Architecture flow after Sprint 20:**

```text
Mission
  ↓
Agent
  ↓
Strategy
  ↓
Pipeline
  ↓
Content Intelligence (PageDNA, ContentGraph)
  ↓
Content Generation (ContentBrief → BrandProfile → Voice → Writer → Validate → Score)
  ↓
ContentPatch
  ↓
Review
  ↓
Optimization Composer
  ↓
Execution
```

---

## Sprint 21 — DOM Mapping & Smart Patch Engine (v0.21.0)

Sprint 21 builds the engine that maps Content Intelligence output to the actual HTML/WordPress/Elementor DOM so AI patches can be applied precisely instead of replacing large chunks of content. Forge can now locate the exact Hero, CTA, FAQ, Feature List, etc. inside an Elementor page.

### DOM Engine Package

- ✅ `@forge/dom-engine` package created (`packages/dom-engine/`)
- ✅ Deterministic DOM mapping with stable anchors
- ✅ Section mapping (every detected PageDNA section maps to a DOMSection)
- ✅ Block mapping (headings, paragraphs, lists, buttons, images, FAQ items, testimonials, cards)
- ✅ Stable anchor system (text anchors, DOM position, sibling anchors, parent anchors, heading anchors)
- ✅ Selector resolution with multiple fallback strategies (CSS → XPath → Stable Anchor → Heading Anchor → Text Match → Structural Match)
- ✅ Elementor builder support (containers, sections, columns, widgets: heading, text editor, button, image, icon list, accordion, tabs, testimonials, loop grid, forms)
- ✅ Gutenberg builder support (paragraph, heading, columns, image, gallery, buttons, cover, quote, list, table, embed)
- ✅ Generic HTML builder fallback

### Smart Patch Engine

- ✅ `applyPatch()` accepts DOMMap + ContentPatch → PatchPreview
- ✅ Patch operations: replace text, insert, append, prepend, delete, replace HTML, replace attribute, replace image alt, replace heading, replace button text, replace FAQ answer
- ✅ Patch validation (selector exists, anchor valid, block exists, safe operation, correct type)
- ✅ Patch merging (duplicate edits, overlapping edits, conflicts, ordering)
- ✅ Preview HTML generation (before.html, after.html, diff.html) without touching WordPress

### CLI

- ✅ `forge dom map` — Build a DOM map from HTML
- ✅ `forge dom preview` — Generate preview HTML
- ✅ `forge dom patch` — Apply a ContentPatch
- ✅ `forge dom validate` — Validate a ContentPatch
- ✅ `forge dom inspect` — Inspect a DOM map

### Pipeline Integration

- ✅ New pipeline steps: dom-map, selector-resolve, patch-validate, patch-merge, patch-preview

### Homepage Integration

- ✅ Homepage optimization now uses DOMMap instead of raw HTML

### AI Integration

- ✅ Content Generation now outputs ContentPatch → DOM Engine → Preview → Review Engine
- ✅ No direct HTML rewriting

### Review Integration

- ✅ Review Engine displays: Original → Modified → HTML Diff → Selector → Confidence

### Architecture Flow After Sprint 21

```text
Mission
  ↓
Agent
  ↓
Strategy
  ↓
Pipeline
  ↓
Content Intelligence (PageDNA, ContentGraph)
  ↓
Content Generation (ContentBrief → BrandProfile → Voice → Writer → Validate → Score)
  ↓
ContentPatch
  ↓
DOM Engine (DOMMap → Selector Resolution → Patch Application → Preview)
  ↓
Review
  ↓
Optimization Composer
  ↓
Execution
```

### Constraints

- ❌ No visual builder, browser automation, publishing, dashboards
- ✅ Intelligent DOM mapping and precise patch application
- ✅ Elementor, Gutenberg, and generic HTML compatibility
- ✅ Future builder compatibility through format detection
- ✅ All patches applied to preview HTML only (no WordPress writes)

---

## License

Private. All rights reserved.