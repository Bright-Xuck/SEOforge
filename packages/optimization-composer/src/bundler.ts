import type { ContentPatchRef, PatchBundle } from './types.js';

export class PatchBundler {
  /**
   * Group patches into logical bundles based on section relationships.
   */
  bundle(patches: ContentPatchRef[]): PatchBundle[] {
    const sectionMap = new Map<string, ContentPatchRef[]>();

    for (const patch of patches) {
      const existing = sectionMap.get(patch.section) || [];
      existing.push(patch);
      sectionMap.set(patch.section, existing);
    }

    const bundles: PatchBundle[] = [];
    for (const [section, sectionPatches] of sectionMap) {
      const bundleId = `bundle-${section.toLowerCase().replace(/\s+/g, '-')}`;
      bundles.push({
        id: bundleId,
        name: `${section} Optimization`,
        description: `Optimization bundle for ${section} section`,
        patches: sectionPatches,
        createdAt: new Date().toISOString(),
      });
    }

    return bundles;
  }

  /**
   * Create a custom bundle from specific patches.
   */
  createBundle(
    id: string,
    name: string,
    description: string,
    patches: ContentPatchRef[],
    goalId?: string,
  ): PatchBundle {
    return {
      id,
      name,
      description,
      goalId,
      patches,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Merge multiple bundles by combining their patch lists.
   */
  merge(bundles: PatchBundle[], name: string): PatchBundle {
    const allPatches: ContentPatchRef[] = [];
    for (const bundle of bundles) {
      allPatches.push(...bundle.patches);
    }
    return {
      id: `bundle-merged-${Date.now()}`,
      name,
      description: `Merged bundle from ${bundles.length} sub-bundles`,
      patches: allPatches,
      createdAt: new Date().toISOString(),
    };
  }
}