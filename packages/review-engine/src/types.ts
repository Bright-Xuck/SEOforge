// @forge/review-engine
// Core types for the deterministic Review Engine (Sprint 18).
// Provider-independent: no LLM, no AI, no WordPress writes.

import type { ContentPatch, SectionDiff } from "@forge/content-generation";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "edited"
  | "skipped"
  | "deferred"
  | "completed";

export type ReviewDecision = "APPROVE" | "REJECT" | "EDIT" | "SKIP" | "DEFER";

export type ReviewSeverity = "safe" | "low" | "medium" | "high" | "critical";

export type ReviewTarget = "patch" | "section" | "review";

export interface ReviewComment {
  readonly id: string;
  readonly author: string;
  readonly timestamp: string;
  readonly message: string;
  readonly target: ReviewTarget;
  readonly targetId?: string;
}

export interface ReviewItem {
  readonly id: string;
  readonly patch: ContentPatch;
  readonly before: string;
  readonly after: string;
  readonly diff: SectionDiff;
  readonly section: string;
  readonly severity: ReviewSeverity;
  readonly confidence: number;
  readonly estimatedImpact: string;
  readonly validation: ContentPatch["validation"];
  readonly warnings: readonly string[];
  readonly comments: ReviewComment[];
  readonly decision?: ReviewDecision;
  readonly decidedBy?: string;
  readonly decidedAt?: string;
  readonly editedContent?: string;
}

export interface ReviewSummary {
  readonly total: number;
  readonly approved: number;
  readonly rejected: number;
  readonly edited: number;
  readonly skipped: number;
  readonly deferred: number;
  readonly pending: number;
}

export type ReviewPolicyName = "strict" | "balanced" | "automatic" | "enterprise";

export interface ReviewPolicy {
  readonly name: ReviewPolicyName;
  readonly riskThreshold?: number;
  readonly autoApproveSafeOnly?: boolean;
  readonly autoApproveMediumConfidence?: boolean;
}

export interface ReviewFilter {
  readonly section?: string;
  readonly severity?: ReviewSeverity;
  readonly confidenceMin?: number;
  readonly status?: ReviewDecision;
  readonly provider?: string;
  readonly generator?: string;
  readonly patchType?: ContentPatch["operation"];
}

export type ReviewSortKey = "confidence" | "severity" | "impact" | "createdAt" | "section";
export type ReviewSortDir = "asc" | "desc";

export interface ReviewComparison {
  readonly wordAdditions: number;
  readonly wordRemovals: number;
  readonly sentenceAdditions: number;
  readonly sentenceRemovals: number;
  readonly readabilityDelta: number;
  readonly seoDelta: number;
  readonly keywordAdditions: string[];
  readonly keywordRemovals: string[];
  readonly headingChanges: number;
  readonly entityAdditions: string[];
  readonly entityRemovals: string[];
}

export interface ReviewMetrics {
  readonly approvalRate: number;
  readonly rejectionRate: number;
  readonly averageConfidence: number;
  readonly averageEstimatedImpact: number;
  readonly warnings: number;
  readonly highRiskChanges: number;
  readonly aiTokenEstimate: number;
  readonly estimatedExecutionTimeMs: number;
}

export interface ReviewReport {
  readonly markdown: string;
  readonly json: string;
  readonly html: string;
}

export interface ReviewSession {
  readonly sessionId: string;
  readonly projectId: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly patches: ContentPatch[];
  readonly items: ReviewItem[];
  readonly summary: ReviewSummary;
  readonly status: ReviewStatus;
  readonly comments: ReviewComment[];
  readonly policy: ReviewPolicy;
  readonly metrics: ReviewMetrics;
}

export interface CreateReviewSessionInput {
  readonly sessionId?: string;
  readonly projectId: string;
  readonly createdBy: string;
  readonly patches: ContentPatch[];
  readonly policy?: ReviewPolicy;
}
