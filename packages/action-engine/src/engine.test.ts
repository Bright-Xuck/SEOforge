// @forge/action-engine/engine.test
// Unit tests for the action engine and policy engine.

import { describe, it, expect, beforeEach } from "vitest";
import { generateExecutionPlan, getRiskLevel, getActionType, isAutomatable, requiresApproval } from "../src/index.js";
import { ApprovalQueue } from "../src/queue.js";
import type { RecommendationReport, FindingId } from "@forge/core";

// Helper to create a minimal recommendation report for testing
function createReport(overrides: Partial<RecommendationReport> = {}): RecommendationReport {
  return {
    url: "https://example.com/",
    generatedAt: new Date().toISOString(),
    recommendations: [],
    summary: { total: 0, byPriority: { critical: 0, high: 0, medium: 0, low: 0 } },
    estimatedEffort: "0 minutes",
    priorityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
    ...overrides,
  } as RecommendationReport;
}

describe("generateExecutionPlan", () => {
  it("returns empty plan for report with no recommendations", () => {
    const report = createReport({ recommendations: [] });
    const plan = generateExecutionPlan(report);

    expect(plan.url).toBe("https://example.com/");
    expect(plan.actions).toHaveLength(0);
    expect(plan.approvalQueue).toHaveLength(0);
    expect(plan.summary.total).toBe(0);
    expect(plan.estimatedDuration).toBe("0 minutes");
  });

  it("generates actions for each recommendation", () => {
    const report = createReport({
      recommendations: [
        {
          id: "rec1",
          findingId: "seo.missing_title" as FindingId,
          title: "Add Title",
          description: "Missing title",
          reason: "Search engines use titles",
          priority: "critical" as const,
          difficulty: "easy" as const,
          estimatedTime: "2 minutes",
          expectedImpact: "high" as const,
          implementationSteps: [{ order: 1, description: "Add title" }],
          references: [],
          automatable: true,
          manualReviewRequired: false,
        },
      ],
      summary: { total: 1, byPriority: { critical: 1, high: 0, medium: 0, low: 0 } },
      estimatedEffort: "2 minutes",
      priorityBreakdown: { critical: 1, high: 0, medium: 0, low: 0 },
    });

    const plan = generateExecutionPlan(report);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]?.findingId).toBe("seo.missing_title");
    expect(plan.actions[0]?.type).toBe("seo.add-title");
    expect(plan.actions[0]?.risk).toBe("safe");
  });

  it("calculates risk summary correctly", () => {
    const report = createReport({
      recommendations: [
        {
          id: "rec1",
          findingId: "seo.missing_title" as FindingId,
          title: "Add Title",
          description: "Missing title",
          reason: "Search engines use titles",
          priority: "critical" as const,
          difficulty: "easy" as const,
          estimatedTime: "2 minutes",
          expectedImpact: "high" as const,
          implementationSteps: [],
          references: [],
          automatable: true,
          manualReviewRequired: false,
        },
        {
          id: "rec2",
          findingId: "seo.missing_canonical" as FindingId,
          title: "Add Canonical",
          description: "Missing canonical",
          reason: "Prevents duplicate content",
          priority: "medium" as const,
          difficulty: "easy" as const,
          estimatedTime: "3 minutes",
          expectedImpact: "medium" as const,
          implementationSteps: [],
          references: [],
          automatable: false,
          manualReviewRequired: true,
        },
      ],
      summary: { total: 2, byPriority: { critical: 1, high: 0, medium: 1, low: 0 } },
      estimatedEffort: "5 minutes",
      priorityBreakdown: { critical: 1, high: 0, medium: 1, low: 0 },
    });

    const plan = generateExecutionPlan(report);

    expect(plan.riskSummary.safe).toBe(1);
    expect(plan.riskSummary.moderate).toBe(1);
    expect(plan.riskSummary.high).toBe(0);
    expect(plan.riskSummary.critical).toBe(0);
  });

  it("populates approval queue for non-safe actions", () => {
    const report = createReport({
      recommendations: [
        {
          id: "rec1",
          findingId: "seo.missing_title" as FindingId,
          title: "Add Title",
          description: "Missing title",
          reason: "Search engines use titles",
          priority: "critical" as const,
          difficulty: "easy" as const,
          estimatedTime: "2 minutes",
          expectedImpact: "high" as const,
          implementationSteps: [],
          references: [],
          automatable: true,
          manualReviewRequired: false,
        },
        {
          id: "rec2",
          findingId: "seo.missing_canonical" as FindingId,
          title: "Add Canonical",
          description: "Missing canonical",
          reason: "Prevents duplicate content",
          priority: "medium" as const,
          difficulty: "easy" as const,
          estimatedTime: "3 minutes",
          expectedImpact: "medium" as const,
          implementationSteps: [],
          references: [],
          automatable: false,
          manualReviewRequired: true,
        },
      ],
      summary: { total: 2, byPriority: { critical: 1, high: 0, medium: 1, low: 0 } },
      estimatedEffort: "5 minutes",
      priorityBreakdown: { critical: 1, high: 0, medium: 1, low: 0 },
    });

    const plan = generateExecutionPlan(report);

    expect(plan.approvalQueue).toHaveLength(1);
    expect(plan.summary.automatable).toBe(1);
    expect(plan.summary.requiresApproval).toBe(1);
  });
});

describe("Policy Engine", () => {
  describe("getRiskLevel", () => {
    it("returns safe for missing_title", () => {
      expect(getRiskLevel("seo.missing_title" as FindingId)).toBe("safe");
    });

    it("returns safe for missing_meta_description", () => {
      expect(getRiskLevel("seo.missing_meta_description" as FindingId)).toBe("safe");
    });

    it("returns moderate for missing_canonical", () => {
      expect(getRiskLevel("seo.missing_canonical" as FindingId)).toBe("moderate");
    });

    it("returns high for title_too_short", () => {
      expect(getRiskLevel("seo.title_too_short" as FindingId)).toBe("high");
    });

    it("returns critical for robots_noindex", () => {
      expect(getRiskLevel("seo.robots_noindex" as FindingId)).toBe("critical");
    });

    it("returns moderate for unknown findings", () => {
      expect(getRiskLevel("unknown.finding" as FindingId)).toBe("moderate");
    });
  });

  describe("getActionType", () => {
    it("returns correct action type for missing_title", () => {
      expect(getActionType("seo.missing_title" as FindingId)).toBe("seo.add-title");
    });

    it("returns correct action type for missing_meta_description", () => {
      expect(getActionType("seo.missing_meta_description" as FindingId)).toBe("seo.add-meta-description");
    });

    it("returns undefined for unknown findings", () => {
      expect(getActionType("unknown.finding" as FindingId)).toBeUndefined();
    });
  });

  describe("isAutomatable", () => {
    it("returns true for safe risk", () => {
      expect(isAutomatable("safe")).toBe(true);
    });

    it("returns false for non-safe risks", () => {
      expect(isAutomatable("moderate")).toBe(false);
      expect(isAutomatable("high")).toBe(false);
      expect(isAutomatable("critical")).toBe(false);
    });
  });

  describe("requiresApproval", () => {
    it("returns false for safe risk", () => {
      expect(requiresApproval("safe")).toBe(false);
    });

    it("returns true for non-safe risks", () => {
      expect(requiresApproval("moderate")).toBe(true);
      expect(requiresApproval("high")).toBe(true);
      expect(requiresApproval("critical")).toBe(true);
    });
  });
});

describe("ApprovalQueue", () => {
  let queue: ApprovalQueue;

  beforeEach(() => {
    queue = new ApprovalQueue();
  });

  describe("add", () => {
    it("adds an action to the queue", () => {
      const action = {
        id: "action1",
        recommendationId: "rec1",
        findingId: "seo.missing_canonical" as FindingId,
        type: "seo.add-canonical" as const,
        title: "Add Canonical",
        description: "Missing canonical",
        priority: "medium" as const,
        risk: "moderate" as const,
        automatable: false,
        requiresApproval: true,
        rollbackSupported: true,
        estimatedDuration: "3 minutes",
        requiredProvider: "website-reader",
        payload: {},
        status: "pending" as const,
      };

      queue.add(action);
      expect(queue.pendingCount).toBe(1);
    });
  });

  describe("approve", () => {
    it("approves a pending action", () => {
      const action = {
        id: "action1",
        recommendationId: "rec1",
        findingId: "seo.missing_canonical" as FindingId,
        type: "seo.add-canonical" as const,
        title: "Add Canonical",
        description: "Missing canonical",
        priority: "medium" as const,
        risk: "moderate" as const,
        automatable: false,
        requiresApproval: true,
        rollbackSupported: true,
        estimatedDuration: "3 minutes",
        requiredProvider: "website-reader",
        payload: {},
        status: "pending" as const,
      };

      queue.add(action);
      expect(queue.approve("action1")).toBe(true);
      expect(queue.get("action1")?.status).toBe("approved");
    });

    it("returns false for non-existent action", () => {
      expect(queue.approve("nonexistent")).toBe(false);
    });
  });

  describe("reject", () => {
    it("rejects a pending action", () => {
      const action = {
        id: "action1",
        recommendationId: "rec1",
        findingId: "seo.missing_canonical" as FindingId,
        type: "seo.add-canonical" as const,
        title: "Add Canonical",
        description: "Missing canonical",
        priority: "medium" as const,
        risk: "moderate" as const,
        automatable: false,
        requiresApproval: true,
        rollbackSupported: true,
        estimatedDuration: "3 minutes",
        requiredProvider: "website-reader",
        payload: {},
        status: "pending" as const,
      };

      queue.add(action);
      expect(queue.reject("action1")).toBe(true);
      expect(queue.get("action1")?.status).toBe("rejected");
    });
  });

  describe("listPending", () => {
    it("returns only pending items", () => {
      const action1 = {
        id: "action1",
        recommendationId: "rec1",
        findingId: "seo.missing_canonical" as FindingId,
        type: "seo.add-canonical" as const,
        title: "Add Canonical",
        description: "Missing canonical",
        priority: "medium" as const,
        risk: "moderate" as const,
        automatable: false,
        requiresApproval: true,
        rollbackSupported: true,
        estimatedDuration: "3 minutes",
        requiredProvider: "website-reader",
        payload: {},
        status: "pending" as const,
      };

      const action2 = {
        id: "action2",
        recommendationId: "rec2",
        findingId: "seo.title_too_short" as FindingId,
        type: "seo.update-title" as const,
        title: "Update Title",
        description: "Title too long",
        priority: "medium" as const,
        risk: "high" as const,
        automatable: false,
        requiresApproval: true,
        rollbackSupported: true,
        estimatedDuration: "5 minutes",
        requiredProvider: "website-reader",
        payload: {},
        status: "pending" as const,
      };

      queue.add(action1);
      queue.add(action2);
      expect(queue.listPending()).toHaveLength(2);

      queue.approve("action1");
      expect(queue.listPending()).toHaveLength(1);
    });
  });
});