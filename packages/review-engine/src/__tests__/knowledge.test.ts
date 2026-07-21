// @forge/review-engine knowledge tests (Sprint 18)
// Update review stats in knowledge graph.

import { describe, it, expect, vi } from "vitest";
import { updateReviewKnowledge } from "../index.js";

// Mock the knowledge-engine module
vi.mock("@forge/knowledge-engine", () => ({
  loadKnowledge: vi.fn().mockResolvedValue({
    nodes: [{ id: "project:test-project", type: "project", data: { name: "test-project" } }],
    edges: [],
  }),
  saveKnowledge: vi.fn().mockResolvedValue(undefined),
  updateKnowledgeGraph: vi.fn((graph: any, data: any) => ({
    ...graph,
    reviewStats: data.reviewStats,
  })),
}));

describe("updateReviewKnowledge", () => {
  it("updates review stats in knowledge graph", async () => {
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
        {
          id: "2",
          section: "Hero",
          severity: "safe" as const,
          decision: "REJECT" as const,
          confidence: 0.8,
          warnings: [],
          comments: [],
          estimatedImpact: "3%",
          before: "Old",
          after: "New",
          diff: {} as any,
          patch: {} as any,
          validation: { valid: true, errors: [], warnings: [] },
        },
      ],
      summary: { total: 2, approved: 1, rejected: 1, edited: 0, skipped: 0, deferred: 0, pending: 0 },
      status: "completed" as const,
      comments: [],
      policy: { name: "balanced" as const },
      metrics: { approvalRate: 0.5, rejectionRate: 0.5, averageConfidence: 0.85, averageEstimatedImpact: 4, warnings: 0, highRiskChanges: 0, aiTokenEstimate: 0, estimatedExecutionTimeMs: 500 },
    };

    await expect(updateReviewKnowledge("projects", session)).resolves.toBeUndefined();
  });

  it("tracks rejected sections", async () => {
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
      status: "completed" as const,
      comments: [],
      policy: { name: "balanced" as const },
      metrics: { approvalRate: 0, rejectionRate: 1, averageConfidence: 0.9, averageEstimatedImpact: 5, warnings: 0, highRiskChanges: 0, aiTokenEstimate: 0, estimatedExecutionTimeMs: 250 },
    };

    await expect(updateReviewKnowledge("projects", session)).resolves.toBeUndefined();
  });

  it("tracks edited sections", async () => {
    const session = {
      sessionId: "test",
      projectId: "test-project",
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "reviewer",
      patches: [],
      items: [
        {
          id: "1",
          section: "Footer",
          severity: "safe" as const,
          decision: "EDIT" as const,
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
      summary: { total: 1, approved: 0, rejected: 0, edited: 1, skipped: 0, deferred: 0, pending: 0 },
      status: "completed" as const,
      comments: [],
      policy: { name: "balanced" as const },
      metrics: { approvalRate: 0, rejectionRate: 0, averageConfidence: 0.9, averageEstimatedImpact: 5, warnings: 0, highRiskChanges: 0, aiTokenEstimate: 0, estimatedExecutionTimeMs: 250 },
    };

    await expect(updateReviewKnowledge("projects", session)).resolves.toBeUndefined();
  });
});