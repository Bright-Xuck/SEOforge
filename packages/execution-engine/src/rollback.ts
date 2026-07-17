// @forge/execution-engine/rollback
// Rollback framework for capturing and storing rollback operations.

import type { Action } from "@forge/action-engine";
import type { RollbackOperation } from "./types.js";

/**
 * In-memory rollback storage.
 */
export class RollbackStore {
  private operations = new Map<string, RollbackOperation>();

  /**
   * Capture a rollback operation before simulated execution.
   */
  capture(action: Action, originalValue: Record<string, unknown>): void {
    const operation: RollbackOperation = {
      actionId: action.id,
      originalValue,
      newValue: action.payload,
      rollbackMethod: this.getRollbackMethod(action.type),
      providerId: action.requiredProvider,
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
    };
    return methods[actionType] ?? "manual_rollback";
  }
}