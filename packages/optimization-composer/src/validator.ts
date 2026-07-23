import type { ContentPatchRef, ValidationResult, ValidationError } from './types.js';
import { PatchDAG } from './graph.js';
import { ConflictDetector } from './conflict.js';

export class BatchValidator {
  private dag: PatchDAG;
  private conflictDetector: ConflictDetector;

  constructor() {
    this.dag = new PatchDAG();
    this.conflictDetector = new ConflictDetector();
  }

  /**
   * Validate a batch of patches together.
   * Checks: conflicts, missing dependencies, circular dependencies, invalid priorities.
   */
  validate(patches: ContentPatchRef[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // 1. Check for conflicts
    const conflictResult = this.conflictDetector.detect(patches);
    if (conflictResult.hasConflict) {
      for (const conflict of conflictResult.conflicts) {
        errors.push({
          patchIds: conflict.patchIds,
          message: conflict.description,
          type: "conflict",
        });
      }
    }

    // 2. Check dependencies
    const patchIds = new Set(patches.map((p) => p.id));
    for (const patch of patches) {
      for (const depId of patch.dependencies || []) {
        if (!patchIds.has(depId)) {
          errors.push({
            patchIds: [patch.id],
            message: `Missing dependency: ${depId} required by ${patch.id}`,
            type: "missing_dependency",
          });
        }
      }
    }

    // 3. Check for circular dependencies
    try {
      this.dag = new PatchDAG();
      for (const patch of patches) {
        this.dag.addPatch(patch);
      }
      if (this.dag.hasCycle()) {
        errors.push({
          patchIds: patches.map((p) => p.id),
          message: "Circular dependency detected in patch batch",
          type: "circular_dependency",
        });
      }
    } catch (e) {
      if (e instanceof Error) {
        errors.push({
          patchIds: patches.map((p) => p.id),
          message: e.message,
          type: "circular_dependency",
        });
      }
    }

    // 4. Validate priorities
    const validPriorities = ["critical", "high", "medium", "low"];
    for (const patch of patches) {
      if (!validPriorities.includes(patch.priority)) {
        errors.push({
          patchIds: [patch.id],
          message: `Invalid priority "${patch.priority}" for ${patch.id}`,
          type: "invalid_priority",
        });
      }
    }

    // 5. Generate warnings
    if (patches.length > 20) {
      warnings.push(`Large patch batch: ${patches.length} patches. Consider splitting into smaller bundles.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate patches in groups (grouped by section).
   */
  validateBySection(patches: ContentPatchRef[]): Map<string, ValidationResult> {
    const sectionMap = new Map<string, ContentPatchRef[]>();
    for (const patch of patches) {
      const existing = sectionMap.get(patch.section) || [];
      existing.push(patch);
      sectionMap.set(patch.section, existing);
    }

    const results = new Map<string, ValidationResult>();
    for (const [section, sectionPatches] of sectionMap) {
      results.set(section, this.validate(sectionPatches));
    }

    return results;
  }
}