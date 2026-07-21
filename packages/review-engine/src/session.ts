// @forge/review-engine
// Review session construction and item mutation (deterministic).

import { computeMetrics } from "./metrics.js";
import { evaluatePolicy, REVIEW_POLICIES } from "./policy.js";
import type {
  CreateReviewSessionInput,
  ReviewComment,
  ReviewDecision,
  ReviewItem,
  ReviewSeverity,
  ReviewSession,
  ReviewSummary,
} from "./types.js";

function deriveSeverity(confidence: number, warnings: readonly string[]): ReviewSeverity {
  if (warnings.length > 0) return "high";
  if (confidence >= 0.9) return "safe";
  if (confidence >= 0.75) return "low";
  if (confidence >= 0.5) return "medium";
  return "high";
}

function buildSummary(items: ReviewItem[]): ReviewSummary {
  return {
    total: items.length,
    approved: items.filter((item) => item.decision === "APPROVE").length,
    rejected: items.filter((item) => item.decision === "REJECT").length,
    edited: items.filter((item) => item.decision === "EDIT").length,
    skipped: items.filter((item) => item.decision === "SKIP").length,
    deferred: items.filter((item) => item.decision === "DEFER").length,
    pending: items.filter((item) => item.decision === undefined).length,
  };
}

function createItem(patch: CreateReviewSessionInput["patches"][number], index: number): ReviewItem {
  const before = patch.currentContent ?? "";
  const after = patch.proposedContent ?? "";
  const severity = deriveSeverity(patch.confidence, patch.warnings);
  return {
    id: patch.id ?? `review-item-${index + 1}`,
    patch,
    before,
    after,
    diff: patch.diff,
    section: patch.sectionId,
    severity,
    confidence: patch.confidence,
    estimatedImpact: patch.estimatedImpact,
    validation: patch.validation,
    warnings: patch.warnings,
    comments: [],
  };
}

/**
 * Create a new review session from a set of content patches.
 */
export function createReviewSession(input: CreateReviewSessionInput): ReviewSession {
  const policy = input.policy ?? REVIEW_POLICIES.balanced;
  const items = input.patches.map((patch, index) => createItem(patch, index));
  const summary = buildSummary(items);
  const base: Omit<ReviewSession, "metrics"> = {
    sessionId: input.sessionId ?? `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    patches: input.patches,
    items,
    summary,
    status: "pending",
    comments: [],
    policy,
  };
  return { ...base, metrics: computeMetrics(base as ReviewSession) };
}

/**
 * Apply the session policy, auto-approving eligible items.
 */
export function applyPolicy(session: ReviewSession): ReviewSession {
  const items = session.items.map((item) => {
    if (item.decision !== undefined) return item;
    const verdict = evaluatePolicy(session.policy, item);
    if (verdict === "auto-approve") {
      return {
        ...item,
        decision: "APPROVE" as ReviewDecision,
        decidedBy: "policy",
        decidedAt: new Date().toISOString(),
      };
    }
    return item;
  });
  const updated: ReviewSession = { ...session, items };
  return { ...updated, summary: buildSummary(items), metrics: computeMetrics(updated) };
}

/**
 * Record a reviewer decision on a single item.
 */
export function decideItem(
  session: ReviewSession,
  itemId: string,
  decision: ReviewDecision,
  decidedBy: string,
  editedContent?: string,
): ReviewSession {
  const items = session.items.map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      decision,
      decidedBy,
      decidedAt: new Date().toISOString(),
      editedContent: editedContent ?? item.editedContent,
    };
  });
  const updated: ReviewSession = { ...session, items };
  return { ...updated, summary: buildSummary(items), metrics: computeMetrics(updated) };
}

/**
 * Add a comment to the session or a specific item.
 */
export function addComment(
  session: ReviewSession,
  comment: ReviewComment,
  itemId?: string,
): ReviewSession {
  if (itemId) {
    const items = session.items.map((item) =>
      item.id === itemId ? { ...item, comments: [...item.comments, comment] } : item,
    );
    return { ...session, items };
  }
  return { ...session, comments: [...session.comments, comment] };
}

/**
 * Look up a single review item by id.
 */
export function getItem(session: ReviewSession, itemId: string): ReviewItem | undefined {
  return session.items.find((item) => item.id === itemId);
}

/**
 * Mark a session as completed (all items decided).
 */
export function completeSession(session: ReviewSession): ReviewSession {
  const updated: ReviewSession = { ...session, status: "completed" };
  return { ...updated, metrics: computeMetrics(updated) };
}
