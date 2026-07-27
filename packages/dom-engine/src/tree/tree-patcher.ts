// @forge/dom-engine
// JSON Patch-style tree patcher for ContentNode trees.
// Used by both Elementor and Gutenberg paths.

import type { ContentNode } from "./tree-node.js";
import type { PatchOperation, TreeDiffEntry } from "../types.js";

/**
 * Apply a single JSON Patch-style operation to a ContentNode tree.
 * Returns a new tree (immutable).
 */
export function applyPatch(root: ContentNode, path: string[], op: PatchOperation, value?: unknown): ContentNode {
  const cloned = cloneTree(root);
  applyPatchInPlace(cloned, path, op, value);
  return cloned;
}

/**
 * Apply a patch in-place (mutates the given node).
 */
function applyPatchInPlace(node: ContentNode, path: string[], op: PatchOperation, value?: unknown): void {
  if (path.length === 0) {
    switch (op) {
      case "replace":
        if (value !== undefined && typeof value === "object" && value !== null && "id" in (value as Record<string, unknown>) && "type" in (value as Record<string, unknown>)) {
          Object.assign(node, value as Partial<ContentNode>);
        } else if (typeof value === "object" && value !== null) {
          Object.assign(node.settings, value as Record<string, unknown>);
        }
        break;
      case "test":
        if (node.settings["id"] !== value) {
          throw new Error(`Test failed: expected ${value}, got ${node.settings["id"]}`);
        }
        break;
      default:
        throw new Error(`Unsupported root operation: ${op}`);
    }
    return;
  }

  const [head, ...rest] = path;
  const index = Number(head);
  if (Number.isNaN(index) || index < 0 || index >= node.children.length) {
    throw new Error(`Invalid path segment: ${head}`);
  }
  const child = node.children[index];
  if (!child) {
    throw new Error(`Child not found at index ${index}`);
  }

  switch (op) {
    case "add":
      if (rest.length === 0) {
        if (Array.isArray(value)) {
          node.children[index] = value[0] as ContentNode;
        }
      } else {
        applyPatchInPlace(child, rest, op, value);
      }
      break;
    case "replace":
      if (rest.length === 0) {
        if (typeof value === "object" && value !== null) {
          Object.assign(child.settings, value as Record<string, unknown>);
        }
      } else {
        applyPatchInPlace(child, rest, op, value);
      }
      break;
    case "remove":
      if (rest.length === 0) {
        node.children.splice(index, 1);
      } else {
        applyPatchInPlace(child, rest, op, value);
      }
      break;
    case "move":
    case "copy":
      throw new Error(`Operation ${op} not yet implemented`);
    default:
      throw new Error(`Unknown operation: ${op}`);
  }
}

/**
 * Compute a structural diff between two ContentNode trees.
 */
export function diffTrees(before: ContentNode, after: ContentNode): TreeDiffEntry[] {
  const diffs: TreeDiffEntry[] = [];
  diffRecursive(before, after, [], diffs);
  return diffs;
}

function diffRecursive(before: ContentNode, after: ContentNode, path: string[], diffs: TreeDiffEntry[]): void {
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
      diffRecursive(beforeChild, afterChild, childPath, diffs);
    }
  }
}

/**
 * Clone a ContentNode tree.
 */
function cloneTree(node: ContentNode): ContentNode {
  return {
    ...node,
    settings: { ...node.settings },
    children: node.children.map(cloneTree),
    raw: structuredClone(node.raw),
  };
}