// @forge/review-engine
// Deterministic review metrics.

import type { ReviewMetrics, ReviewSession } from "./types.js";

const PER_ITEM_EXECUTION_MS = 250;

function parseImpact(impact: string): number {
  const match = impact.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/**
 * Compute deterministic metrics for a review session.
 */
export function computeMetrics(session: ReviewSession): ReviewMetrics {
  const items = session.items;
  const total = items.length;
  const approved = items.filter((item) => item.decision === "APPROVE").length;
  const rejected = items.filter((item) => item.decision === "REJECT").length;

  const approvalRate = total === 0 ? 0 : approved / total;
  const rejectionRate = total === 0 ? 0 : rejected / total;

  const averageConfidence =
    total === 0 ? 0 : items.reduce((sum, item) => sum + item.confidence, 0) / total;

  const averageEstimatedImpact =
    total === 0 ? 0 : items.reduce((sum, item) => sum + parseImpact(item.estimatedImpact), 0) / total;

  const warnings = items.reduce((sum, item) => sum + item.warnings.length, 0);
  const highRiskChanges = items.filter(
    (item) => item.severity === "high" || item.severity === "critical",
  ).length;

  const aiTokenEstimate = items.reduce(
    (sum, item) => sum + estimateTokens(item.after),
    0,
  );

  const estimatedExecutionTimeMs = total * PER_ITEM_EXECUTION_MS;

  return {
    approvalRate,
    rejectionRate,
    averageConfidence,
    averageEstimatedImpact,
    warnings,
    highRiskChanges,
    aiTokenEstimate,
    estimatedExecutionTimeMs,
  };
}
