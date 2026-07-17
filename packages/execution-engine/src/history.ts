// @forge/execution-engine/history
// Execution history tracking (in-memory).

import type { ExecutionHistoryEntry } from "./types.js";

/**
 * In-memory execution history.
 */
export class ExecutionHistory {
  private entries: ExecutionHistoryEntry[] = [];

  /**
   * Record an action execution.
   */
  record(entry: Omit<ExecutionHistoryEntry, "finishedAt" | "result"> & { result: "success" | "failure" | "skipped" }): void {
    const fullEntry: ExecutionHistoryEntry = {
      ...entry,
      finishedAt: new Date().toISOString(),
    };
    this.entries.push(fullEntry);
  }

  /**
   * Get all history entries.
   */
  getAll(): ExecutionHistoryEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific action.
   */
  getByAction(actionId: string): ExecutionHistoryEntry[] {
    return this.entries.filter((e) => e.actionId === actionId);
  }

  /**
   * Get entries for a specific provider.
   */
  getByProvider(providerId: string): ExecutionHistoryEntry[] {
    return this.entries.filter((e) => e.providerId === providerId);
  }

  /**
   * Clear history.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get count of entries.
   */
  get count(): number {
    return this.entries.length;
  }
}