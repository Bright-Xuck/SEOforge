// @forge/review-engine
// Deterministic approval policies. AI never approves; only rules + reviewers decide.

import type { ReviewItem, ReviewPolicy, ReviewPolicyName, ReviewSeverity } from "./types.js";

export const REVIEW_POLICIES: Record<ReviewPolicyName, ReviewPolicy> = {
  strict: {
    name: "strict",
    riskThreshold: 0,
    autoApproveSafeOnly: true,
    autoApproveMediumConfidence: false,
  },
  balanced: {
    name: "balanced",
    riskThreshold: 0.5,
    autoApproveSafeOnly: false,
    autoApproveMediumConfidence: true,
  },
  automatic: {
    name: "automatic",
    riskThreshold: 0.7,
    autoApproveSafeOnly: false,
    autoApproveMediumConfidence: true,
  },
  enterprise: {
    name: "enterprise",
    riskThreshold: 0,
    autoApproveSafeOnly: false,
    autoApproveMediumConfidence: false,
  },
};

const SEVERITY_RANK: Record<ReviewSeverity, number> = {
  safe: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function severityRank(severity: ReviewSeverity): number {
  return SEVERITY_RANK[severity];
}

/**
 * Decide whether an item may be auto-approved under a policy.
 * Returns "auto-approve" or "manual". AI never makes this decision.
 */
export function evaluatePolicy(policy: ReviewPolicy, item: ReviewItem): "auto-approve" | "manual" {
  // Enterprise never auto-approves.
  if (policy.name === "enterprise") return "manual";

  // Blocked validation or explicit warnings force manual review.
  if (item.validation && item.validation.valid === false) return "manual";
  if (item.warnings.length > 0) return "manual";

  // High/critical severity always requires a human reviewer.
  if (severityRank(item.severity) >= severityRank("high")) return "manual";

  // Strict only auto-approves safe items.
  if (policy.name === "strict") {
    if (item.severity !== "safe") return "manual";
    return item.confidence >= 0.8 ? "auto-approve" : "manual";
  }

  // Balanced / automatic use the risk threshold.
  const threshold = policy.riskThreshold ?? 0;
  if (item.confidence < threshold) return "manual";

  // Balanced requires at least medium confidence for auto-approval.
  if (policy.name === "balanced" && item.confidence < 0.6) return "manual";

  return "auto-approve";
}
