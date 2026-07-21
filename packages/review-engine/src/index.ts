// @forge/review-engine
// Public API for the deterministic Review Engine (Sprint 18).

export * from "./types.js";
export { compareContent } from "./comparison.js";
export {
  createReviewSession,
  applyPolicy,
  decideItem,
  addComment,
  getItem,
  completeSession,
} from "./session.js";
export { REVIEW_POLICIES, evaluatePolicy, severityRank } from "./policy.js";
export { filterItems, sortItems } from "./query.js";
export { computeMetrics } from "./metrics.js";
export { generateReport } from "./report.js";
export { recordReviewEvents } from "./memory.js";
export { updateReviewKnowledge } from "./knowledge.js";
export {
  saveReviewSession,
  loadReviewSession,
  listReviewSessions,
  moveToCompleted,
  updateReviewIndex,
} from "./storage.js";
export type {
  ReviewIndexEntry,
} from "./storage.js";

import { createReviewSession, applyPolicy, decideItem, addComment, completeSession } from "./session.js";
import { computeMetrics } from "./metrics.js";
import { filterItems, sortItems } from "./query.js";
import { generateReport } from "./report.js";
import type {
  CreateReviewSessionInput,
  ReviewComment,
  ReviewDecision,
  ReviewFilter,
  ReviewSession,
  ReviewSortDir,
  ReviewSortKey,
} from "./types.js";

/**
 * Facade over the Review Engine. Deterministic, provider-independent.
 */
export class ReviewEngine {
  createSession(input: CreateReviewSessionInput): ReviewSession {
    return createReviewSession(input);
  }

  applyPolicy(session: ReviewSession): ReviewSession {
    return applyPolicy(session);
  }

  decide(
    session: ReviewSession,
    itemId: string,
    decision: ReviewDecision,
    decidedBy: string,
    editedContent?: string,
  ): ReviewSession {
    return decideItem(session, itemId, decision, decidedBy, editedContent);
  }

  comment(session: ReviewSession, comment: ReviewComment, itemId?: string): ReviewSession {
    return addComment(session, comment, itemId);
  }

  complete(session: ReviewSession): ReviewSession {
    return completeSession(session);
  }

  filter(session: ReviewSession, filter: ReviewFilter): ReviewSession {
    return { ...session, items: filterItems(session.items, filter) };
  }

  sort(session: ReviewSession, by: ReviewSortKey, dir?: ReviewSortDir): ReviewSession {
    return { ...session, items: sortItems(session.items, by, dir) };
  }

  metrics(session: ReviewSession) {
    return computeMetrics(session);
  }

  report(session: ReviewSession) {
    return generateReport(session);
  }
}
