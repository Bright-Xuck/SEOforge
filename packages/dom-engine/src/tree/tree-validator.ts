// @forge/dom-engine
// Tree validator: enforces test preconditions and structural checks.

import type { ContentNode } from "./tree-node.js";
import type { PatchOperation } from "../types.js";

/**
 * Validate that a patch can be applied to a tree.
 * Returns a list of validation errors (empty array = valid).
 */
export function validatePatch(root: ContentNode, path: string[], op: PatchOperation, value?: unknown): string[] {
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
  let current: ContentNode = root;
  for (const segment of path) {
    const index = Number(segment);
    if (Number.isNaN(index) || index < 0 || index >= current.children.length) {
      return undefined;
    }
    const child = current.children[index];
    if (!child) return undefined;
    current = child;
  }
  return current;
}

/**
 * Validate that a sequence of patches is internally consistent.
 */
export function validatePatchSequence(patches: { path: string[]; operation: PatchOperation }[]): string[] {
  const errors: string[] = [];
  const paths = patches.map((p) => JSON.stringify(p.path));

  for (let i = 0; i < patches.length; i++) {
    for (let j = i + 1; j < patches.length; j++) {
      if (paths[i] === paths[j]) {
        errors.push(`Duplicate patch path: ${paths[i]}`);
      }
    }
  }

  return errors;
}