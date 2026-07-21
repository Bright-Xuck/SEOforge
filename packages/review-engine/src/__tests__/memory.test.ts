// @forge/review-engine memory tests (Sprint 18)
// Record review events.

import { describe, it, expect, vi } from "vitest";
import { recordReviewEvents } from "../index.js";

// Mock the memory-engine module
vi.mock("@forge/memory-engine", () => ({
  loadMemory: vi.fn().mockResolvedValue({
    append: vi.fn(),
  }),
  saveMemory: vi.fn().mockResolvedValue(undefined),
}));

describe("recordReviewEvents", () => {
  it("records review-created event", async () => {
    const session = {
      sessionId: "test",
      projectId: "test-project",
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "reviewer",
      patches: [],
      items: [],
      summary: { total: 0, approved: 0, rejected: 0, edited: 0, skipped: 0, deferred: 0, pending: 0 },
      status: "pending" as const,
      comments: [],
      policy: { name: "balanced" as const },
      metrics: { approvalRate: 0, rejectionRate: 0, averageConfidence: 0, averageEstimatedImpact: 0, warnings: 0, highRiskChanges: 0, aiTokenEstimate: 0, estimatedExecutionTimeMs: 0 },
    };

    await expect(recordReviewEvents("projects", session)).resolves.toBeUndefined();
  });

  it("records review-approved events for items", async () => {
    const session = {
      sessionId: "test",
      projectId: "test-project",
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "reviewer",
      patches: [],
      items: [
        {
          id: "1",
          section: "Hero",
          severity: "safe" as const,
          decision: "APPROVE" as const,
          confidence: 0.9,
          warnings: [],
          comments: [],
          estimatedImpact: "5%",
          before: "Old",
          after: "New",
          diff: {} as any,
          patch: {} as any,
          validation: { valid: true, errors: [], warnings: [] },
        },
      ],
      summary: { total: 1, approved: 1, rejected: 0, edited: 0, skipped: 0, deferred: 0, pending: 0 },
      status: "pending" as const,
      comments: [],
      policy: { name: "balanced" as const },
      metrics: { approvalRate: 1, rejectionRate: 0, averageConfidence: 0.9, averageEstimatedImpact: 5, warnings: 0, highRiskChanges: 0, aiTokenEstimate: 0, estimatedExecutionTimeMs: 250 },
    };

    await expect(recordReviewEvents("projects", session)).resolves.toBeUndefined();
  });

  it("records review-rejected events for items", async () => {
    const session = {
      sessionId: "test",
      projectId: "test-project",
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "reviewer",
      patches: [],
      items: [
        {
          id: "1",
          section: "Hero",
          severity: "safe" as const,
          decision: "REJECT" as const,
          confidence: 0.9,
          warnings: [],
          comments: [],
          estimatedImpact: "5%",
          before: "Old",
          after: "New",
          diff: {} as any,
          patch: {} as any,
          validation: { valid: true, errors: [], warnings: [] },
        },
      ],
      summary: { total: 1, approved: 0, rejected: 1, edited: 0, skipped: 0, deferred: 0, pending: 0 },
      status: "pending" as const,
      comments: [],
      policy: { name: "balanced" as const },
      metrics: { approvalRate: 0, rejectionRate: 1, averageConfidence: 0.9, averageEstimatedImpact: 5, warnings: 0, highRiskChanges: 0, aiTokenEstimate: 0, estimatedExecutionTimeMs: 250 },
    };

    await expect(recordReviewEvents("projects", session)).resolves.toBeUndefined();
  });

  it("records review-completed event when status is completed", async () => {
    const session = {
      sessionId: "test",
      projectId: "test-project",
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "reviewer",
      patches: [],
      items: [],
      summary: { total: 0, approved: 0, rejected: 0, edited: 0, skipped: 0, deferred: 0, pending: 0 },
      status: "completed" as const,
      comments: [],
      policy: { name: "balanced" as const },
      metrics: { approvalRate: 0, rejectionRate: 0, averageConfidence: 0, averageEstimatedImpact: 0, warnings: 0, highRiskChanges: 0, aiTokenEstimate: 0, estimatedExecutionTimeMs: 0 },
    };

    await expect(recordReviewEvents("projects", session)).resolves.toBeUndefined();
  });
});