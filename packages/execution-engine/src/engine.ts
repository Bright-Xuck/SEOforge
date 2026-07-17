// @forge/execution-engine/engine
// Execution engine for dry-run mode.

import type { ExecutionPlan, Action } from "@forge/action-engine";
import { RollbackStore } from "./rollback.js";
import { ExecutionHistory } from "./history.js";
import type { ExecutionResult, RollbackOperation } from "./types.js";

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
  _provider: unknown,
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
      // Capture rollback before simulated execution
      const originalValue = getOriginalValue(action);
      rollbackStore.capture(action, originalValue);

      // In dry-run mode, we don't actually execute, just simulate
      if (opts.dryRun) {
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
      }
    } catch {
      failedActions.push(action.id);
      history.record({
        actionId: action.id,
        startedAt: new Date().toISOString(),
        status: "failed",
        providerId: action.requiredProvider,
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

/**
 * Get original value for an action (for rollback).
 */
function getOriginalValue(_action: Action): Record<string, unknown> {
  // In real implementation, this would fetch from the provider
  // For now, return empty object indicating "no previous value"
  return {};
}

/**
 * Get rollback operations for a completed execution.
 */
export function getRollbackOperations(result: ExecutionResult): RollbackOperation[] {
  return result.rollbackPlan;
}