// @forge/optimization-orchestrator
// Adapter: wraps @forge/review-engine into the Engine interface

import type { Engine } from "../types.js";
import type { OptimizationContext } from "../context.js";
import {
  createReviewSession,
  applyPolicy,
  decideItem,
  completeSession,
  saveReviewSession,
  REVIEW_POLICIES,
} from "@forge/review-engine";
import type { ReviewPolicyName, ReviewSession } from "@forge/review-engine";
import type { ContentPatch } from "@forge/content-generation";

/**
 * Options for creating the review engine adapter.
 */
export interface ReviewAdapterOptions {
  policy?: ReviewPolicyName;
  createdBy?: string;
  /** When set, sessions are persisted under `<rootDir>/<project>/reviews`. */
  rootDir?: string;
  /**
   * Explicit CLI approval (`optimize --apply`). Only this flag turns pending
   * items into APPROVE; policy auto-approval remains independent.
   */
  autoApproveAll?: boolean;
  /** Mark the session completed (required before apply/execution). */
  complete?: boolean;
}

/**
 * Review Engine adapter.
 *
 * Reads: generatedPatches from context
 * Writes: reviewSession to context
 *
 * Deterministic — applies review policy, creates review session with items.
 * No AI, no providers, no writes to the target site.
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

      let reviewed = applyPolicy(session);

      if (options.autoApproveAll) {
        for (const item of reviewed.items) {
          if (item.decision === undefined) {
            reviewed = decideItem(reviewed, item.id, "APPROVE", "cli:--apply");
          }
        }
      }

      if (options.complete) {
        reviewed = completeSession(reviewed);
      }

      context.reviewSession = reviewed;

      if (options.rootDir) {
        await saveReviewSession(options.rootDir, reviewed);
      }

      return context;
    },
  };
}

/** Narrow helper for callers that already hold a session object. */
export function summarizeDecisions(session: ReviewSession): Record<string, number> {
  return {
    total: session.items.length,
    approved: session.items.filter((item) => item.decision === "APPROVE").length,
    pending: session.items.filter((item) => item.decision === undefined).length,
  };
}
