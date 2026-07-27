// @forge/dom-engine
// Structural diff between two ContentNode trees.

import type { ContentNode } from "./tree-node.js";
import type { TreeDiffEntry } from "../types.js";

/**
 * Compute a human-readable structural diff between two ContentNode trees.
 */
export function computeTreeDiff(before: ContentNode, after: ContentNode): TreeDiffEntry[] {
  const diffs: TreeDiffEntry[] = [];
  walkDiff(before, after, [], diffs);
  return diffs;
}

function walkDiff(before: ContentNode, after: ContentNode, path: string[], diffs: TreeDiffEntry[]): void {
  if (before.id !== after.id || before.type !== after.type) {
    diffs.push({ path, operation: "replace", oldValue: before.settings, newValue: after.settings });
    return;
  }

  const afterKeys = Object.keys(after.settings).sort();

  for (const key of afterKeys) {
    if (!(key in before.settings) || before.settings[key] !== after.settings[key]) {
      diffs.push({
        path: [...path, key],
        operation: "replace",
        oldValue: key in before.settings ? before.settings[key] : undefined,
        newValue: after.settings[key],
      });
    }
  }

  const maxLen = Math.max(before.children.length, after.children.length);
  for (let i = 0; i < maxLen; i++) {
    const childPath = [...path, String(i)];
    const beforeChild = before.children[i];
    const afterChild = after.children[i];
    if (!beforeChild && afterChild) {
      diffs.push({ path: childPath, operation: "add", newValue: afterChild.settings });
    } else if (beforeChild && !afterChild) {
      diffs.push({ path: childPath, operation: "remove", oldValue: beforeChild.settings });
    } else if (beforeChild && afterChild) {
      walkDiff(beforeChild, afterChild, childPath, diffs);
    }
  }
}