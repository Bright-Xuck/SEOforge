# Forge

AI Operating System for Websites.

Forge is a modular, extensible platform for understanding, improving, operating, and maintaining websites. It is not an SEO tool, chatbot, or WordPress plugin — SEO is one capability among many.

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
│   └── recommendation-engine/  # Deterministic recommendation generation
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

---

## Sprint 2 — Website Reader Foundation (v0.2.0)

- ✅ `@forge/core` extended with `WebsiteSnapshot` and `WebsiteReadError`
- ✅ `@forge/tools` package created with `html-parser` and `website-reader`
- ✅ CLI extended with `forge read` command
- ✅ Unit tests with fixture HTML files (26 total tests)

---

## Sprint 3 — Analysis Engine (v0.3.0)

- ✅ `@forge/core` extended with `Severity`, `Category`, `Finding`, `AnalysisReport`, `AnalysisRule`, `Evidence`, `RecommendationPlaceholder`
- ✅ `@forge/capabilities` package created
- ✅ `homepage-analysis` capability implemented
- ✅ 26 analysis rules implemented (deterministic, no AI)
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

## License

Private. All rights reserved.
