import type { ContentPatchRef, ConflictResult, PatchConflict } from './types.js';

export class ConflictDetector {
  /**
   * Detect conflicts among a set of patches.
   * Two patches conflict when they target the same CSS selector within the same section.
   */
  detect(patches: ContentPatchRef[]): ConflictResult {
    const conflicts: PatchConflict[] = [];
    const selectorMap = new Map<string, ContentPatchRef[]>();

    for (const patch of patches) {
      const key = `${patch.section}::${patch.selector}`;
      const existing = selectorMap.get(key) || [];
      existing.push(patch);
      selectorMap.set(key, existing);
    }

    for (const [, patchGroup] of selectorMap) {
      if (patchGroup.length > 1) {
        const first = patchGroup[0];
        if (!first) continue;
        conflicts.push({
          section: first.section,
          selector: first.selector,
          patchIds: patchGroup.map((p) => p.id),
          description: `Conflict detected in section "${first.section}" at selector "${first.selector}". ${patchGroup.length} patches touch the same element.`,
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Check if two specific patches conflict.
   */
  checkPair(a: ContentPatchRef, b: ContentPatchRef): PatchConflict | null {
    if (a.section === b.section && a.selector === b.selector) {
      return {
        section: a.section,
        selector: a.selector,
        patchIds: [a.id, b.id],
        description: `Conflict between ${a.id} and ${b.id} at ${a.section} > ${a.selector}`,
      };
    }
    return null;
  }
}