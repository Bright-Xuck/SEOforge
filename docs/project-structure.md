# Forge Project Structure

**Version:** v0.23.0 (Sprint 23 — DOM Engine & Universal Page Model)

## Directory Layout

```
apps/
  cli/                              # @forge/cli — Commander CLI
    src/
      index.ts                      # All CLI command definitions

packages/
  core/                             # @forge/core
  shared/                           # @forge/shared
  config/                           # @forge/config
  logger/                           # @forge/logger
  tools/                            # @forge/tools (html-parser, website-reader)
  capabilities/                     # @forge/capabilities
  plugin-registry/                  # @forge/plugin-registry
  recommendation-engine/            # @forge/recommendation-engine
  action-engine/                    # @forge/action-engine
  pipeline-engine/                  # @forge/pipeline-engine
  preflight-validator/              # @forge/preflight-validator
  execution-engine/                 # @forge/execution-engine
  providers-wordpress/              # @forge/providers-wordpress
  project-resolver/                 # @forge/project-resolver
  knowledge-engine/                 # @forge/knowledge-engine
  memory-engine/                    # @forge/memory-engine
  context-builder/                  # @forge/context-builder
  content-intelligence/             # @forge/content-intelligence
  content-generation/               # @forge/content-generation
  dom-engine/                       # @forge/dom-engine — Universal Page Model, builder detection, DOM diff, rich text, validation
    src/
      builder/                      # Builder detection (Elementor, Gutenberg, Classic, Bricks)
      page/                         # Universal Page builder (Page → Regions → Sections → Blocks → Elements)
      ids/                          # Stable ID generation
      selectors/                    # CSS, XPath, DOM path, stable Forge selectors
      regions/                      # Region detection (Header, Hero, Nav, Footer, etc.)
      semantics/                    # Semantic section classification
      diff/                         # DOM diff engine
      richtext/                     # Rich text model & patches
      validation/                   # DOM validation
  ai-engine/                        # @forge/ai-engine
  skills/                           # @forge/skills
  prompt-registry/                  # @forge/prompt-registry
  agent-engine/                     # @forge/agent-engine
  strategy-engine/                  # @forge/strategy-engine
  mission-engine/                   # @forge/mission-engine
  review-engine/                    # @forge/review-engine
  optimization-composer/            # @forge/optimization-composer
  optimization-orchestrator/        # @forge/optimization-orchestrator
  homepage-engine/                  # @forge/homepage-engine
```

## Layer Ownership

| Package               | Layer                      | Domain                   |
|-----------------------|-----------------------------|--------------------------|
| `core`                | Domain models               | Platform-independent     |
| `shared`              | Utilities                   | Cross-cut                |
| `config`              | Configuration               | Environment              |
| `logger`              | Logging                     | Cross-cut                |
| `tools`               | External capabilities       | HTML parsing, reading    |
| `capabilities`        | Analysis                   | Deterministic SEO        |
| `plugin-registry`     | Extensions                 | Cross-cut                |
| `recommendation-engine` | Finding → recommendation | Core logic               |
| `action-engine`       | Execution planning          | Core logic               |
| `pipeline-engine`     | Pipeline orchestration      | Core logic               |
| `preflight-validator` | Pre-execution checks       | Core logic               |
| `execution-engine`    | Execution                  | Provider integration     |
| `providers-wordpress` | WordPress API              | Provider                 |
| `project-resolver`    | Project resolution         | Project management       |
| `knowledge-engine`    | Project knowledge store    | Project management       |
| `memory-engine`       | Event-sourced memory       | Project management       |
| `context-builder`     | AI context assembly        | Project management       |
| `content-intelligence` | Content understanding     | Intelligence (deterministic) |
| `content-generation`  | Section patch generation   | AI Generation            |
| `dom-engine`          | Universal Page Model       | DOM                      |
| `ai-engine`           | Provider abstraction       | AI                       |
| `skills`              | Skill registry             | AI                       |
| `prompt-registry`     | Prompt templates           | AI                       |
| `agent-engine`        | Agent framework            | Orchestration            |
| `strategy-engine`     | Strategy engine            | Orchestration            |
| `mission-engine`      | Mission templates          | Orchestration            |
| `review-engine`       | Review & approval          | Quality                  |
| `optimization-composer` | Bundle composer          | Optimization             |
| `homepage-engine`     | Homepage optimization      | Domain-specific          |

## Dependency Rules

Actual imports must follow these rules. Violations break architecture.

| Package | May Import | Must Never Import |
|---|---|---|
| `core` | (no Forge packages — pure domain) | All other packages |
| `shared` | core | Any layer package |
| `logger` | core | Any other packages |
| `config` | core | Any other packages |
| `tools` | core, shared, logger | Any other packages |
| `capabilities` | core, shared, tools | ai-engine, skills, providers, execution, content-generation |
| `plugin-registry` | core, shared | Any other packages |
| `recommendation-engine` | core, shared, tools | ai-engine, execution, providers |
| `action-engine` | core, shared, recommendation-engine | ai-engine, providers |
| `pipeline-engine` | core, shared | ai-engine, providers, content-generation |
| `preflight-validator` | core, shared, action-engine | providers, content-generation |
| `execution-engine` | core, shared, action-engine, preflight-validator, providers-wordpress | content-generation, skills, ai-engine |
| `providers-wordpress` | core, shared, config, logger | ai-engine, content-generation, skills |
| `project-resolver` | core, shared | Any other packages |
| `knowledge-engine` | core, shared | Any other packages |
| `memory-engine` | core, shared, knowledge-engine | skills, ai-engine, content-generation |
| `context-builder` | core, project-resolver, knowledge-engine, memory-engine | content-generation, providers |
| `content-intelligence` | core, shared, tools, logger | ai-engine, prompt-registry, skills, providers, execution-engine, content-generation |
| `content-generation` | core, shared, ai-engine, prompt-registry, skills, tools | providers-wordpress, execution-engine, homepage-engine, optimization-composer |
| `dom-engine` | core, shared, tools, content-intelligence | providers, execution-engine, content-generation |
| `ai-engine` | core, shared, config, logger | providers-wordpress, content-intelligence, execution-engine |
| `skills` | core, shared, ai-engine, prompt-registry | providers-wordpress, execution-engine |
| `prompt-registry` | core, shared | Any other packages |
| `agent-engine` | core, shared, skills, pipeline-engine | content-intelligence, content-generation, providers, execution |
| `strategy-engine` | core, shared, pipeline-engine | providers, content-generation |
| `mission-engine` | core, shared, pipeline-engine, agent-engine, strategy-engine | content-generation, providers |
| `review-engine` | core, shared, action-engine | ai-engine, content-generation, skills |
| `optimization-composer` | core, shared, content-intelligence, review-engine | content-generation, providers, execution-engine |
| `homepage-engine` | core, shared, tools, content-intelligence, content-generation, review-engine, execution-engine | providers (directly; uses via exec) |

## Ownership Matrix

| Package | Owned By | Status |
|---|---|---|
| `core` | Platform team | Stable |
| `shared` | Platform team | Stable |
| `logger` | Platform team | Stable |
| `config` | Platform team | Stable |
| `tools` | Platform team | Stable |
| `capabilities` | Platform team | Stable |
| `plugin-registry` | Platform team | Stable |
| `recommendation-engine` | Intelligence team | Stable |
| `action-engine` | Intelligence team | Stable |
| `pipeline-engine` | Intelligence team | Stable |
| `preflight-validator` | Intelligence team | Stable |
| `execution-engine` | Intelligence team | Stable |
| `providers-wordpress` | Provider team | Stable |
| `project-resolver` | Intelligence team | Stable |
| `knowledge-engine` | Intelligence team | Stable |
| `memory-engine` | Intelligence team | Stable |
| `context-builder` | Intelligence team | Stable |
| `content-intelligence` | Intelligence team | Stable |
| `content-generation` | AI team | Stable |
| `dom-engine` | DOM team | New in Sprint 23 |
| `ai-engine` | AI team | Stable |
| `prompt-registry` | AI team | Stable |
| `skills` | AI team | Stable |
| `agent-engine` | Intelligence team | Stable |
| `strategy-engine` | Intelligence team | Stable |
| `mission-engine` | Intelligence team | Stable |
| `review-engine` | Intelligence team | Stable |
| `optimization-composer` | Intelligence team | Future refinement |
| `optimization-orchestrator` | Intelligence team | New in Sprint 22B |
| `homepage-engine` | AI team | Stable |

---

*Updated Sprint 23. All 30 packages documented. DOM Engine is the canonical website parser — everything that reads or writes HTML must use it.*
