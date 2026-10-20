# Forge

**Autonomous Website Optimization Platform — Architecture & CLI Reference**

Forge is a layered, deterministic-first platform for analyzing, generating, reviewing, composing, and executing website optimizations. It integrates with WordPress and other providers through a strict orchestration chain.

**Dependency hygiene:** `pnpm check:deps` runs `scripts/audit-unused-deps.mjs --strict` and fails when any package declares a dependency its source never imports. Manifests must match reality — see `docs/dependency-graph.md` → *Dependency Hygiene*.

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

### Site-level Content Intelligence (Sprint 24 — extension of Content Intelligence, deterministic, no AI)

These commands treat the site as a complete content system, composing the existing
PageDNA / ContentGraph / gap / quality data across pages. They are intelligence and
planning only — nothing is generated, linked, or written.

| Command | Description |
|---|---|
| `forge content site-analyze` | Full site analysis: model, topic graph, clusters, authority, opportunities, refresh, links (`--project`, `--depth`, `--limit`, `--json`). Records a `site-analysis` memory event. |
| `forge content topics` | Topic graph with related/supporting/parent/child topics and associated entities |
| `forge content clusters` | Topic clusters with coverage scores and missing coverage |
| `forge content authority` | Forge diagnostic authority/coverage scores (0-100, never Google rankings) |
| `forge content opportunities` | Site-level content opportunities (thin pages, missing FAQ/comparison/guides, glossary, etc.) |
| `forge content refresh` | Refresh candidates with reasons, affected dimensions, and priority |
| `forge content links` | Internal link opportunities (orphans, weak pages, missing hub/supporting links) — output only |

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
| `forge wp elementor doctor [<page>]` | Typed health check: reachability, auth, Elementor availability/version, document writability (`--json`) |
| `forge wp elementor inspect <page>` | Inspect an Elementor document (fingerprint, widgets, editable/unsupported controls; `--json`, `--raw`) |
| `forge wp elementor preview <page> --patch <file>` | Preview the exact Elementor change (SAFE, zero remote writes) |
| `forge wp elementor validate <page> --patch <file>` | Validate a patch (resolution, compatibility, mutation; SAFE) |
| `forge wp elementor apply <page> --patch <file>` | Dry-run by default; `--apply` writes then re-reads and verifies structurally; `--output` saves rollback payload |
| `forge wp elementor rollback <page> --original <file>` | Restore the original Elementor document (refuses to overwrite newer changes; `--force` overrides) |
| `forge fetch <site> <username> <password>` | Fetch all site data |

Elementor commands accept `<site> <username> <password>` positionally or the
`FORGE_WP_SITE_URL` / `FORGE_WP_USERNAME` / `FORGE_WP_APPLICATION_PASSWORD` environment
variables with just the page.
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
**Deterministic.** PageDNA, ContentGraph, Section detection, Entity extraction, Gap detection, Quality scoring — plus **site-level Content Intelligence** (Sprint 24): a Site Content Model, topic graph, topic clusters, authority/coverage scoring, content opportunities, refresh detection, and internal link opportunities composed across pages. Never imports AI or providers. Site-level intelligence consumes the existing knowledge/memory shapes and the `@forge/dom-engine` Universal Page Model; it never parses HTML itself.

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

## Sprint History

Sprint development records are maintained in `docs/sprint-*.md`. The full Sprint history can be found there. This README reflects architecture as of Sprint 25.

### Sprint 24 — Site-Level Content Intelligence (extension of `@forge/content-intelligence`)

Sprint 24 extends Content Intelligence with a site-level analysis layer. It is NOT a new engine. The flow:

```
Page-level Content Intelligence (PageDNA / ContentGraph / gaps / quality)
        ↓
Site-level Content Intelligence (Site Content Model → Topic Graph → Clusters → Authority → Opportunities → Refresh → Internal Links)
        ↓
Knowledge / Memory (consumed for brand, entities, history; site-analysis events recorded)
        ↓
Generation / Review / Optimization (downstream consumers; nothing executed here)
```

New CLI: `forge content site-analyze|topics|clusters|authority|opportunities|refresh|links`. New pipeline: `site-intelligence`. New orchestrator engine: `site-intelligence` (outputs only, never executes).

### Sprint 25 — Universal Patch Application & Elementor/WordPress Write Bridge (extension of `@forge/dom-engine` + `@forge/providers-wordpress`)

Sprint 25 establishes a safe, provider-aware path from rendered WordPress page → Universal Page Model → ContentPatch → Review → Composer → Execution → WordPress Provider → **Elementor document data** → updated rendered page. It is NOT a new engine and does NOT use Elementor MCP.

```
Rendered WordPress page
        ↓
Universal Page Model (dom-engine)
        ↓
ElementorDocument (dom-engine parses _elementor_data — source of truth)
        ↓
resolve → mutate → verify (deterministic, stale-safe)
        ↓
ElementorDocumentTransport (providers-wordpress, companion endpoint)
        ↓
ElementorWriteBridge (CLI composition root)
        ↓
WordPress Provider → Elementor native save → re-read verification
```

Key additions (all deterministic):

- **`@forge/dom-engine`** — `ElementorDocument` model (version + fingerprint), UniversalPage ↔ Elementor mapping (via rendered `data-id`), `resolveElementorPatch` with typed error codes (`PATCH_TARGET_NOT_FOUND/AMBIGUOUS/NOT_EDITABLE/STALE/UNSUPPORTED_WIDGET/UNSUPPORTED_VERSION/INVALID_TARGET`), rich-text allowlist rules, and `applyElementorMutations` / `verifyElementorMutation`.
- **`@forge/providers-wordpress`** — `ElementorDocumentTransport` (read/write with optimistic concurrency), provider `getElementorDocument` / `updateElementorDocument`, `applyWrite` routing + re-read verification, and an optional companion plugin (`packages/providers-wordpress/companion/forge-elementor-bridge.php`) that exposes the controlled endpoint and saves through Elementor's native API.
- **CLI** — `forge wp elementor inspect|preview|validate|apply|rollback`. `apply` is dry-run by default; `--apply` performs the write; rollback restores the exact original document.

Safety guarantees: dry-run = zero remote mutations; stale patches are rejected; writes are atomic whole-document replacements verified by re-read; unknown Elementor settings and `__globals__` survive round trips; unsupported widgets/versions are refused rather than guessed.

### Sprint 26 — Production Elementor Integration & End-to-End Workflow Hardening

Sprint 26 hardens (not expands) the Sprint 25 path against real WordPress/Elementor sites:

- **`forge wp elementor doctor`** — typed health check (WP reachability, auth validity,
  Elementor availability/version, target-page existence/Elementor-state/readability/writability),
  backed by a new companion-plugin `GET /wp-json/forge/v1/system` contract.
- **Real-defect fixes found by auditing the source:** the write and
  rollback-after-apply paths could never succeed on a real site (a stale
  structural-equality guard rejected every mutation; read/write timestamps used
  incompatible formats; rollback sent the pre-apply timestamp); client-side
  verification compared raw pretty-printed vs compact JSON strings. All fixed —
  writes are guarded by consistent ISO-8601 `expectedModified` + `expectedVersion`,
  validated payloads, server-side re-read verification (`verified` flag), and
  client-side *structural fingerprint* verification (which survives Elementor
  reformatting).
- **Typed failures everywhere:** transport plugin-body codes → bridge taxonomy
  (`ELEMENTOR_NOT_INSTALLED/AUTHENTICATION_FAILED/PAGE_NOT_FOUND/
  NOT_ELEMENTOR_DOCUMENT/DOCUMENT_STALE/UNSUPPORTED_WIDGET/UNSUPPORTED_SETTING/
  WRITE_FAILED/VERIFICATION_FAILED/ROLLBACK_FAILED/...`), shown as
  `Error [CODE]: actionable message` — raw PHP/HTTP errors are never the primary surface.
- **Patch resolution hardening** (`@forge/dom-engine`): new
  `PATCH_WIDGET_TYPE_CHANGED` and `PATCH_UNSUPPORTED_SETTING` codes, patches
  carry `expectedWidgetType` + `sourceFingerprint`, a deeply structural
  fingerprint (recursive key sort), and a provider-neutral
  `inventoryElementorDocument()` inspection model.
- **Rich-text safety:** URL-scheme allowlist (`isElementorUrlSafe`) enforced by the
  sanitizer — `javascript:`/`data:`/`vbscript:` hrefs are stripped, text survives.
- **Rollback:** payload gains `appliedFingerprint`; rollback validates payloads,
  refuses (by default) to overwrite newer documents, verifies by structural
  fingerprint, reports the final fingerprint (`--force` documents the override).
- **Observability:** `elementor-write`/`elementor-rollback` memory events through the
  existing MemoryStore — fingerprints, ids, provider, verification/rollback status. Never secrets.
- **Tests:** +34 tests (446 total): Phase-3/4 dom-engine cases, transport body-contract
  cases, bridge stale/verify/rollback-refusal/zero-write-regression cases, a full
  ContentPatch→Review→Composer→Bridge e2e suite, and two opt-in real-site suites
  (transport + full 13-step workflow).

See `docs/sprint-26.md` for the audit, workflow, integration-test setup, security model, and limitations.