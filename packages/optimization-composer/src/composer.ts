import type { ContentPatchRef, ComposedPlan } from './types.js';
import { PatchDAG } from './graph.js';
import { ConflictDetector } from './conflict.js';
import { PatchBundler } from './bundler.js';
import { GoalAssigner } from './goals.js';
import { PreviewGenerator } from './preview.js';
import { BatchValidator } from './validator.js';
import { RollbackManager } from './rollback.js';

export class OptimizationComposer {
  private dag: PatchDAG;
  private conflictDetector: ConflictDetector;
  private bundler: PatchBundler;
  private goalAssigner: GoalAssigner;
  private previewGenerator: PreviewGenerator;
  private validator: BatchValidator;
  private rollbackManager: RollbackManager;

  constructor() {
    this.dag = new PatchDAG();
    this.conflictDetector = new ConflictDetector();
    this.bundler = new PatchBundler();
    this.goalAssigner = new GoalAssigner();
    this.previewGenerator = new PreviewGenerator();
    this.validator = new BatchValidator();
    this.rollbackManager = new RollbackManager();
  }

  /**
   * Full compose pipeline: bundle → resolve goals → build graph → detect conflicts → validate → preview → plan
   */
  compose(patches: ContentPatchRef[]): ComposedPlan {
    // Step 1: Bundle patches
    const bundles = this.bundler.bundle(patches);

    // Step 2: Suggest goals and assign
    const suggestedGoal = this.goalAssigner.suggestGoal(patches);
    const goalPatches = this.goalAssigner.assignToPatches(suggestedGoal, patches);

    // Update bundles with goalId
    const updatedBundles = bundles.map((b) => ({
      ...b,
      goalId: b.goalId || suggestedGoal,
    }));

    // Step 3: Build dependency graph
    this.dag = new PatchDAG();
    for (const patch of goalPatches) {
      try {
        this.dag.addPatch(patch);
      } catch {
        // Skip patches with missing deps, they'll be caught by validation
      }
    }

    // Step 4: Detect conflicts
    const conflictResult = this.conflictDetector.detect(patches);

    // Step 5: Generate preview
    const preview = this.previewGenerator.generate(patches, conflictResult.conflicts);

    // Step 6: Validate batch
    const validationResult = this.validator.validate(patches);
    if (!validationResult.valid) {
      return {
        bundles: updatedBundles,
        graph: this.dag.getGraph(),
        executionOrder: [],
        preview,
        conflicts: conflictResult.conflicts,
        priorities: new Map(),
        validationErrors: validationResult.errors,
        validationWarnings: validationResult.warnings,
      };
    }

    // Step 7: Get execution order (topologically sorted by priority)
    let executionOrder: string[];
    try {
      executionOrder = this.dag.getExecutionOrder();
    } catch {
      // Fall back to priority ordering if DAG has cycle
      executionOrder = [...patches]
        .sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
        })
        .map((p) => p.id);
    }

    // Step 8: Build priorities map
    const priorities = new Map<string, ContentPatchRef["priority"]>();
    for (const patch of patches) {
      priorities.set(patch.id, patch.priority);
    }

    // Step 9: Create rollback group
    if (patches.length > 0) {
      const bundleName = bundles[0]?.name || "Optimization";
      this.rollbackManager.createGroup(bundles[0]?.id || "bundle-optimization", bundleName, patches.map((p) => p.id));
    }

    return {
      bundles: updatedBundles,
      graph: this.dag.getGraph(),
      executionOrder,
      preview,
      conflicts: conflictResult.conflicts,
      priorities,
    };
  }

  /**
   * Get the rollback manager for undoing optimization bundles.
   */
  getRollbackManager(): RollbackManager {
    return this.rollbackManager;
  }

  /**
   * Clear the composer state.
   */
  clear(): void {
    this.dag.clear();
  }
}