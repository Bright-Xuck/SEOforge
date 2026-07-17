// @forge/execution-engine/engine
// Execution engine for dry-run mode.

import type { ExecutionPlan, Action } from "@forge/action-engine";
import type { WriteOperation, WriteProvider } from "@forge/core";
import { RollbackStore } from "./rollback.js";
import { ExecutionHistory } from "./history.js";
import type { ExecutionResult, RollbackOperation } from "./types.js";
import type { ValidationReport } from "@forge/preflight-validator";

/**
 * Execution engine options.
 */
export interface ExecutionEngineOptions {
  dryRun: boolean;
  stopOnBlocked: boolean;
}

/**
 * Default execution engine options.
 */
const DEFAULT_OPTIONS: ExecutionEngineOptions = {
  dryRun: true,
  stopOnBlocked: true,
};

/**
 * Execute an execution plan in dry-run mode.
 */
export async function execute(
  plan: ExecutionPlan,
  provider: WriteProvider,
  options: Partial<ExecutionEngineOptions> = {},
): Promise<ExecutionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  const rollbackStore = new RollbackStore();
  const history = new ExecutionHistory();

  // Check for blocked actions if stopOnBlocked is enabled
  if (opts.stopOnBlocked) {
    const hasBlocked = plan.actions.some((a) => a.status === "failed");
    if (hasBlocked) {
      return {
        url: plan.url,
        executedAt: new Date().toISOString(),
        completedActions: [],
        failedActions: [],
        skippedActions: plan.actions.map((a) => a.id),
        rollbackPlan: [],
        executionTime: `${Date.now() - startTime}ms`,
        rollbackRequired: false,
      };
    }
  }

  const completedActions: string[] = [];
  const failedActions: string[] = [];
  const skippedActions: string[] = [];

  // Process each action
  for (const action of plan.actions) {
    try {
      if (opts.dryRun) {
        rollbackStore.capture(action, {});
        completedActions.push(action.id);
        history.record({
          actionId: action.id,
          startedAt: new Date().toISOString(),
          status: "completed",
          providerId: action.requiredProvider,
          duration: action.estimatedDuration,
          result: "success",
          rollbackAvailable: action.rollbackSupported,
        });
        continue;
      }

      if (action.status !== "approved") {
        skippedActions.push(action.id);
        history.record({
          actionId: action.id,
          startedAt: new Date().toISOString(),
          status: "cancelled",
          providerId: provider.id,
          duration: action.estimatedDuration,
          result: "skipped",
          rollbackAvailable: false,
        });
        continue;
      }

      const operation = createWriteOperation(action);
      const result = await provider.applyWrite(operation);
      completedActions.push(action.id);
      rollbackStore.capture(action, result.oldValue);
      history.record({
        actionId: action.id,
        startedAt: result.timestamp,
        status: "completed",
        providerId: provider.id,
        duration: action.estimatedDuration,
        result: "success",
        rollbackAvailable: result.summary.rollbackSupported,
      });
    } catch {
      failedActions.push(action.id);
      history.record({
        actionId: action.id,
        startedAt: new Date().toISOString(),
        status: "failed",
        providerId: provider.id,
        duration: action.estimatedDuration,
        result: "failure",
        rollbackAvailable: false,
      });
    }
  }

  const executionTime = `${Date.now() - startTime}ms`;
  const rollbackPlan = rollbackStore.getAll();

  return {
    url: plan.url,
    executedAt: new Date().toISOString(),
    completedActions,
    failedActions,
    skippedActions,
    rollbackPlan,
    executionTime,
    rollbackRequired: rollbackPlan.length > 0,
  };
}

function createWriteOperation(action: Action): WriteOperation {
  return {
    id: action.id,
    type: action.type,
    resourceType: inferResourceType(action.type),
    resourceId: inferResourceId(action),
    mode: "apply",
    timestamp: new Date().toISOString(),
    oldValue: {},
    newValue: action.payload,
    diffs: Object.entries(action.payload).map(([field, newValue]) => ({
      field,
      oldValue: undefined,
      newValue,
    })),
    summary: {
      totalChanges: Object.keys(action.payload).length,
      changedFields: Object.keys(action.payload),
      preview: false,
      rollbackSupported: action.rollbackSupported,
    },
    metadata: { recommendationId: action.recommendationId, findingId: action.findingId },
  };
}

function inferResourceType(actionType: string): string {
  if (actionType.startsWith("accessibility.")) return "media";
  if (actionType.startsWith("technical.")) return "page";
  if (actionType.startsWith("content.")) return "page";
  return "page";
}

function inferResourceId(action: Action): string | number {
  const payload = action.payload as Record<string, unknown>;
  return (payload.pageId as number | undefined) ?? (payload.mediaId as number | undefined) ?? action.id;
}

/**
 * Execute an execution plan with preflight validation.
 * Validates first, then executes (dry-run only).
 */
export async function executeWithValidation(
  plan: ExecutionPlan,
  provider: WriteProvider,
  validationReport: ValidationReport,
  options: Partial<ExecutionEngineOptions> = {},
): Promise<{ validation: ValidationReport; execution: ExecutionResult }> {
  // If there are blocked actions, skip execution
  if (validationReport.blockedActions.length > 0) {
    const startTime = Date.now();
    return {
      validation: validationReport,
      execution: {
        url: plan.url,
        executedAt: new Date().toISOString(),
        completedActions: [],
        failedActions: [],
        skippedActions: plan.actions.map((a) => a.id),
        rollbackPlan: [],
        executionTime: `${Date.now() - startTime}ms`,
        rollbackRequired: false,
      },
    };
  }

  const execution = await execute(plan, provider, options);
  return { validation: validationReport, execution };
}

/**
 * Get rollback operations for a completed execution.
 */
export function getRollbackOperations(result: ExecutionResult): RollbackOperation[] {
  return result.rollbackPlan;
}

export async function rollbackExecution(
  result: ExecutionResult,
  provider: WriteProvider,
): Promise<ExecutionResult> {
  const rollbackPlan: RollbackOperation[] = [];
  for (const operation of result.rollbackPlan) {
    await provider.rollbackWrite(operation.resourceType, operation.resourceId, operation.originalValue, operation.revisionId);
    rollbackPlan.push(operation);
  }
  return {
    ...result,
    rollbackPlan,
    rollbackRequired: false,
  };
}
