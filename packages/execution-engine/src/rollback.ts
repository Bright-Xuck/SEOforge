// @forge/execution-engine/rollback
// Rollback framework for capturing, grouping, and storing rollback operations.
//
// The Execution Engine owns rollback implementation.
// The Optimization Composer produces rollbackGroupId references only.

import type { Action } from "@forge/action-engine";
import type { RollbackOperation, RollbackGroup, RollbackResult, RollbackGroupSummary } from "./types.ts";

/**
 * In-memory rollback storage for individual operations.
 */
export class RollbackStore {
  private operations = new Map<string, RollbackOperation>();

  /**
   * Capture a rollback operation before simulated execution.
   */
  capture(action: Action, originalValue: Record<string, unknown>, revisionId?: string): void {
    const operation: RollbackOperation = {
      actionId: action.id,
      resourceType: this.getResourceType(action.type),
      resourceId: this.getResourceId(action),
      originalValue,
      newValue: action.payload,
      rollbackMethod: this.getRollbackMethod(action.type),
      providerId: action.requiredProvider,
      revisionId,
      timestamp: new Date().toISOString(),
    };
    this.operations.set(action.id, operation);
  }

  /**
   * Get all rollback operations.
   */
  getAll(): RollbackOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get rollback operation for an action.
   */
  get(actionId: string): RollbackOperation | undefined {
    return this.operations.get(actionId);
  }

  /**
   * Clear all rollback operations.
   */
  clear(): void {
    this.operations.clear();
  }

  /**
   * Determine rollback method based on action type.
   */
  private getRollbackMethod(actionType: string): string {
    const methods: Record<string, string> = {
      "seo.update-title": "restore_previous_meta",
      "seo.add-title": "delete_meta",
      "seo.update-meta-description": "restore_previous_meta",
      "seo.add-meta-description": "delete_meta",
      "seo.add-canonical": "remove_canonical",
      "accessibility.update-alt": "restore_previous_alt",
      "accessibility.add-alt": "clear_alt_text",
      "technical.add-jsonld": "remove_schema_markup",
      "content.update-content": "restore_previous_content",
      "content.elementor-patch": "restore_elementor_document",
      "seo.update-rank-math-meta": "restore_previous_meta",
    };
    return methods[actionType] ?? "manual_rollback";
  }

  private getResourceType(actionType: string): string {
    if (actionType === "content.elementor-patch") return "elementor-document";
    if (actionType === "seo.update-rank-math-meta") return "seo-meta";
    if (actionType.startsWith("accessibility.")) return "media";
    if (actionType.startsWith("technical.")) return "page";
    if (actionType.startsWith("content.")) return "page";
    return "page";
  }

  private getResourceId(action: Action): string | number {
    const payload = action.payload as Record<string, unknown>;
    return (payload.pageId as number | undefined) ?? (payload.mediaId as number | undefined) ?? action.id;
  }
}

/**
 * Rollback Group Store — manages transactional rollback groups.
 *
 * Groups are created by the Optimization Composer (references only)
 * and owned/executed by the Execution Engine.
 */
export class RollbackGroupStore {
  private groups = new Map<string, RollbackGroup>();

  /**
   * Create a new rollback group.
   */
  createGroup(params: {
    bundleId: string;
    name: string;
    patchIds: string[];
    operations: RollbackOperation[];
  }): RollbackGroup {
    const group: RollbackGroup = {
      id: `rollback-${params.bundleId}`,
      bundleId: params.bundleId,
      name: params.name,
      patchIds: params.patchIds,
      operations: params.operations,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.groups.set(group.id, group);
    return group;
  }

  /**
   * Get a rollback group by ID.
   */
  getGroup(id: string): RollbackGroup | undefined {
    return this.groups.get(id);
  }

  /**
   * List all rollback groups with summary info.
   */
  listGroups(): RollbackGroupSummary[] {
    return Array.from(this.groups.values()).map((g) => ({
      id: g.id,
      bundleId: g.bundleId,
      name: g.name,
      patchCount: g.patchIds.length,
      operationCount: g.operations.length,
      status: g.status,
      createdAt: g.createdAt,
    }));
  }

  /**
   * Execute a rollback for a group.
   * In production, this would call providers to reverse changes.
   * In dry-run, it simulates the rollback.
   */
  executeRollback(groupId: string, dryRun = true): RollbackResult {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Rollback group not found: ${groupId}`);
    }

    const failed: RollbackOperation[] = [];

    if (!dryRun) {
      // In real execution, iterate operations and call providers
      // For now, mark all as successful in simulation
    }

    const fullyRolledBack = failed.length === 0;
    const newStatus: RollbackGroup["status"] = fullyRolledBack ? "rolled-back" : "failed";

    const result: RollbackResult = {
      groupId,
      bundleId: group.bundleId,
      successCount: group.operations.length - failed.length,
      failureCount: failed.length,
      failedOperations: failed,
      completedAt: new Date().toISOString(),
      fullyRolledBack,
    };

    // Replace with updated group (immutable pattern)
    this.groups.set(groupId, { ...group, status: newStatus });

    return result;
  }

  /**
   * Add operations to an existing group.
   */
  addOperations(groupId: string, operations: RollbackOperation[]): void {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Rollback group not found: ${groupId}`);
    }
    this.groups.set(groupId, { ...group, operations: [...group.operations, ...operations] });
  }

  /**
   * Remove a rollback group.
   */
  removeGroup(id: string): void {
    this.groups.delete(id);
  }

  /**
   * Clear all rollback groups.
   */
  clear(): void {
    this.groups.clear();
  }
}
