import type { RollbackGroup } from './types.js';

/**
 * Generate a rollback group ID for reference by the Execution Engine.
 */
export function generateRollbackGroupId(bundleId: string): string {
  return `rollback-${bundleId}`;
}

/**
 * Rollback Manager — stub for future implementation.
 * Full rollback group ownership lives in @forge/execution-engine.
 */
export class RollbackManager {
  private groups: Map<string, RollbackGroup> = new Map<string, RollbackGroup>();

  /**
   * Create a rollback group for a bundle.
   */
  createGroup(bundleId: string, name: string, patchIds: string[]): RollbackGroup {
    const group: RollbackGroup = {
      id: generateRollbackGroupId(bundleId),
      bundleId,
      name,
      patches: patchIds,
      timestamp: new Date().toISOString(),
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
   * List all rollback groups.
   */
  listGroups(): RollbackGroup[] {
    return [...this.groups.values()];
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
