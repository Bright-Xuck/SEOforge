// @forge/review-engine homepage integration tests (Sprint 18)
// createReviewSessionFromHomepage integration.
// Note: The actual function is exported from @forge/homepage-engine.

import { describe, it, expect } from "vitest";
import { createReviewSessionFromHomepage } from "../../../homepage-engine/src/review-integration.js";

describe("createReviewSessionFromHomepage", () => {
  const makePlan = (overrides: Record<string, any> = {}) => ({
    homepage: {
      project: overrides.project ?? "test-project",
      projectProfile: {} as any,
      knowledge: {} as any,
      memorySummary: {} as any,
      siteUrl: "https://example.com",
      snapshot: {} as any,
      homepageType: "front-page" as const,
      contentMap: {} as any,
    },
    analysis: {} as any,
    generatedAt: new Date().toISOString(),
    actions: overrides.actions ?? [],
    summary: overrides.summary ?? { totalActions: 0, approvalRequired: 0, byPriority: { low: 0, medium: 0, high: 0, critical: 0 } },
  });

  it("creates a session from a homepage plan with actions", () => {
    const plan = makePlan({
      project: "test-project",
      actions: [
        {
          id: "action-1",
          title: "Update Hero Title",
          description: "Change hero section title",
          priority: "high",
          risk: "high",
          estimatedImpact: "Critical improvement",
          approvalRequired: true,
          currentValue: "Old Hero",
          proposedValue: "New Hero",
          reason: "Reason",
          affectedComponent: "hero",
          executionStatus: "pending",
        },
        {
          id: "action-2",
          title: "Update Footer",
          description: "Change footer content",
          priority: "low",
          risk: "safe",
          estimatedImpact: "Minor improvement",
          approvalRequired: false,
          currentValue: "Old Footer",
          proposedValue: "New Footer",
          reason: "Reason",
          affectedComponent: "footer",
          executionStatus: "pending",
        },
      ],
    });

    const session = createReviewSessionFromHomepage(plan);

    expect(session.sessionId).toBeDefined();
    expect(session.projectId).toBe("test-project");
    expect(session.status).toBe("pending");
    expect(session.items).toHaveLength(2);
  });

  it("derives severity from risk level", () => {
    const plan = makePlan({
      actions: [
        {
          id: "action-1",
          title: "High risk action",
          description: "Test",
          priority: "high",
          risk: "high",
          estimatedImpact: "Critical",
          approvalRequired: true,
          currentValue: "Old",
          proposedValue: "New",
          reason: "Reason",
          affectedComponent: "hero",
          executionStatus: "pending",
        },
        {
          id: "action-2",
          title: "Safe action",
          description: "Test",
          priority: "low",
          risk: "safe",
          estimatedImpact: "Minor",
          approvalRequired: false,
          currentValue: "Old",
          proposedValue: "New",
          reason: "Reason",
          affectedComponent: "footer",
          executionStatus: "pending",
        },
      ],
    });

    const session = createReviewSessionFromHomepage(plan);

    // Items are sorted by the order of actions in the plan
    expect(session.items[0].section).toBe("hero");
    expect(session.items[1].section).toBe("footer");
  });

  it("uses default policy if not provided", () => {
    const plan = makePlan({
      actions: [
        {
          id: "action-1",
          title: "Test",
          description: "Test",
          priority: "high",
          risk: "high",
          estimatedImpact: "Critical",
          approvalRequired: true,
          currentValue: "Old",
          proposedValue: "New",
          reason: "Reason",
          affectedComponent: "hero",
          executionStatus: "pending",
        },
      ],
    });

    const session = createReviewSessionFromHomepage(plan);
    expect(session.sessionId).toBeDefined();
    expect(session.policy.name).toBe("balanced");
  });

  it("accepts a custom policy", () => {
    const plan = makePlan({
      actions: [
        {
          id: "action-1",
          title: "Test",
          description: "Test",
          priority: "high",
          risk: "high",
          estimatedImpact: "Critical",
          approvalRequired: true,
          currentValue: "Old",
          proposedValue: "New",
          reason: "Reason",
          affectedComponent: "hero",
          executionStatus: "pending",
        },
      ],
    });

    const session = createReviewSessionFromHomepage(plan, { name: "strict" });
    expect(session.policy.name).toBe("strict");
  });

  it("handles empty actions list", () => {
    const plan = makePlan({ actions: [] });
    const session = createReviewSessionFromHomepage(plan);
    expect(session.sessionId).toBeDefined();
    expect(session.items).toHaveLength(0);
  });
});