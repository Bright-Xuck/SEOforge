import type { RollbackGroup } from './types.js';

export class RollbackManager {
  private groups: Map<string, RollbackGroup> = new Map();

  /**
   * Create a rollback group for a bundle.
   */
  createGroup(bundleId: string, name: string, patchIds: string[]): RollbackGroup {
    const group: RollbackGroup = {
      id: `rollback-${bundleId}`,
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