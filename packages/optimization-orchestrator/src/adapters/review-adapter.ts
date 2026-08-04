// @forge/optimization-orchestrator
// Adapter: wraps @forge/review-engine into the Engine interface

import type { Engine } from "../types.js";
import type { OptimizationContext } from "../context.js";
import {
  createReviewSession,
  applyPolicy,
  REVIEW_POLICIES,
} from "@forge/review-engine";
import type { ReviewPolicyName } from "@forge/review-engine";
import type { ContentPatch } from "@forge/content-generation";

/**
 * Options for creating the review engine adapter.
 */
export interface ReviewAdapterOptions {
  policy?: ReviewPolicyName;
  createdBy?: string;
}

/**
 * Review Engine adapter.
 *
 * Reads: generatedPatches from context
 * Writes: reviewSession to context
 *
 * Deterministic — applies review policy, creates review session with items.
 * No AI, no providers, no side effects.
 */
export function createReviewEngine(options: ReviewAdapterOptions = {}): Engine {
  return {
    type: "review",
    async execute(ctx: Record<string, unknown>): Promise<Record<string, unknown>> {
      const context = ctx as OptimizationContext;
      const patches = context.generatedPatches as ContentPatch[] | undefined;

      if (!patches || patches.length === 0) {
        // No patches to review — skip
        return ctx;
      }

      const policyName = options.policy ?? "balanced";
      const policy = REVIEW_POLICIES[policyName];

      const session = createReviewSession({
        projectId: context.project,
        createdBy: options.createdBy ?? "orchestrator",
        patches,
        policy,
      });

      const reviewed = applyPolicy(session);
      context.reviewSession = reviewed;

      return context;
    },
  };
}