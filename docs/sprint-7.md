# Sprint 7: Preflight Validator + Execution Engine

**Version:** 0.7.0  
**Status:** ✅ Complete

## Mission

Forge now knows how to analyze websites, generate recommendations, create execution plans, and connect to WordPress. The missing piece is trust. Before Forge executes ANY action, it must prove the action is safe.

## What Was Built

### 1. Preflight Validator (`packages/preflight-validator`)

A deterministic validation system that validates execution plans before any action is taken.

#### Validation Rules Implemented

| Action Type | Validation Checks |
|-------------|-------------------|
| `seo.add-title` | Page exists, title is safe |
| `seo.update-title` | Page exists, title still matches expected source, no conflict |
| `seo.add-meta-description` | Page exists |
| `seo.update-meta-description` | Page exists, metadata editing supported |
| `accessibility.add-alt` | Image exists, alt currently empty |
| `accessibility.update-alt` | Image exists, alt text provided |
| `seo.add-canonical` | Page exists, canonical URL valid, redirect will be needed |
| `technical.add-jsonld` | Page exists, schema valid JSON-LD |
| `seo.update-slug` | Page exists, slug unique, redirect required |
| `seo.add-internal-link` | Source and destination pages exist, anchor valid |

#### Public API

```typescript
// Main validation function
validateExecutionPlan(plan: ExecutionPlan, provider: unknown, context: ValidationContext): ValidationReport

// Create default context
createDefaultContext(): ValidationContext
```

#### ValidationReport Structure

- `approvedActions`: Actions that pass all checks
- `warningActions`: Actions that pass but have warnings
- `blockedActions`: Actions that fail validation
- `warnings`: General warnings
- `errors`: Critical errors
- `riskSummary`: Counts by risk level (safe, moderate, high, critical)

### 2. Execution Engine (`packages/execution-engine`)

Dry-run execution engine that simulates execution without modifying websites.

#### Features

- **Dry-run mode only**: No real website modifications
- **Rollback preparation**: Captures original values before simulated execution
- **Execution history**: Records all action attempts
- **Policy enforcement**: Respects validation decisions

#### Public API

```typescript
// Execute an execution plan (dry-run)
execute(plan: ExecutionPlan, provider: unknown, options?: ExecutionEngineOptions): Promise<ExecutionResult>

// Execute with validation (validates first, then simulates)
executeWithValidation(plan: ExecutionPlan, provider: unknown, validationReport: ValidationReport): Promise<{ validation, execution }>

// Get rollback operations
getRollbackOperations(result: ExecutionResult): RollbackOperation[]
```

#### ExecutionResult Structure

- `completedActions`: Successfully simulated actions
- `failedActions`: Actions that failed during simulation
- `skippedActions`: Actions not executed (blocked or warnings)
- `rollbackPlan`: Available rollback operations
- `executionTime`: Total duration
- `rollbackRequired`: Whether rollback is available

### 3. Rollback Framework

Prepares rollback capability before execution.

#### RollbackOperation Structure

- `actionId`: The action being rolled back
- `originalValue`: The original value captured before change
- `newValue`: The value that would be changed
- `rollbackMethod`: Method to restore (e.g., `restore_previous_meta`, `delete_meta`)
- `provider`: The provider that would execute the rollback
- `timestamp`: When the operation was captured

### 4. Execution History

Records execution history for audit and debugging.

#### ExecutionHistoryEntry Structure

- `actionId`: Action identifier
- `startedAt`: When execution started
- `finishedAt`: When execution completed
- `status`: pending | completed | failed | rolled_back
- `provider`: Provider ID
- `duration`: Action duration
- `result`: success | failure
- `rollbackAvailable`: Whether rollback is available

### 5. Execution Provider Interface

Mock implementation for Sprint 7. WordPress provider stubs will be added in future sprints.

#### Supported Methods (Mock)

- `updateTitle()`
- `updateMetaDescription()`
- `updateAltText()`
- `updateCanonical()`
- `updateSchema()`

### 6. Execution Policies

Policy engine that determines action executability.

| Level | Behavior |
|-------|----------|
| Safe | Auto-executable |
| Moderate | Requires approval |
| High | Blocked unless approved |
| Critical | Never auto-executes |

## CLI Commands Added

### `forge validate <url>`

Validates an execution plan for the given URL.

```bash
forge validate https://example.com
forge validate https://example.com --json
```

Output:
- Risk summary (safe/moderate/high/critical counts)
- Approved actions count
- Warning actions count
- Blocked actions count
- Details of blocked/warning actions

### `forge execute <url>`

Executes (dry-run) an execution plan for the given URL.

```bash
forge execute https://example.com
forge execute https://example.com --json
```

Output:
- Validation report
- Execution report (actions completed/failed/skipped)
- Rollback plan
- Execution time

**Note:** This is a dry-run only. No website modifications are made.

## Architecture Consistency

- ✅ Execution Engine never calls WordPress APIs directly
- ✅ All provider interactions go through interfaces
- ✅ Business logic remains provider-independent
- ✅ Validation rules are deterministic
- ✅ No AI, no dashboards, no scheduling

## Test Coverage

All components have unit tests with 90%+ coverage target:

- Preflight Validator tests: 11 tests
- Execution Engine tests: 23 tests
- RollbackStore tests: 4 tests
- ExecutionHistory tests: 4 tests
- PolicyEngine tests: 6 tests

## Technical Debt

1. **Slug validation** requires specific payload fields (`newSlug`, `currentSlug`) - not yet supported by action engine
2. **WordPress provider stubs** for execution methods (updateTitle, etc.) not yet implemented
3. **CLI commands** use dynamic imports which may slow first run
4. **Real execution** is blocked - waiting for Sprint 8 to implement actual provider methods