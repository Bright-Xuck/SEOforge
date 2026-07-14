# Forge Coding Standards

**Version:** 1.0.0  
**Status:** Active  
**Owner:** Bright Ndode  
**Applies To:** Entire Repository

---

# Purpose

This document defines the mandatory coding standards for every part of Forge.

These rules exist to maximize:

- Maintainability
- Readability
- Testability
- Scalability
- Consistency
- Developer Experience

These standards are mandatory.

If a situation requires breaking a rule, document the reason in `docs/decisions.md`.

---

# Guiding Principles

Code is written for humans first.

Computers execute code.

Humans maintain it.

Readable code always takes priority over clever code.

Optimize for maintainability rather than minimizing lines of code.

---

# General Rules

Every line of code should satisfy the following:

- Easy to understand
- Easy to test
- Easy to replace
- Easy to extend
- Easy to debug

If a piece of code is difficult to explain, it is probably too complex.

---

# Language

All source code must use:

- TypeScript
- Strict Mode
- ES Modules

JavaScript files are not permitted except for configuration files where unavoidable.

---

# TypeScript

## Required

Strict mode must always remain enabled.

Avoid implicit types.

Always define interfaces for public APIs.

Prefer union types over magic strings.

Prefer readonly data where mutation is unnecessary.

Never disable TypeScript safety features.

---

## Forbidden

Do not use:

- any
- @ts-ignore
- @ts-nocheck
- non-null assertions (!) unless unavoidable

If one of these becomes necessary, document the reason.

---

# Naming Conventions

## Files

Use kebab-case.

Examples:

```
website-reader.ts
homepage-skill.ts
wordpress-provider.ts
```

---

## Folders

Use kebab-case.

```
website-reader/
homepage-analysis/
technical-audit/
```

---

## Interfaces

Prefix with I only if required by external APIs.

Otherwise:

```
Tool
Skill
Provider
WebsiteSnapshot
AuditReport
```

Not

```
ITool
ISkill
IProvider
```

---

## Classes

Use PascalCase.

```
WebsiteReader

WordPressProvider

ReportBuilder
```

---

## Functions

Use camelCase.

Functions should describe actions.

Examples:

```
readWebsite()

generateReport()

extractMetadata()

validateConfiguration()
```

Avoid vague names.

Never use:

```
process()

handle()

run()

execute()

manager()

helper()

utils()
```

Unless their responsibilities are explicitly clear.

---

## Variables

Names should explain intent.

Good:

```
homepageSnapshot

auditResult

internalLinks

missingImages
```

Bad:

```
data

list

temp

obj

value

result2
```

---

# File Size

Maximum recommended file size:

300 lines

Hard limit:

500 lines

If a file grows beyond this, split it.

---

# Function Size

Maximum recommended function size:

40 lines

If a function becomes longer:

Extract smaller functions.

Each function should perform one responsibility.

---

# Function Design

Functions should:

- Have one responsibility
- Return one logical result
- Avoid hidden side effects
- Be deterministic where possible

Pure functions are preferred.

---

# Classes

Classes should coordinate behavior.

They should not contain large amounts of business logic.

If a class exceeds several hundred lines, responsibilities should be extracted.

---

# Comments

Comments should explain:

WHY

Not

WHAT

Bad:

```ts
// Increment counter
counter++;
```

Good:

```ts
// Retry count prevents infinite crawling loops.
```

If code requires extensive comments to understand what it does, simplify the code instead.

---

# Imports

Group imports:

1. Node modules

2. External packages

3. Internal packages

4. Relative imports

Example:

```ts
import fs from "node:fs";

import axios from "axios";

import { Tool } from "@forge/core";

import { parser } from "./parser";
```

Never use wildcard imports.

---

# Dependency Rules

Higher-level modules must never depend directly on implementation details.

Business logic must depend on interfaces.

Concrete implementations belong in providers.

---

# Error Handling

Never swallow errors.

Never leave empty catch blocks.

Always provide meaningful messages.

Wrap low-level errors when exposing them to higher layers.

Example:

```
Unable to crawl homepage.

Reason:

Connection timeout.
```

Instead of:

```
Error.
```

---

# Logging

Logging should be structured.

Every log should include:

- timestamp
- level
- component
- message

Optional:

- execution id
- website id
- task id

Never use:

```ts
console.log();
```

Use the project logger.

---

# Configuration

Configuration belongs in configuration files.

Never hardcode:

- URLs
- Tokens
- Keys
- Paths
- AI Models
- Website IDs

---

# Environment Variables

Every environment variable must:

- be validated
- have documentation
- include default behavior where appropriate

Missing required variables should stop startup.

---

# Validation

Never trust external data.

Validate:

- API responses
- HTML
- User input
- Configuration
- Plugin data
- File imports

Use runtime validation.

---

# Architecture

Core modules must never import platform-specific implementations.

Example:

Allowed

```
Core

↓

Provider Interface

↓

WordPress Provider
```

Forbidden

```
Core

↓

WordPress API
```

---

# AI Providers

Never call provider SDKs directly inside business logic.

Always communicate through provider interfaces.

Business logic must remain provider-independent.

---

# Plugins

Plugins must never modify core code.

Plugins extend capabilities.

Removing a plugin should never require changes elsewhere.

---

# Testing

Every business-critical feature requires tests.

Prefer:

Unit Tests

↓

Integration Tests

↓

End-to-End Tests

Every bug fixed should receive a regression test whenever practical.

---

# Documentation

Every exported:

- class
- interface
- function
- type

should have documentation when its purpose is not immediately obvious.

Public APIs must always be documented.

---

# Performance

Do not optimize prematurely.

Measure first.

Optimize only proven bottlenecks.

Readability is preferred over micro-optimizations.

---

# Security

Never:

- expose secrets
- log passwords
- log API keys
- trust external HTML
- trust imported files

Assume all external input is malicious.

---

# Git

Each commit should represent one logical change.

Commit messages should explain intent.

Avoid mixing unrelated changes.

Small commits are preferred.

---

# Pull Requests

Every change should answer:

- What changed?
- Why?
- How was it tested?
- Does it affect architecture?
- Does documentation need updating?

---

# Code Reviews

Every implementation should be reviewed against:

- Simplicity
- Naming
- Readability
- Maintainability
- Testability
- Extensibility
- Performance
- Security

If a simpler design exists, prefer it.

---

# Refactoring

Continuous refactoring is encouraged.

Never leave known technical debt undocumented.

If a shortcut is necessary, record it in `docs/decisions.md`.

---

# Rule of Simplicity

When two implementations achieve the same result:

Choose the simpler one.

When two abstractions are possible:

Choose the smaller abstraction.

When uncertain:

Remove complexity.

---

# Final Principle

Every line of code should make Forge easier to extend tomorrow than it was yesterday.

Future maintainability is more important than today's implementation speed.
