# Forge Package Responsibility Catalog

**Version:** v0.22.0 (Sprint 22A)

## @forge/core

| Field | Value |
|---|---|
| **Purpose** | Domain models and contracts. Platform-independent, no runtime dependencies. |
| **Inputs** | None (pure types) |
| **Outputs** | `---`, `Category`, `Finding`, `AnalysisReport`, `AnalysisRule`, `ReadMode`, `WriteOperation`, `Provider`, `WebsiteSnapshot` |
| **Deterministic** | ✅ |
| **May import** | (no Forge packages) |
| **Must never import** | All other packages |
| **Owned by** | Platform team |

## @forge/shared

| Field | Value |
|---|---|
| **Purpose** | Shared constants (FORGE_NAME, FORGE_VERSION) and cross-package utilities |
| **Inputs** | None |
| **Outputs** | Constants, utility functions |
| **Deterministic** | ✅ |
| **May import** | core |
| **Must never import** | Any layer package |
| **Owned by** | Platform team |

## @forge/config

| Field | Value |
|---|---|
| **Purpose** | Environment configuration loading and validation |
| **Inputs** | Environment variables, config files |
| **Outputs** | Parsed configuration object |
| **Deterministic** | ✅ |
| **May import** | core |
| **Must never import** | Any other packages |
| **Owned by** | Platform team |

## @forge/logger

| Field | Value |
|---|---|
| **Purpose** | Structured logging channel |
| **Inputs** | Log messages, metadata |
| **Outputs** | Formatted log output |
| **Deterministic** | ✅ |
| **May import** | core |
| **Must never import** | Any other packages |
| **Owned by** | Platform team |

## @forge/tools

| Field | Value |
|---|---|
| **Purpose** | External capabilities: HTML parsing (Cheerio), website reading (URL → WebsiteSnapshot) |
| **Inputs** | URL, raw HTML |
| **Outputs** | Parsed DOM, WebsiteSnapshot |
| **Deterministic** | ✅ |
| **May import** | core, shared, logger |
| **Must never import** | Any other packages |
| **Owned by** | Platform team |

## @forge/capabilities

| Field | Value |
|---|---|
| **Purpose** | Analysis engine and rules for WebsiteSnapshot |
| **Inputs** | WebsiteSnapshot |
| **Outputs** | AnalysisReport, homepage analysis |
| **Deterministic** | ✅ |
| **May import** | core, shared, tools |
| **Must never import** | ai-engine, skills, providers, execution, content-generation |
| **Owned by** | Platform team |

## @forge/plugin-registry

| Field | Value |
|---|---|
| **Purpose** | Central extension registry |
| **Inputs** | Plugin definitions |
| **Outputs** | PluginRegistry, Plugin, CapabilityManifest |
| **Deterministic** | ✅ |
| **May import** | core, shared |
| **Must never import** | Any other packages |
| **Owned by** | Platform team |

## @forge/recommendation-engine

| Field | Value |
|---|---|
| **Purpose** | Finding → recommendation conversion with risk scoring |
| **Inputs** | AnalysisReport, findings |
| **Outputs** | Recommendations with risk scores |
| **Deterministic** | ✅ |
| **May import** | core, shared, tools |
| **Must never import** | ai-engine, execution, providers |
| **Owned by** | Intelligence team |

## @forge/action-engine

| Field | Value |
|---|---|
| **Purpose** | Execution planning, approval queue, risk assessment |
| **Inputs** | Recommendations |
| **Outputs** | ExecutionPlan, ApprovalQueue |
| **Deterministic** | ✅ |
| **May import** | core, shared, recommendation-engine |
| **Must never import** | ai-engine, providers |
| **Owned by** | Intelligence team |

## @forge/pipeline-engine

| Field | Value |
|---|---|
| **Purpose** | Pipeline orchestration. Registers pipelines, executes steps in dependency order |
| **Inputs** | Pipeline definition + runtime context |
| **Outputs** | PipelineResult (status, duration, step outputs) |
| **Deterministic** | ✅ |
| **May import** | core, shared |
| **Must never import** | ai-engine, providers, content-generation |
| **Owned by** | Intelligence team |

## @forge/preflight-validator

| Field | Value |
|---|---|
| **Purpose** | Pre-execution plan validation |
| **Inputs** | ExecutionPlan |
| **Outputs** | ValidationResult (pass/fail, issues) |
| **Deterministic** | ✅ |
| **May import** | core, shared, action-engine |
| **Must never import** | providers, content-generation |
| **Owned by** | Intelligence team |

## @forge/execution-engine

| Field | Value |
|---|---|
| **Purpose** | Apply approved ExecutionPlans to providers. Dry-run by default. Never generates content. |
| **Inputs** | ExecutionPlan, Provider |
| **Outputs** | ExecutionResult (completed, failed, skipped, rollbackPlan) |
| **Deterministic** | ✅ |
| **May import** | core, shared, action-engine, preflight-validator, providers-wordpress |
| **Must never import** | content-generation, skills, ai-engine |
| **Owned by** | Intelligence team |

## @forge/providers-wordpress

| Field | Value |
|---|---|
| **Purpose** | WordPress REST API provider (read & write) |
| **Inputs** | Provider config + WriteOperation / ReadRequest |
| **Outputs** | ProviderResult, SiteInfo, Capabilities |
| **Deterministic** | ✅ |
| **May import** | core, shared, config, logger |
| **Must never import** | ai-engine, content-generation, skills |
| **Owned by** | Provider team |

## @forge/project-resolver

| Field | Value |
|---|---|
| **Purpose** | Multi-source project resolution (CLI flag → env → cwd) |
| **Inputs** | CLI flags, environment, cwd |
| **Outputs** | Resolved project path |
| **Deterministic** | ✅ |
| **May import** | core, shared |
| **Must never import** | Any other packages |
| **Owned by** | Intelligence team |

## @forge/knowledge-engine

| Field | Value |
|---|---|
| **Purpose** | Project knowledge store (SEO data, keywords, competitors) |
| **Inputs** | Project data |
| **Outputs** | Knowledge profile |
| **Deterministic** | ✅ |
| **May import** | core, shared |
| **Must never import** | Any other packages |
| **Owned by** | Intelligence team |

## @forge/memory-engine

| Field | Value |
|---|---|
| **Purpose** | Event-sourced memory store for project history |
| **Inputs** | Events |
| **Outputs** | Memory timeline |
| **Deterministic** | ✅ |
| **May import** | core, shared, knowledge-engine |
| **Must never import** | skills, ai-engine, content-generation |
| **Owned by** | Intelligence team |

## @forge/context-builder

| Field | Value |
|---|---|
| **Purpose** | AI context assembly from project knowledge & memory |
| **Inputs** | Project context, knowledge, memory |
| **Outputs** | Assembled AI context |
| **Deterministic** | ✅ |
| **May import** | core, project-resolver, knowledge-engine, memory-engine |
| **Must never import** | content-generation, providers |
| **Owned by** | Intelligence team |

## @forge/content-intelligence

| Field | Value |
|---|---|
| **Purpose** | Deterministic content understanding — no AI, no generation |
| **Inputs** | WebsiteSnapshot (re-parsed HTML) |
| **Outputs** | PageDNA, ContentGraph, Sections, Entities, Topics, QualityScores, ContentGaps |
| **Deterministic** | ✅ — 100%, no AI, no network, no prompt registry |
| **May import** | core, shared, tools, logger |
| **Must never import** | ai-engine, prompt-registry, skills, providers, execution-engine, content-generation |
| **Owned by** | Intelligence team |

## @forge/content-generation

| Field | Value |
|---|---|
| **Purpose** | AI section-patch generation. Never publishes, never knows WordPress, never writes whole pages. |
| **Inputs** | PageDNA, sections, project context, brand profile, AI engine |
| **Outputs** | ContentPatch[] with validation |
| **Deterministic** | ❌ — uses AI |
| **May import** | core, shared, ai-engine, prompt-registry, skills, tools |
| **Must never import** | providers-wordpress, execution-engine, homepage-engine, optimization-composer |
| **Owned by** | AI team |

## @forge/dom-engine

| Field | Value |
|---|---|
| **Purpose** | DOM mapping, ContentPatch validation, patch preview generation |
| **Inputs** | HTML, ContentPatch |
| **Outputs** | DomMap, PatchValidation, PatchPreview |
| **Deterministic** | ✅ |
| **May import** | core, shared, tools, content-intelligence |
| **Must never import** | providers, execution-engine, content-generation |
| **Owned by** | AI team |

## @forge/ai-engine

| Field | Value |
|---|---|
| **Purpose** | Provider factory, rate limiter, retry engine, cost tracker, prompt history, provider logger |
| **Inputs** | Provider config, prompt, model |
| **Outputs** | AI response, cost data, logs |
| **Deterministic** | ❌ — wraps AI providers |
| **May import** | core, shared, config, logger |
| **Must never import** | providers-wordpress, content-intelligence, execution-engine |
| **Owned by** | AI team |

## @forge/skills

| Field | Value |
|---|---|
| **Purpose** | AI skill definitions with associated pipelines and prompts |
| **Inputs** | Skill ID, context |
| **Outputs** | Skill execution result |
| **Deterministic** | ❌ — uses AI |
| **May import** | core, shared, ai-engine, prompt-registry |
| **Must never import** | providers-wordpress, execution-engine |
| **Owned by** | AI team |

## @forge/prompt-registry

| Field | Value |
|---|---|
| **Purpose** | Prompt templates with versioning |
| **Inputs** | Prompt ID, variables |
| **Outputs** | Rendered prompt string |
| **Deterministic** | ✅ |
| **May import** | core, shared |
| **Must never import** | Any other packages |
| **Owned by** | AI team |

## @forge/agent-engine

| Field | Value |
|---|---|
| **Purpose** | Agent framework: SEOAgent, ContentAgent, LinkingAgent, SchemaAgent, AccessibilityAgent, PerformanceAgent, LearningAgent |
| **Inputs** | AgentContext (project profile, knowledge, memory, findings, pipeline) |
| **Outputs** | AgentExecutionResult (strategy, decisions, metadata) |
| **Deterministic** | ✅ (decision logic is rule-based) |
| **May import** | core, shared, skills, pipeline-engine |
| **Must never import** | content-intelligence, content-generation, providers, execution |
| **Owned by** | Intelligence team |

## @forge/strategy-engine

| Field | Value |
|---|---|
| **Purpose** | Strategy builder, validator, serialization (JSON/YAML) |
| **Inputs** | StrategyContext (project, agents, pipelines, skills, providers) |
| **Outputs** | Strategy (goals, priorities, pipeline selections, risk level) |
| **Deterministic** | ✅ |
| **May import** | core, shared, pipeline-engine |
| **Must never import** | providers, content-generation |
| **Owned by** | Intelligence team |

## @forge/mission-engine

| Field | Value |
|---|---|
| **Purpose** | Mission template sequences: plan → validate → export → execute |
| **Inputs** | Project context, available agents, skills, pipelines |
| **Outputs** | MissionPlan with sequenced steps |
| **Deterministic** | ✅ |
| **May import** | core, shared, pipeline-engine, agent-engine, strategy-engine |
| **Must never import** | content-generation, providers |
| **Owned by** | Intelligence team |

## @forge/review-engine

| Field | Value |
|---|---|
| **Purpose** | Review sessions, approval queue, metrics, diff reports, comments, exports (md/json/html) |
| **Inputs** | ContentPatch[], ReviewPolicy |
| **Outputs** | ReviewSession, decisions, metrics, reports |
| **Deterministic** | ✅ — no AI in review; AI never approves |
| **May import** | core, shared, action-engine |
| **Must never import** | ai-engine, content-generation, skills |
| **Owned by** | Intelligence team |

## @forge/optimization-composer

| Field | Value |
|---|---|
| **Purpose** | Patch bundler, dependency graph, conflict detector, priority ordering, batch validation |
| **Inputs** | ReviewSession, ContentPatch[] |
| **Outputs** | PatchBundle[], DependencyGraph, ConflictReport, PrePatch |
| **Deterministic** | ✅ |
| **May import** | core, shared, content-intelligence, review-engine |
| **Must never import** | content-generation, providers, execution-engine |
| **Owned by** | Intelligence team |

## @forge/homepage-engine

| Field | Value |
|---|---|
| **Purpose** | Homepage detection, analysis, planning, optimization with Swimlane |
| **Inputs** | WebsiteSnapshot, project context |
| **Outputs** | HomepageAnalysis, HomepagePlan, HomepagePreview |
| **Deterministic** | ✅ (analysis); ❌ (generation via AI) |
| **May import** | core, shared, tools, content-intelligence, content-generation, review-engine, execution-engine |
| **Must never import** | providers (directly; uses via exec) |
| **Owned by** | AI team |