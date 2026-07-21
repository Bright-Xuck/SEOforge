// @forge/review-engine metrics tests (Sprint 18)
// Compute session metrics.

import { describe, it, expect } from "vitest";
import { computeMetrics, REVIEW_POLICIES } from "../index.js";
import type { ReviewSession } from "../types.js";

function makeSession(overrides: Partial<ReviewSession> = {}): ReviewSession {
  return {
    sessionId: overrides.sessionId ?? "test",
    projectId: overrides.projectId ?? "test",
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00Z",
    createdBy: overrides.createdBy ?? "test",
    patches: overrides.patches ?? [],
    items: overrides.items ?? [],
    summary: overrides.summary ?? { total: 0, approved: 0, rejected: 0, edited: 0, skipped: 0, deferred: 0, pending: 0 },
    status: overrides.status ?? "completed",
    comments: overrides.comments ?? [],
    policy: overrides.policy ?? REVIEW_POLICIES.balanced,
    metrics: overrides.metrics ?? {} as any,
  };
}

describe("computeMetrics", () => {
  it("calculates approval and rejection rates", () => {
    const session = makeSession({
      items: [
        { id: "1", section: "A", severity: "safe", decision: "APPROVE", confidence: 0.9, warnings: [], comments: [], estimatedImpact: "5%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "2", section: "B", severity: "medium", decision: "APPROVE", confidence: 0.8, warnings: [], comments: [], estimatedImpact: "3%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "3", section: "C", severity: "high", decision: "REJECT", confidence: 0.7, warnings: [], comments: [], estimatedImpact: "2%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "4", section: "D", severity: "safe", decision: "APPROVE", confidence: 0.9, warnings: [], comments: [], estimatedImpact: "4%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "5", section: "E", severity: "critical", decision: "REJECT", confidence: 0.6, warnings: [], comments: [], estimatedImpact: "1%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
      ],
    });

    const result = computeMetrics(session);
    expect(result.approvalRate).toBe(0.6);
    expect(result.rejectionRate).toBe(0.4);
  });

  it("calculates average confidence", () => {
    const session = makeSession({
      items: [
        { id: "1", section: "A", severity: "safe", decision: "APPROVE", confidence: 0.9, warnings: [], comments: [], estimatedImpact: "5%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "2", section: "B", severity: "medium", decision: "APPROVE", confidence: 0.5, warnings: [], comments: [], estimatedImpact: "3%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "3", section: "C", severity: "high", decision: "REJECT", confidence: 0.7, warnings: [], comments: [], estimatedImpact: "2%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
      ],
    });

    const result = computeMetrics(session);
    expect(result.averageConfidence).toBeCloseTo(0.7, 5);
  });

  it("counts high risk changes", () => {
    const session = makeSession({
      items: [
        { id: "1", section: "A", severity: "safe", decision: "APPROVE", confidence: 0.9, warnings: [], comments: [], estimatedImpact: "5%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "2", section: "B", severity: "high", decision: "APPROVE", confidence: 0.8, warnings: [], comments: [], estimatedImpact: "3%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "3", section: "C", severity: "critical", decision: "REJECT", confidence: 0.7, warnings: [], comments: [], estimatedImpact: "2%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "4", section: "D", severity: "medium", decision: "APPROVE", confidence: 0.9, warnings: [], comments: [], estimatedImpact: "4%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "5", section: "E", severity: "high", decision: "REJECT", confidence: 0.6, warnings: [], comments: [], estimatedImpact: "1%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
      ],
    });

    const result = computeMetrics(session);
    expect(result.highRiskChanges).toBe(3);
  });

  it("counts warnings", () => {
    const session = makeSession({
      items: [
        { id: "1", section: "A", severity: "safe", decision: "APPROVE", confidence: 0.9, warnings: ["warn1"], comments: [], estimatedImpact: "5%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "2", section: "B", severity: "medium", decision: "APPROVE", confidence: 0.8, warnings: ["warn2", "warn3"], comments: [], estimatedImpact: "3%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
      ],
    });

    const result = computeMetrics(session);
    expect(result.warnings).toBe(3);
  });

  it("estimates execution time based on item count", () => {
    const session = makeSession({
      items: [
        { id: "1", section: "A", severity: "safe", decision: "APPROVE", confidence: 0.9, warnings: [], comments: [], estimatedImpact: "5%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "2", section: "B", severity: "medium", decision: "APPROVE", confidence: 0.8, warnings: [], comments: [], estimatedImpact: "3%", before: "", after: "", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
      ],
    });

    const result = computeMetrics(session);
    expect(result.estimatedExecutionTimeMs).toBe(500); // 2 * 250
  });

  it("handles empty session", () => {
    const session = makeSession({ items: [] });
    const result = computeMetrics(session);
    expect(result.approvalRate).toBe(0);
    expect(result.rejectionRate).toBe(0);
    expect(result.averageConfidence).toBe(0);
    expect(result.highRiskChanges).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.estimatedExecutionTimeMs).toBe(0);
  });

  it("calculates token estimate correctly", () => {
    const session = makeSession({
      items: [
        { id: "1", section: "A", severity: "safe", decision: "APPROVE", confidence: 0.9, warnings: [], comments: [], estimatedImpact: "5%", before: "", after: "Hello world.", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
        { id: "2", section: "B", severity: "medium", decision: "APPROVE", confidence: 0.8, warnings: [], comments: [], estimatedImpact: "3%", before: "", after: "Test content.", diff: {} as any, patch: {} as any, validation: { valid: true, errors: [], warnings: [] } },
      ],
    });

    const result = computeMetrics(session);
    expect(result.aiTokenEstimate).toBeGreaterThan(0);
  });
});