// @forge/dom-engine
// Gutenberg target resolver: path match first, fingerprint fallback.

import type { ContentNode, GutenbergPatchTarget, BlockFingerprint } from "../types.js";
import { findNodeByPath } from "../tree/tree-node.js";
import { computeBlockFingerprint, fingerprintsEqual } from "./block-fingerprint.js";

/**
 * Resolve a GutenbergPatchTarget against a parsed ContentNode tree.
 * Tries exact path match first, then fingerprint fallback.
 */
export function resolveGutenbergTarget(root: ContentNode, target: GutenbergPatchTarget): ContentNode | null {
  const pathMatch = findNodeByPath(root, target.blockPath);
  if (pathMatch) {
    return pathMatch;
  }

  return findNodeByFingerprint(root, target.fingerprint);
}

function findNodeByFingerprint(root: ContentNode, fingerprint: BlockFingerprint): ContentNode | null {
  let bestMatch: ContentNode | null = null;
  let bestScore = 0;

  function walk(node: ContentNode, index: number): void {
    if (node.type === "block" && node.widgetType) {
      const candidateFingerprint = computeBlockFingerprint(node.widgetType, node.settings.attrs as Record<string, unknown>, index);
      if (fingerprintsEqual(candidateFingerprint, fingerprint)) {
        bestMatch = node;
        bestScore = 1;
        return;
      }
      if (candidateFingerprint.blockName === fingerprint.blockName && candidateFingerprint.siblingIndex === fingerprint.siblingIndex) {
        const score = 0.6;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = node;
        }
      }
    }

    node.children.forEach((child, i) => walk(child, i));
  }

  walk(root, 0);
  return bestMatch;
}
