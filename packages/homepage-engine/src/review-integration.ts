// @forge/homepage-engine
// Sprint 18: produce a Review Session from a homepage optimization plan
// instead of executing immediately. Deterministic, provider-independent.
// Sprint 20: added AI-backed review session creation from content-generation writers.

import { createReviewSession } from "@forge/review-engine";
import type { ContentPatch, SectionDiff, GeneratedContent } from "@forge/content-generation";
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

/**
 * Build a Review Session from AI-generated content (Sprint 20).
 * Consumes GeneratedContent artifacts from content-generation writers.
 */
export function createReviewSessionFromGeneratedContent(
  projectId: string,
  generated: GeneratedContent[],
  policy?: ReviewPolicy,
): ReviewSession {
  const patches: ContentPatch[] = generated.map((item, index) => {
    const diff: SectionDiff = {
      sectionId: item.sectionType,
      current: "",
      generated: item.markdown,
      changedSentences: [],
      addedEntities: [],
      removedEntities: [],
      seoScoreDelta: item.seoScore - 50,
    };
    return {
      id: `ai-${item.sectionType}-${index + 1}`,
      sectionId: item.sectionType,
      operation: "replace",
      selector: `[data-section="${item.sectionType}"]`,
      currentContent: "",
      proposedContent: item.markdown,
      diff,
      validation: item.validation,
      confidence: item.confidence,
      estimatedImpact: `AI-generated ${item.sectionType} section`,
      warnings: [],
      generatedBy: "content-generation",
      provider: "ai-engine",
      promptVersion: "0.20.0",
      createdAt: new Date().toISOString(),
    } as ContentPatch;
  });
  return createReviewSession({
    projectId,
    createdBy: "content-generation",
    patches,
    policy,
  });
}
