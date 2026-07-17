// @forge/preflight-validator/validator.test
// Tests for preflight validator.

import { describe, it, expect } from "vitest";
import { validateExecutionPlan, createDefaultContext, type ValidationContext } from "./validator.js";
import type { Action, ExecutionPlan } from "@forge/action-engine";

function createMockAction(overrides: Partial<Action> = {}): Action {
  return {
    id: "action-1",
    recommendationId: "rec-1",
    findingId: "finding-1" as any,
    type: "seo.add-title",
    title: "Add missing title",
    description: "Add a title tag to the page",
    priority: "high" as any,
    risk: "moderate" as any,
    automatable: true,
    requiresApproval: false,
    rollbackSupported: true,
    estimatedDuration: "30s",
    requiredProvider: "wordpress",
    payload: { pageId: 1, newTitle: "Test Page Title" },
    status: "pending" as any,
    ...overrides,
  };
}

function createMockPlan(actions: Action[] = [createMockAction()]): ExecutionPlan {
  return {
    url: "https://example.com",
    generatedAt: new Date().toISOString(),
    actions,
    approvalQueue: [],
    summary: {
      total: actions.length,
      automatable: actions.filter((a) => a.automatable).length,
      requiresApproval: actions.filter((a) => a.requiresApproval).length,
      byRisk: {
        safe: actions.filter((a) => a.risk === "safe").length,
        moderate: actions.filter((a) => a.risk === "moderate").length,
        high: actions.filter((a) => a.risk === "high").length,
        critical: actions.filter((a) => a.risk === "critical").length,
      },
    },
    estimatedDuration: "5m",
    riskSummary: {
      safe: actions.filter((a) => a.risk === "safe").length,
      moderate: actions.filter((a) => a.risk === "moderate").length,
      high: actions.filter((a) => a.risk === "high").length,
      critical: actions.filter((a) => a.risk === "critical").length,
    },
  };
}

describe("Preflight Validator", () => {
  describe("validateExecutionPlan", () => {
    it("should approve a valid title action", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "seo.add-title",
          payload: { pageId: 1, newTitle: "New Title" },
        }),
      ]);

      const context = createDefaultContext();
      const report = validateExecutionPlan(plan, null, context);

      expect(report.approvedActions).toHaveLength(1);
      expect(report.blockedActions).toHaveLength(0);
      expect(report.warningActions).toHaveLength(0);
    });

    it("should block a title action when page does not exist", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "seo.add-title",
          payload: { pageId: 999, newTitle: "New Title" },
        }),
      ]);

      const context: ValidationContext = {
        ...createDefaultContext(),
        pageExists: () => false,
      };
      const report = validateExecutionPlan(plan, null, context);

      expect(report.blockedActions).toHaveLength(1);
      expect(report.blockedActions[0]?.reason).toContain("does not exist");
    });

    it("should block a title action when title already matches", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "seo.update-title",
          payload: { pageId: 1, newTitle: "Existing Title" },
        }),
      ]);

      const context: ValidationContext = {
        ...createDefaultContext(),
        getCurrentTitle: () => "Existing Title",
      };
      const report = validateExecutionPlan(plan, null, context);

      expect(report.blockedActions).toHaveLength(1);
      expect(report.blockedActions[0]?.reason).toContain("already matches");
    });

    it("should approve a meta description action", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "seo.add-meta-description",
          payload: { pageId: 1, newDescription: "A great description" },
        }),
      ]);

      const report = validateExecutionPlan(plan, null, createDefaultContext());
      expect(report.approvedActions).toHaveLength(1);
    });

    it("should warn when meta description already exists", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "seo.update-meta-description",
          payload: { pageId: 1, newDescription: "Updated description" },
        }),
      ]);

      const context: ValidationContext = {
        ...createDefaultContext(),
        pageHasMetaDescription: () => true,
      };
      const report = validateExecutionPlan(plan, null, context);

      expect(report.warningActions).toHaveLength(1);
    });

    it("should approve an alt text action", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "accessibility.add-alt",
          payload: { mediaId: 1, newAlt: "Descriptive alt text" },
        }),
      ]);

      const report = validateExecutionPlan(plan, null, createDefaultContext());
      expect(report.approvedActions).toHaveLength(1);
    });

    it("should block alt text action when image does not exist", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "accessibility.add-alt",
          payload: { mediaId: 999, newAlt: "Alt text" },
        }),
      ]);

      const context: ValidationContext = {
        ...createDefaultContext(),
        imageExists: () => false,
      };
      const report = validateExecutionPlan(plan, null, context);

      expect(report.blockedActions).toHaveLength(1);
    });

    it("should warn for canonical actions (due to redirect check)", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "seo.add-canonical",
          payload: { pageId: 1, newCanonical: "https://example.com/page" },
        }),
      ]);

      const report = validateExecutionPlan(plan, null, createDefaultContext());
      expect(report.warningActions).toHaveLength(1);
    });

    it("should block canonical action with invalid URL", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "seo.add-canonical",
          payload: { pageId: 1, newCanonical: "not-a-url" },
        }),
      ]);

      const report = validateExecutionPlan(plan, null, createDefaultContext());
      expect(report.blockedActions).toHaveLength(1);
    });

    it("should approve a schema action", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "technical.add-jsonld",
          payload: {
            pageId: 1,
            schema: { "@context": "https://schema.org", "@type": "WebPage" },
          },
        }),
      ]);

      const report = validateExecutionPlan(plan, null, createDefaultContext());
      expect(report.approvedActions).toHaveLength(1);
    });

    it("should block schema action with missing @context", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "technical.add-jsonld",
          payload: {
            pageId: 1,
            schema: { name: "Test" },
          },
        }),
      ]);

      const report = validateExecutionPlan(plan, null, createDefaultContext());
      expect(report.blockedActions).toHaveLength(1);
    });

    it("should warn for unknown action types", () => {
      const plan = createMockPlan([
        createMockAction({
          id: "action-1",
          type: "content.update-content" as any,
          payload: { pageId: 1, content: "New content" },
        }),
      ]);

      const report = validateExecutionPlan(plan, null, createDefaultContext());
      expect(report.warningActions).toHaveLength(1);
    });

    it("should calculate risk summary correctly", () => {
      const plan = createMockPlan([
        createMockAction({ id: "a1", type: "seo.add-title", risk: "safe" as any }),
        createMockAction({ id: "a2", type: "seo.update-title", risk: "high" as any }),
      ]);

      const report = validateExecutionPlan(plan, null, createDefaultContext());
      expect(report.riskSummary.safe).toBe(1);
      expect(report.riskSummary.high).toBe(1);
    });
  });
});