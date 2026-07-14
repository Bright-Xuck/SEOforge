# Forge Development Workflow

**Version:** 1.0.0  
**Status:** Active  
**Owner:** Bright Ndode

---

# Purpose

This document defines the official software development lifecycle for Forge.

Its purpose is to ensure every feature is implemented consistently, reviewed properly, documented thoroughly, and integrated safely.

The workflow applies regardless of whether work is completed by a human developer or an AI coding assistant.

---

# Core Principles

Development must prioritize:

- Maintainability
- Simplicity
- Predictability
- Incremental progress
- Testability
- Documentation
- Long-term scalability

Large unreviewed changes are prohibited.

Forge should evolve through small, verifiable improvements.

---

# Development Lifecycle

Every feature follows the same lifecycle.

```

Idea

↓

Architecture Review

↓

Planning

↓

Sprint Assignment

↓

Task Creation

↓

Implementation

↓

Self Review

↓

Testing

↓

Documentation

↓

Approval

↓

Merge

↓

Release

```

Skipping steps is discouraged.

---

# Roles

Forge development assumes four primary roles.

---

## Product Owner

Responsible for:

- Product vision
- Feature prioritization
- Sprint approval
- User experience
- Business decisions

Current Owner:

Bright Ndode

---

## Chief Architect

Responsible for:

- System architecture
- Long-term scalability
- Technical decisions
- Architectural reviews
- Design validation

This role may be fulfilled by architecture-focused AI or human review.

---

## Lead Engineer

Responsible for:

- Technical planning
- Sprint definition
- Code review
- Standards enforcement
- Integration decisions

---

## Implementation Engineer

Responsible for:

- Writing code
- Fixing bugs
- Creating tests
- Updating documentation
- Completing assigned tasks

AI coding assistants such as Cline operate in this role.

---

# Sprint Workflow

Every sprint must have a clearly defined objective.

Example:

Sprint Goal:

> Implement Website Reader.

A sprint must never attempt unrelated work.

Each sprint should produce a working increment.

---

# Sprint Structure

Each sprint contains:

- Objective
- Scope
- Deliverables
- Acceptance Criteria
- Risks
- Dependencies
- Out-of-Scope Items
- Estimated Completion

---

# Task Rules

Large work must be divided into small tasks.

A task should generally require between 15 and 60 minutes of implementation.

Tasks should represent one logical change.

Examples:

✅ Create CLI entry point

✅ Add WebsiteSnapshot interface

✅ Implement HTML parser

❌ Build entire crawler

---

# Definition of Ready

A task is ready when:

- Objective is clear
- Requirements are documented
- Dependencies are available
- Acceptance criteria exist
- Architecture impact is understood

Implementation should not begin before these conditions are satisfied.

---

# Definition of Done

A task is complete only when:

- Code is implemented
- Build succeeds
- Tests pass
- Documentation updated
- No linting errors
- No TypeScript errors
- Self-review completed
- Acceptance criteria satisfied

Anything less is incomplete.

---

# AI Development Workflow

AI should never immediately generate code.

Before implementation it must:

1. Read architecture documents.

2. Summarize understanding.

3. Identify assumptions.

4. Identify risks.

5. Produce implementation plan.

6. Receive approval.

Only then may implementation begin.

---

# Self Review

Every completed task must undergo self-review.

Review checklist:

- Is this the simplest implementation?
- Are names descriptive?
- Can duplication be reduced?
- Does architecture remain clean?
- Are interfaces correct?
- Are responsibilities separated?
- Can testing be improved?

If improvements exist, refactor before completion.

---

# Architecture Changes

Architecture changes require additional review.

Changes include:

- Folder structure
- Public interfaces
- Dependency graph
- Core abstractions
- Shared packages
- Plugin system

Architecture changes should be documented in:

```

docs/decisions.md

```

---

# Dependency Policy

Before adding any dependency:

Document:

- Purpose
- Alternatives
- Maintenance status
- Security considerations
- Bundle impact
- Why existing code is insufficient

Dependencies must solve a meaningful problem.

Convenience alone is insufficient.

---

# Git Workflow

Every feature should exist on its own branch.

Recommended naming:

```

feature/website-reader

feature/wordpress-provider

feature/report-engine

bugfix/parser-timeout

refactor/provider-interface

```

---

# Commit Policy

Each commit should represent one logical change.

Good:

```

Add WebsiteSnapshot interface

```

Good:

```

Implement HTML heading extraction

```

Bad:

```

Fixed stuff

```

Bad:

```

Updates

```

---

# Pull Request Checklist

Every pull request should answer:

- What changed?
- Why?
- How was it tested?
- Does documentation require updates?
- Does architecture change?
- Are breaking changes introduced?

---

# Code Review Checklist

Review every change for:

Architecture

Naming

Readability

Testability

Performance

Security

Error Handling

Documentation

Future Maintainability

Complexity

---

# Bug Workflow

Every bug follows:

```

Identify

↓

Reproduce

↓

Root Cause

↓

Fix

↓

Regression Test

↓

Review

↓

Merge

```

Never patch symptoms.

Fix root causes.

---

# Documentation Policy

Documentation is part of development.

Every completed feature should update documentation if required.

Documentation should never lag behind implementation.

---

# Testing Workflow

Every completed feature should include appropriate testing.

Testing order:

Unit Tests

↓

Integration Tests

↓

End-to-End Tests

↓

Manual Verification

Tests should validate behavior, not implementation details.

---

# Release Workflow

Release preparation:

- Build
- Test
- Documentation review
- Version update
- Changelog
- Tag release

Only then should releases be published.

---

# AI Collaboration Workflow

Forge is developed through collaboration between specialized roles.

Product Owner defines goals.

Chief Architect validates system design.

Lead Engineer plans implementation.

Implementation Engineer writes code.

No single role should bypass the others.

This separation reduces architectural drift and improves long-term quality.

---

# Continuous Improvement

After every sprint conduct a retrospective.

Discuss:

What worked?

What slowed development?

What should change?

What technical debt exists?

What documentation is missing?

Record improvements before beginning the next sprint.

---

# Rule of Incremental Progress

Forge should always remain in a working state.

Large unfinished implementations are discouraged.

Small, complete improvements compound faster than massive incomplete features.

---

# Final Principle

Development speed is important.

Sustainable development speed is more important.

Every sprint should leave Forge cleaner, more understandable, and easier to extend than before.
