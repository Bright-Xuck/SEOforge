// @forge/homepage-engine
// Sprint 18: produce a Review Session from a homepage optimization plan
// instead of executing immediately. Deterministic, provider-independent.

import { createReviewSession } from "@forge/review-engine";
import type { ContentPatch, SectionDiff } from "@forge/content-generation";
import type { ReviewSession, ReviewPolicy } from "@forge/review-engine";
import type { HomepageOptimizationPlan } from "./types.js";

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

function buildPatch(actionId: string, action: HomepageOptimizationPlan["actions"][number]): ContentPatch {
  const current = stringify(action.currentValue);
  const proposed = stringify(action.proposedValue);
  const diff: SectionDiff = {
    sectionId: action.affectedComponent,
    current,
    generated: proposed,
    changedSentences: [],
    addedEntities: [],
    removedEntities: [],
    seoScoreDelta: 0,
  };
  const confidence = action.risk === "safe" ? 0.95 : action.risk === "moderate" ? 0.8 : action.risk === "high" ? 0.6 : 0.4;
  return {
    id: actionId,
    sectionId: action.affectedComponent,
    operation: "replace",
    selector: action.affectedComponent,
    currentContent: current,
    proposedContent: proposed,
    diff,
    validation: { valid: true, errors: [], warnings: [] },
    confidence,
    estimatedImpact: action.estimatedImpact,
    warnings: [],
    generatedBy: "homepage-engine",
    provider: "none",
    promptVersion: "0.18.0",
    createdAt: new Date().toISOString(),
  } as ContentPatch;
}

/**
 * Build a Review Session from a homepage optimization plan.
 * Stops at review — no execution, no provider writes.
 */
export function createReviewSessionFromHomepage(
  plan: HomepageOptimizationPlan,
  policy?: ReviewPolicy,
): ReviewSession {
  const patches = plan.actions.map((action) => buildPatch(action.id, action));
  return createReviewSession({
    projectId: plan.homepage.project,
    createdBy: "homepage-engine",
    patches,
    policy,
  });
}
