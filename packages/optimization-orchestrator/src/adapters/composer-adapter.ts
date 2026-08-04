// @forge/optimization-orchestrator
// Adapter: wraps @forge/optimization-composer into the Engine interface

import type { Engine } from "../types.js";
import type { OptimizationContext } from "../context.js";
import { OptimizationComposer } from "@forge/optimization-composer";
import type { ContentPatchRef, ComposedPlan, PatchPriority } from "@forge/optimization-composer";

/**
 * Optimization Composer Engine adapter.
 *
 * Reads: generatedPatches (or reviewSession items) from context
 * Writes: patchBundles, dependencyGraph, conflictReport, executionPlan to context
 *
 * Deterministic — bundles patches, builds dependency graph, detects conflicts,
 * validates batch, generates preview, produces composed plan.
 */
export function createComposerEngine(): Engine {
  return {
    type: "composer",
    async execute(ctx: Record<string, unknown>): Promise<Record<string, unknown>> {
      const context = ctx as OptimizationContext;

      // Get patches from review session or generated patches
      const reviewSession = context.reviewSession as any;
      const generatedPatches = context.generatedPatches as any[] | undefined;

      let patches: ContentPatchRef[];

      if (reviewSession?.items) {
        // Use approved items from review session
        patches = reviewSession.items
          .filter((item: any) => item.decision === "APPROVE" || item.decision === "EDIT")
          .map((item: any) => toPatchRef(item.patch));
      } else if (generatedPatches) {
        // Use generated patches directly (no review step)
        patches = generatedPatches.map(toPatchRef);
      } else {
        // No patches — skip composition
        return ctx;
      }

      if (patches.length === 0) {
        return ctx;
      }

      const composer = new OptimizationComposer();
      const plan: ComposedPlan = composer.compose(patches);

      context.patchBundles = plan.bundles as unknown[];
      context.dependencyGraph = plan.graph;
      context.conflictReport = plan.conflicts;
      context.executionPlan = plan;

      return context;
    },
  };
}

/**
 * Map a ContentPatch to a ContentPatchRef for the composer.
 */
function toPatchRef(patch: any): ContentPatchRef {
  return {
    id: patch.id ?? patch.patchId ?? `patch-${Date.now()}`,
    section: patch.sectionId ?? patch.section ?? "unknown",
    priority: (patch.priority ?? "medium") as PatchPriority,
    dependencies: patch.dependencies ?? [],
    selector: patch.selector ?? patch.cssSelector ?? "",
  };
}