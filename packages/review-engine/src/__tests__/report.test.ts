// @forge/review-engine report tests (Sprint 18)
// Generate MD/HTML/JSON reports.

import { describe, it, expect } from "vitest";
import { generateReport, REVIEW_POLICIES } from "../index.js";
import type { ReviewSession } from "../types.js";

function makeSession(overrides: Partial<ReviewSession> = {}): ReviewSession {
  return {
    sessionId: overrides.sessionId ?? "test",
    projectId: overrides.projectId ?? "test-project",
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00Z",
    createdBy: overrides.createdBy ?? "reviewer",
    patches: overrides.patches ?? [],
    items: overrides.items ?? [],
    summary: overrides.summary ?? { total: 0, approved: 0, rejected: 0, edited: 0, skipped: 0, deferred: 0, pending: 0 },
    status: overrides.status ?? "completed",
    comments: overrides.comments ?? [],
    policy: overrides.policy ?? REVIEW_POLICIES.balanced,
    metrics: overrides.metrics ?? { approvalRate: 0, rejectionRate: 0, averageConfidence: 0, averageEstimatedImpact: 0, warnings: 0, highRiskChanges: 0, aiTokenEstimate: 0, estimatedExecutionTimeMs: 0 },
  };
}

describe("generateReport", () => {
  it("generates markdown report", () => {
    const session = makeSession({
      items: [
        {
          id: "1",
          section: "Hero",
          severity: "safe",
          decision: "APPROVE",
          confidence: 0.9,
          warnings: [],
          comments: [],
          estimatedImpact: "5%",
          before: "Old Title",
          after: "New Title",
          diff: {} as any,
          patch: {} as any,
          validation: { valid: true, errors: [], warnings: [] },
        },
      ],
      comments: [{ id: "c1", author: "reviewer", timestamp: "2025-01-01T00:00:00Z", message: "Session summary", target: "review" as const }],
    });

    const result = generateReport(session);
    expect(result.markdown).toContain("test-project");
    expect(result.markdown).toContain("Hero");
    expect(result.markdown).toContain("APPROVE");
  });

  it("generates HTML report", () => {
    const session = makeSession({
      items: [
        {
          id: "1",
          section: "Hero",
          severity: "safe",
          decision: "APPROVE",
          confidence: 0.9,
          warnings: [],
          comments: [],
          estimatedImpact: "5%",
          before: "Old Title",
          after: "New Title",
          diff: {} as any,
          patch: {} as any,
          validation: { valid: true, errors: [], warnings: [] },
        },
      ],
    });

    const result = generateReport(session);
    expect(result.html).toContain("test-project");
    expect(result.html).toContain("<h1>");
    expect(result.html).toContain("</h1>");
  });

  it("generates JSON report", () => {
    const session = makeSession({
      items: [
        {
          id: "1",
          section: "Hero",
          severity: "safe",
          decision: "APPROVE",
          confidence: 0.9,
          warnings: [],
          comments: [],
          estimatedImpact: "5%",
          before: "Old Title",
          after: "New Title",
          diff: {} as any,
          patch: {} as any,
          validation: { valid: true, errors: [], warnings: [] },
        },
      ],
    });

    const result = generateReport(session);
    expect(result.json).toContain('"sessionId": "test"');
    expect(result.json).toContain('"projectId": "test-project"');
    expect(result.json).toContain('"status": "completed"');
  });

  it("handles empty session", () => {
    const session = makeSession({ items: [] });
    const result = generateReport(session);
    expect(result.markdown).toContain("test-project");
    expect(result.json).toContain('"items": []');
  });
});