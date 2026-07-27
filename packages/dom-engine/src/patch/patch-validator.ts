// @forge/dom-engine
// Patch validator: enforces test preconditions and structural checks.

import type { ContentNode } from "../tree/tree-node.js";
import type { PatchOperation } from "../types.js";

/**
 * Validate a patch against a ContentNode tree.
 * Returns an array of error strings (empty = valid).
 */
export function validatePatchAgainstTree(root: ContentNode, path: string[], op: PatchOperation, value?: unknown): string[] {
  const errors: string[] = [];

  if (op === "test") {
    const target = resolvePath(root, path);
    if (!target) {
      errors.push(`Path not found for test: ${JSON.stringify(path)}`);
    } else if (value !== undefined && target.settings["id"] !== value) {
      errors.push(`Test failed: expected ${value}, got ${target.settings["id"]}`);
    }
    return errors;
  }

  if (op === "add" || op === "replace") {
    if (value === undefined) {
      errors.push(`Missing value for ${op} operation`);
    }
  }

  if (op === "remove") {
    if (!resolvePath(root, path)) {
      errors.push(`Cannot remove non-existent path: ${JSON.stringify(path)}`);
    }
  }

  return errors;
}

function resolvePath(root: ContentNode, path: string[]): ContentNode | undefined {
  let current: ContentNode | undefined = root;
  for (const segment of path) {
    const index = Number(segment);
    if (Number.isNaN(index) || index < 0 || !current || index >= current.children.length) {
      return undefined;
    }
    current = current.children[index];
  }
  return current;
}
