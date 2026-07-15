// @forge/action-engine/queue
// Approval queue for Sprint 5.

import type { Action, ApprovalStatus, RiskLevel } from "./types.js";

/**
 * Mutable approval item for internal queue management.
 */
interface MutableApprovalItem {
  actionId: string;
  reason: string;
  risk: RiskLevel;
  preview?: string;
  createdAt: string;
  status: ApprovalStatus;
}

/**
 * Approve action in queue.
 */
export function approveAction(action: Action): MutableApprovalItem {
  return {
    actionId: action.id,
    reason: action.description,
    risk: action.risk,
    createdAt: new Date().toISOString(),
    status: "approved" as ApprovalStatus,
  };
}

/**
 * Reject action in queue.
 */
export function rejectAction(action: Action, reason?: string): MutableApprovalItem {
  return {
    actionId: action.id,
    reason: reason ?? action.description,
    risk: action.risk,
    createdAt: new Date().toISOString(),
    status: "rejected" as ApprovalStatus,
  };
}

/**
 * In-memory approval queue.
 */
export class ApprovalQueue {
  private items: Map<string, MutableApprovalItem> = new Map();

  /**
   * Add an action to the approval queue.
   */
  add(action: Action): void {
    const item: MutableApprovalItem = {
      actionId: action.id,
      reason: action.description,
      risk: action.risk,
      createdAt: new Date().toISOString(),
      status: "pending" as ApprovalStatus,
    };
    this.items.set(action.id, item);
  }

  /**
   * Get all pending items.
   */
  listPending(): MutableApprovalItem[] {
    return Array.from(this.items.values()).filter((item) => item.status === "pending");
  }

  /**
   * Get an item by action ID.
   */
  get(actionId: string): MutableApprovalItem | undefined {
    return this.items.get(actionId);
  }

  /**
   * Approve an action.
   */
  approve(actionId: string): boolean {
    const item = this.items.get(actionId);
    if (item && item.status === "pending") {
      item.status = "approved";
      return true;
    }
    return false;
  }

  /**
   * Reject an action.
   */
  reject(actionId: string, _reason?: string): boolean {
    const item = this.items.get(actionId);
    if (item && item.status === "pending") {
      item.status = "rejected";
      return true;
    }
    return false;
  }

  /**
   * Get count of pending items.
   */
  get pendingCount(): number {
    return this.listPending().length;
  }

  /**
   * Clear all items.
   */
  clear(): void {
    this.items.clear();
  }
}