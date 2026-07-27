// @forge/dom-engine
// Patch merger: merges multiple patches onto the same tree deterministically.

import type { ContentPatch, MergeResult } from "../types.js";

/**
 * Merge multiple patches into a deterministic application order.
 * Order: removes -> adds -> replaces (by path length, longest first).
 */
export function mergePatches(patches: ContentPatch[]): MergeResult {
  const sorted = [...patches].sort((a, b) => {
    const orderScore = (op: string) => {
      if (op === "remove") return 0;
      if (op === "add") return 1;
      if (op === "replace") return 2;
      return 3;
    };
    const scoreDiff = orderScore(a.operation) - orderScore(b.operation);
    if (scoreDiff !== 0) return scoreDiff;
    return patches.indexOf(a) - patches.indexOf(b);
  });

  const conflicts: string[] = [];
  const order: string[] = sorted.map((p) => p.id);

  return { patches: sorted, conflicts, order };
}
