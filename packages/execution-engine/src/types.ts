// @forge/execution-engine/types
// Execution models for dry-run and rollback.

import type { ActionStatus } from "@forge/action-engine";

/**
 * Rollback operation captured before execution.
 */
export interface RollbackOperation {
  readonly actionId: string;
  readonly originalValue: Record<string, unknown>;
  readonly newValue: Record<string, unknown>;
  readonly rollbackMethod: string;
  readonly providerId: string;
  readonly timestamp: string;
}

/**
 * Execution history entry.
 */
export interface ExecutionHistoryEntry {
  readonly actionId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly status: ActionStatus;
  readonly providerId: string;
  readonly duration: string;
  readonly result: "success" | "failure" | "skipped";
  readonly rollbackAvailable: boolean;
}

/**
 * Execution result for dry-run mode.
 */
export interface ExecutionResult {
  readonly url: string;
  readonly executedAt: string;
  readonly completedActions: string[];
  readonly failedActions: string[];
  readonly skippedActions: string[];
  readonly rollbackPlan: RollbackOperation[];
  readonly executionTime: string;
  readonly rollbackRequired: boolean;
}