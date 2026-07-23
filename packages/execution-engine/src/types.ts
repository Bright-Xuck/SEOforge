// @forge/execution-engine/types
// Execution models for dry-run, rollback, and rollback groups.

import type { ActionStatus } from "@forge/action-engine";

/**
 * Rollback operation captured before execution.
 */
export interface RollbackOperation {
  readonly actionId: string;
  readonly resourceType: string;
  readonly resourceId: string | number;
  readonly originalValue: Record<string, unknown>;
  readonly newValue: Record<string, unknown>;
  readonly rollbackMethod: string;
  readonly providerId: string;
  readonly revisionId?: string;
  readonly timestamp: string;
}

/**
 * Rollback group — a transactional bundle of rollback operations.
 * Created by the Optimization Composer but owned by the Execution Engine.
 */
export interface RollbackGroup {
  readonly id: string;
  readonly bundleId: string;
  readonly name: string;
  readonly patchIds: string[];
  readonly operations: RollbackOperation[];
  readonly status: "pending" | "rollback-available" | "rolled-back" | "failed";
  readonly createdAt: string;
}

/**
 * Result of executing a rollback group.
 */
export interface RollbackResult {
  readonly groupId: string;
  readonly bundleId: string;
  readonly successCount: number;
  readonly failureCount: number;
  readonly failedOperations: RollbackOperation[];
  readonly completedAt: string;
  readonly fullyRolledBack: boolean;
}

/**
 * Summary for rollback group listing.
 */
export interface RollbackGroupSummary {
  readonly id: string;
  readonly bundleId: string;
  readonly name: string;
  readonly patchCount: number;
  readonly operationCount: number;
  readonly status: RollbackGroup["status"];
  readonly createdAt: string;
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
  readonly rollbackGroupId?: string;
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
  readonly rollbackGroups: RollbackGroupSummary[];
  readonly executionTime: string;
  readonly rollbackRequired: boolean;
}
