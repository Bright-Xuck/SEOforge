# Forge Project Structure

**Version:** 1.0.0  
**Status:** Active  
**Owner:** Bright Ndode

---

# Purpose

This document defines the official repository structure of Forge.

Every folder exists for a specific reason.

New folders should not be created unless they solve a genuine architectural problem.

This document serves as the single source of truth for package organization and dependency boundaries.

---

# Repository Overview

```text
forge/

├── apps/
├── packages/
│   ├── pipeline-engine/
├── plugins/
├── prompts/
├── reports/
├── examples/
├── scripts/
├── tests/
├── docs/
├── .github/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

---

# Directory Responsibilities

## apps/

Applications that users interact with.

Apps combine packages.

Apps should contain minimal business logic.

Business logic belongs inside packages.

Current applications:

```text
apps/

cli/

dashboard/

desktop/
```

Future:

```text
vscode-extension/

api/

web/
```

Apps are consumers.

They are not libraries.

---

## packages/

Contains all reusable business logic.

Every package must have one clearly defined responsibility.

Packages should be reusable across multiple applications.

No package should depend on an application.

Sprint 8 adds `packages/pipeline-engine` for pipeline orchestration and extends `packages/plugin-registry` with pipeline registration and validation APIs.
Sprint 9 adds `packages/knowledge-engine` and `packages/memory-engine` for project knowledge, timelines, and change detection.
Sprint 10 adds `packages/ai-engine`, `packages/skills`, and `packages/prompt-registry` for AI orchestration, skill execution, and prompt management.
Sprint 10 hardening adds `packages/project-resolver` for explicit project resolution and `packages/context-builder` for structured AI context.
Sprint 11 adds `packages/agent-engine` for deterministic agent orchestration and registry-backed agent metadata.
Sprint 12 adds `packages/strategy-engine` for strategy generation, validation, serialization, and pipeline resolution.

---

# packages/core

Purpose:

Core domain models.

Contains:

- Types
- Interfaces
- Value Objects
- Domain Events
- Base Contracts
- Shared Models

Examples:

```text
Task

Mission

WebsiteSnapshot

AuditResult

Recommendation

Issue

Plugin

Provider

Skill
```

Rules:

Must never import:

- React
- Playwright
- WordPress
- Node APIs
- HTTP libraries

This package represents the language of Forge.

---

# packages/config

Purpose:

Configuration management.

Responsibilities:

- Environment validation
- Configuration loading
- Runtime settings
- Feature flags

No business logic.

---

# packages/logger

Purpose:

Structured logging.

Responsibilities:

- Logger
- Log formatting
- Log levels
- Log transports

Every package uses this logger.

Never use console.log.

---

# packages/ai

Purpose:

AI abstraction layer.

Contains:

Provider interfaces.

Model adapters.

Prompt execution.

Streaming.

Embeddings.

Vision.

Reasoning.

Supported providers:

- Ollama
- LM Studio
- OpenRouter
- OpenAI
- Claude
- Gemini

Business logic must never directly use provider SDKs.

---

# packages/tools

Purpose:

External capabilities.

Examples:

Website Reader

HTML Parser

Playwright

Filesystem

Markdown

CSV

JSON

Lighthouse

Image Analysis

Robots Parser

Sitemap Parser

Tools perform work.

They do not make decisions.

---

# packages/skills

Purpose:

Business intelligence.

Skills receive structured input.

Skills return structured output.

Examples:

Homepage Analysis

Technical SEO

Accessibility

Content Analysis

Internal Linking

Schema Validation

Performance Review

Competitor Analysis

Skills orchestrate tools.

Skills should not perform raw crawling.

---

# packages/providers

Purpose:

Platform implementations.

Examples:

WordPress

WooCommerce

Shopify

Webflow

Ghost

Cloudflare

GitHub

Google Search Console

Providers expose platform functionality through interfaces.

---

# packages/workflows

Purpose:

High-level orchestration.

Workflows combine multiple skills.

Example:

Mission:

Improve Homepage

↓

Website Reader

↓

Homepage Analysis

↓

Competitor Analysis

↓

AI Reasoning

↓

Recommendation Builder

↓

WordPress Draft

↓

Verification

---

# packages/memory

Purpose:

Persistent learning.

Stores:

Website memory

Project memory

Brand memory

Accepted recommendations

Rejected recommendations

Historical executions

Prompt history

Memory should improve future decisions.

---

# packages/reports

Purpose:

Report generation.

Supported outputs:

Markdown

HTML

PDF

JSON

CSV

Reports consume structured data.

Reports never perform analysis.

---

# packages/shared

Purpose:

Reusable utilities.

Allowed:

Constants

Date utilities

Formatting

Small helper functions

Forbidden:

Business logic

Platform logic

AI logic

---

# plugins/

Platform integrations.

Examples:

wordpress/

shopify/

cloudflare/

semrush/

google-search-console/

google-analytics/

Each plugin should implement the contracts defined by packages/core.

Removing a plugin must not affect the rest of the system.

---

# prompts/

Prompt registry.

Contains:

System prompts.

Templates.

Prompt variables.

Version history.

Prompt tests.

Prompt metadata.

Prompts should never be hardcoded inside implementation files.

---

# reports/

Generated output.

Examples:

Audit reports.

Accessibility reports.

SEO reports.

Execution reports.

These files are outputs.

They are not source code.

---

# examples/

Example configurations.

Example plugins.

Example workflows.

Example prompts.

Used for documentation and testing.

---

# scripts/

Development utilities.

Examples:

Build scripts.

Migration scripts.

Release scripts.

Maintenance scripts.

Scripts should never contain production business logic.

---

# tests/

Repository-level tests.

Contains:

Integration tests.

Fixtures.

Mock websites.

Mock providers.

Shared testing utilities.

Package-specific unit tests remain inside their own packages.

---

# docs/

Project documentation.

Includes:

Architecture

Roadmaps

Standards

Vision

Workflow

Security

Testing

Decisions

This folder is the knowledge base of Forge.

---

# Dependency Rules

Dependency direction must always flow inward.

```text
Apps

↓

Workflows

↓

Skills

↓

Tools

↓

Providers

↓

Core
```

Lower layers must never depend on higher layers.

---

# Import Rules

Allowed:

```text
Skill

↓

Tool
```

Forbidden:

```text
Tool

↓

Skill
```

Allowed:

```text
Provider

↓

Core
```

Forbidden:

```text
Core

↓

Provider
```

Allowed:

```text
Workflow

↓

Skills
```

Forbidden:

```text
Skills

↓

Workflow
```

---

# Public APIs

Every package must expose a single public entry point.

Example:

```text
packages/skills/src/index.ts

packages/tools/src/index.ts

packages/core/src/index.ts
```

Internal files should never be imported directly.

---

# Package Independence

Every package should:

Compile independently.

Test independently.

Document independently.

Version independently if necessary.

Packages should communicate through exported interfaces.

---

# Package Checklist

Before creating a new package ask:

Does this represent a distinct responsibility?

Can existing packages solve this problem?

Will multiple applications use it?

Does it reduce coupling?

If the answer is no, do not create a new package.

---

# Folder Creation Policy

New folders require justification.

Creating folders "just in case" is prohibited.

Unused structure increases maintenance cost.

---

# Rule of Single Responsibility

Every folder should answer one question.

Examples:

AI?

Packages/ai

Reports?

Packages/reports

Skills?

Packages/skills

Providers?

Packages/providers

If a folder answers multiple questions, responsibilities should be separated.

---

# Long-Term Growth

The repository structure should comfortably support:

- Desktop Application
- Web Dashboard
- CLI
- API Server
- VS Code Extension
- Plugin Marketplace
- Community Plugins
- Multiple AI Providers
- Multiple Website Platforms

without requiring structural reorganization.

---

# Final Principle

A clean repository structure is a competitive advantage.

Developers should immediately understand where new code belongs.

If there is uncertainty about where code should live, the architecture should be clarified before implementation begins.
