// @forge/execution-engine/engine.test
// Tests for execution engine.

import { describe, it, expect } from "vitest";
import { execute, executeWithValidation, getRollbackOperations } from "./engine.js";
import { RollbackStore } from "./rollback.js";
import { ExecutionHistory } from "./history.js";
import { PolicyEngine } from "./policies.js";
import type { ExecutionPlan, Action } from "@forge/action-engine";
import type { ValidationReport } from "@forge/preflight-validator";

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

function createMockValidationReport(overrides: Partial<ValidationReport> = {}): ValidationReport {
  return {
    url: "https://example.com",
    validatedAt: new Date().toISOString(),
    approvedActions: [],
    warningActions: [],
    blockedActions: [],
    warnings: [],
    errors: [],
    riskSummary: { safe: 0, moderate: 0, high: 0, critical: 0 },
    ...overrides,
  };
}

describe("Execution Engine", () => {
  describe("execute", () => {
    it("should complete all actions in dry-run mode", async () => {
      const plan = createMockPlan([
        createMockAction({ id: "a1", type: "seo.add-title" }),
        createMockAction({ id: "a2", type: "seo.add-meta-description" }),
      ]);

      const result = await execute(plan, null, { dryRun: true });

      expect(result.completedActions).toHaveLength(2);
      expect(result.failedActions).toHaveLength(0);
      expect(result.skippedActions).toHaveLength(0);
    });

    it("should generate rollback plan", async () => {
      const plan = createMockPlan([
        createMockAction({ id: "a1", type: "seo.add-title" }),
      ]);

      const result = await execute(plan, null, { dryRun: true });

      expect(result.rollbackPlan).toHaveLength(1);
      expect(result.rollbackRequired).toBe(true);
    });

    it("should skip actions when stopOnBlocked is enabled and actions are failed", async () => {
      const plan = createMockPlan([
        createMockAction({ id: "a1", type: "seo.add-title", status: "failed" as any }),
      ]);

      const result = await execute(plan, null, { dryRun: true, stopOnBlocked: true });

      expect(result.completedActions).toHaveLength(0);
      expect(result.skippedActions).toHaveLength(1);
    });

    it("should record execution time", async () => {
      const plan = createMockPlan([createMockAction()]);
      const result = await execute(plan, null, { dryRun: true });

      expect(result.executionTime).toMatch(/^\d+ms$/);
    });
  });

  describe("executeWithValidation", () => {
    it("should execute when validation passes", async () => {
      const plan = createMockPlan([createMockAction({ id: "a1" })]);
      const validationReport = createMockValidationReport({
        approvedActions: [{ actionId: "a1", status: "approved", reason: "OK", warnings: [], blockingIssues: [], confidence: 1, estimatedRisk: "safe" }],
      });

      const result = await executeWithValidation(plan, null, validationReport);

      expect(result.execution.completedActions).toHaveLength(1);
    });

    it("should skip execution when validation has blocked actions", async () => {
      const plan = createMockPlan([createMockAction({ id: "a1" })]);
      const validationReport = createMockValidationReport({
        blockedActions: [{ actionId: "a1", status: "blocked", reason: "Blocked", warnings: [], blockingIssues: ["issue"], confidence: 0, estimatedRisk: "critical" }],
      });

      const result = await executeWithValidation(plan, null, validationReport);

      expect(result.execution.completedActions).toHaveLength(0);
      expect(result.execution.skippedActions).toHaveLength(1);
    });
  });

  describe("getRollbackOperations", () => {
    it("should return rollback plan from execution result", async () => {
      const plan = createMockPlan([createMockAction({ id: "a1" })]);
      const result = await execute(plan, null, { dryRun: true });

      const operations = getRollbackOperations(result);
      expect(operations).toHaveLength(1);
      expect(operations[0]?.actionId).toBe("a1");
    });
  });
});

describe("RollbackStore", () => {
  it("should capture and retrieve rollback operations", () => {
    const store = new RollbackStore();
    const action = createMockAction({ id: "a1", type: "seo.add-title" });

    store.capture(action, { previousTitle: "Old Title" });

    const all = store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.actionId).toBe("a1");
    expect(all[0]?.originalValue).toEqual({ previousTitle: "Old Title" });
  });

  it("should clear all operations", () => {
    const store = new RollbackStore();
    store.capture(createMockAction({ id: "a1" }), {});
    store.clear();

    expect(store.getAll()).toHaveLength(0);
  });

  it("should get operation by action ID", () => {
    const store = new RollbackStore();
    store.capture(createMockAction({ id: "a1" }), { value: "test" });

    const op = store.get("a1");
    expect(op).toBeDefined();
    expect(op?.originalValue).toEqual({ value: "test" });
  });

  it("should return correct rollback method for each action type", () => {
    const store = new RollbackStore();

    store.capture(createMockAction({ id: "a1", type: "seo.update-title" }), {});
    expect(store.get("a1")?.rollbackMethod).toBe("restore_previous_meta");

    store.capture(createMockAction({ id: "a2", type: "seo.add-title" }), {});
    expect(store.get("a2")?.rollbackMethod).toBe("delete_meta");

    store.capture(createMockAction({ id: "a3", type: "accessibility.add-alt" }), {});
    expect(store.get("a3")?.rollbackMethod).toBe("clear_alt_text");

    store.capture(createMockAction({ id: "a4", type: "technical.add-jsonld" }), {});
    expect(store.get("a4")?.rollbackMethod).toBe("remove_schema_markup");
  });
});

describe("ExecutionHistory", () => {
  it("should record and retrieve entries", () => {
    const history = new ExecutionHistory();

    history.record({
      actionId: "a1",
      startedAt: new Date().toISOString(),
      status: "completed",
      providerId: "wordpress",
      duration: "30s",
      result: "success",
      rollbackAvailable: true,
    });

    expect(history.count).toBe(1);
    const all = history.getAll();
    expect(all[0]?.actionId).toBe("a1");
    expect(all[0]?.finishedAt).toBeDefined();
  });

  it("should filter by action ID", () => {
    const history = new ExecutionHistory();

    history.record({ actionId: "a1", startedAt: new Date().toISOString(), status: "completed", providerId: "wp", duration: "10s", result: "success", rollbackAvailable: true });
    history.record({ actionId: "a2", startedAt: new Date().toISOString(), status: "completed", providerId: "wp", duration: "20s", result: "success", rollbackAvailable: true });

    const entries = history.getByAction("a1");
    expect(entries).toHaveLength(1);
  });

  it("should filter by provider ID", () => {
    const history = new ExecutionHistory();

    history.record({ actionId: "a1", startedAt: new Date().toISOString(), status: "completed", providerId: "wordpress", duration: "10s", result: "success", rollbackAvailable: true });
    history.record({ actionId: "a2", startedAt: new Date().toISOString(), status: "completed", providerId: "shopify", duration: "20s", result: "success", rollbackAvailable: true });

    const entries = history.getByProvider("wordpress");
    expect(entries).toHaveLength(1);
  });

  it("should clear all entries", () => {
    const history = new ExecutionHistory();
    history.record({ actionId: "a1", startedAt: new Date().toISOString(), status: "completed", providerId: "wp", duration: "10s", result: "success", rollbackAvailable: true });
    history.clear();

    expect(history.count).toBe(0);
  });
});

describe("PolicyEngine", () => {
  it("should evaluate safe actions as auto-executable", () => {
    const engine = new PolicyEngine();
    const decision = engine.evaluate("a1", "accessibility.add-alt", "safe");

    expect(decision.canAutoExecute).toBe(true);
    expect(decision.requiresApproval).toBe(false);
    expect(decision.blocked).toBe(false);
  });

  it("should evaluate moderate actions as requiring approval", () => {
    const engine = new PolicyEngine();
    const decision = engine.evaluate("a1", "seo.add-title", "moderate");

    expect(decision.canAutoExecute).toBe(false);
    expect(decision.requiresApproval).toBe(true);
    expect(decision.blocked).toBe(false);
  });

    it("should evaluate critical actions as blocked", () => {
      const engine = new PolicyEngine();
      const decision = engine.evaluate("a1", "seo.update-slug" as any, "critical");

    expect(decision.canAutoExecute).toBe(false);
    expect(decision.blocked).toBe(true);
  });

  it("should evaluate high risk actions as requiring approval", () => {
    const engine = new PolicyEngine();
    const decision = engine.evaluate("a1", "seo.update-title", "high");

    expect(decision.requiresApproval).toBe(true);
    expect(decision.canAutoExecute).toBe(false);
  });

  it("should evaluate batch of actions", () => {
    const engine = new PolicyEngine();
    const decisions = engine.evaluateBatch([
      { id: "a1", type: "accessibility.add-alt", risk: "safe" },
      { id: "a2", type: "seo.update-title", risk: "high" },
    ]);

    expect(decisions).toHaveLength(2);
    expect(decisions[0]?.canAutoExecute).toBe(true);
    expect(decisions[1]?.canAutoExecute).toBe(false);
  });

  it("should allow custom policy overrides", () => {
    const engine = new PolicyEngine({ "accessibility.add-alt": "high" });
    const decision = engine.evaluate("a1", "accessibility.add-alt", "safe");

    expect(decision.canAutoExecute).toBe(false);
    expect(decision.requiresApproval).toBe(true);
  });

  it("should allow setting individual policies", () => {
    const engine = new PolicyEngine();
    engine.setPolicy("seo.add-title", "safe");

    const decision = engine.evaluate("a1", "seo.add-title", "moderate");
    expect(decision.canAutoExecute).toBe(true);
  });

  it("should return current policy configuration", () => {
    const engine = new PolicyEngine();
    const policies = engine.getPolicies();

    expect(policies["seo.add-title"]).toBe("moderate");
    expect(policies["accessibility.add-alt"]).toBe("safe");
  });
});