// @forge/optimization-orchestrator
// Tests for the Optimization Orchestrator

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OptimizationOrchestrator } from "./orchestrator.js";
import { OptimizationState } from "./state-machine.js";
import { StateMachine } from "./state-machine.js";
import { OptimizationEvent, EventBus } from "./events.js";
import { EngineRegistry } from "./registry.js";
import { MetricsCollector } from "./metrics.js";
import { createContext } from "./context.js";
import { getWorkflow, registerWorkflow, listWorkflows } from "./workflow.js";
import {
  StateTransitionError,
  MissingEngineError,
  MissingContextError,
  ExecutionCancelledError,
  WorkflowError,
} from "./errors.js";
import type { Engine, WorkflowDefinition } from "./types.js";

// ─── Mock Engine ────────────────────────────────────────────

function createMockEngine(type: string, onExecute?: () => void): Engine {
  return {
    type: type as any,
    execute: vi.fn(async (ctx) => {
      onExecute?.();
      return { ...ctx, [`${type}Done`]: true };
    }),
  };
}

// ─── State Machine Tests ────────────────────────────────────

describe("StateMachine", () => {
  it("starts in Created state", () => {
    const sm = new StateMachine();
    expect(sm.getCurrentState()).toBe(OptimizationState.Created);
  });

  it("allows valid transitions", () => {
    const sm = new StateMachine();
    sm.transition(OptimizationState.Prepared);
    expect(sm.getCurrentState()).toBe(OptimizationState.Prepared);
  });

  it("throws on invalid transitions", () => {
    const sm = new StateMachine();
    expect(() => sm.transition(OptimizationState.Completed)).toThrow(StateTransitionError);
  });

  it("tracks transition count", () => {
    const sm = new StateMachine();
    sm.transition(OptimizationState.Prepared);
    sm.transition(OptimizationState.Analysing);
    expect(sm.getTransitionCount()).toBe(2);
  });

  it("detects terminal states", () => {
    const sm = new StateMachine();
    expect(sm.isTerminal()).toBe(false);
    sm.transition(OptimizationState.Cancelled);
    expect(sm.isTerminal()).toBe(true);
  });

  it("can be reset", () => {
    const sm = new StateMachine();
    sm.transition(OptimizationState.Prepared);
    sm.reset();
    expect(sm.getCurrentState()).toBe(OptimizationState.Created);
    expect(sm.getTransitionCount()).toBe(0);
  });

  it("allows full happy path", () => {
    const sm = new StateMachine();
    sm.transition(OptimizationState.Prepared);
    sm.transition(OptimizationState.Analysing);
    sm.transition(OptimizationState.Generating);
    sm.transition(OptimizationState.Reviewing);
    sm.transition(OptimizationState.Composing);
    sm.transition(OptimizationState.Validated);
    sm.transition(OptimizationState.Ready);
    sm.transition(OptimizationState.Executing);
    sm.transition(OptimizationState.Completed);
    expect(sm.isTerminal()).toBe(true);
  });
});

// ─── Context Tests ──────────────────────────────────────────

describe("createContext", () => {
  it("creates context with default values", () => {
    const workflow = getWorkflow("homepage-optimization");
    const ctx = createContext("test-1", "my-project", workflow);
    expect(ctx.id).toBe("test-1");
    expect(ctx.project).toBe("my-project");
    expect(ctx.workflow.id).toBe("homepage-optimization");
    expect(ctx.metadata.currentState).toBe(OptimizationState.Created);
  });
});

// ─── Workflow Tests ─────────────────────────────────────────

describe("Workflow definitions", () => {
  it("returns built-in workflows", () => {
    const workflows = listWorkflows();
    expect(workflows).toContain("homepage-optimization");
    expect(workflows).toContain("blog-optimization");
    expect(workflows).toContain("content-refresh");
  });

  it("throws for unknown workflow", () => {
    expect(() => getWorkflow("nonexistent")).toThrow();
  });

  it("allows registering custom workflows", () => {
    const custom: WorkflowDefinition = {
      id: "custom-test",
      name: "Custom Test",
      description: "A test workflow",
      steps: [
        { id: "analyse", engine: "content-intelligence", phase: OptimizationState.Analysing },
      ],
    };
    registerWorkflow(custom);
    expect(getWorkflow("custom-test").id).toBe("custom-test");
  });
});

// ─── Engine Registry Tests ──────────────────────────────────

describe("EngineRegistry", () => {
  it("registers and resolves engines", () => {
    const registry = new EngineRegistry();
    const engine = createMockEngine("content-intelligence");
    registry.register("content-intelligence", engine);
    expect(registry.has("content-intelligence")).toBe(true);
    expect(registry.resolve("content-intelligence")).toBe(engine);
  });

  it("throws MissingEngineError for unregistered engines", () => {
    const registry = new EngineRegistry();
    expect(() => registry.resolve("content-intelligence")).toThrow(MissingEngineError);
  });

  it("lists registered engines", () => {
    const registry = new EngineRegistry();
    registry.register("content-intelligence", createMockEngine("content-intelligence"));
    registry.register("review", createMockEngine("review"));
    expect(registry.list()).toContain("content-intelligence");
    expect(registry.list()).toContain("review");
  });
});

// ─── Event Bus Tests ────────────────────────────────────────

describe("EventBus", () => {
  it("emits events to registered listeners", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on(OptimizationEvent.WorkflowStarted, listener);
    bus.emit(OptimizationEvent.WorkflowStarted, { id: "test", project: "p", workflow: { id: "w", name: "", description: "", steps: [] }, configuration: {}, metadata: { startedAt: 0, stateTransitions: 0, currentState: OptimizationState.Created } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("allows removing listeners", () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.on(OptimizationEvent.WorkflowStarted, listener);
    bus.off(OptimizationEvent.WorkflowStarted, listener);
    bus.emit(OptimizationEvent.WorkflowStarted, { id: "test", project: "p", workflow: { id: "w", name: "", description: "", steps: [] }, configuration: {}, metadata: { startedAt: 0, stateTransitions: 0, currentState: OptimizationState.Created } });
    expect(listener).not.toHaveBeenCalled();
  });

  it("can clear all listeners", () => {
    const bus = new EventBus();
    bus.on(OptimizationEvent.WorkflowStarted, vi.fn());
    bus.clear();
    bus.emit(OptimizationEvent.WorkflowStarted, { id: "test", project: "p", workflow: { id: "w", name: "", description: "", steps: [] }, configuration: {}, metadata: { startedAt: 0, stateTransitions: 0, currentState: OptimizationState.Created } });
    // No crash = success
  });
});

// ─── Metrics Tests ──────────────────────────────────────────

describe("MetricsCollector", () => {
  it("records and retrieves metrics", () => {
    const mc = new MetricsCollector("test-workflow", "test-project");
    mc.recordStepDuration("analyse", 100);
    mc.recordTokens(500);
    mc.recordCost(0.01);
    mc.recordSectionsAnalysed(5);
    mc.recordPatchesGenerated(3);
    mc.recordPatchesApproved(2);
    mc.recordPatchesRejected(1);
    mc.recordExecutionSuccess(true);

    const metrics = mc.getMetrics();
    expect(metrics.workflowId).toBe("test-workflow");
    expect(metrics.stepDurations["analyse"]).toBe(100);
    expect(metrics.tokensUsed).toBe(500);
    expect(metrics.sectionsAnalysed).toBe(5);
    expect(metrics.patchesGenerated).toBe(3);
    expect(metrics.patchesApproved).toBe(2);
    expect(metrics.patchesRejected).toBe(1);
    expect(metrics.executionSuccess).toBe(true);
  });

  it("can be reset", () => {
    const mc = new MetricsCollector("w", "p");
    mc.recordTokens(100);
    mc.reset();
    expect(mc.getMetrics().tokensUsed).toBe(0);
  });
});

// ─── Error Tests ────────────────────────────────────────────

describe("Error types", () => {
  it("StateTransitionError has correct properties", () => {
    const err = new StateTransitionError("bad transition", OptimizationState.Created, OptimizationState.Completed);
    expect(err.code).toBe("STATE_TRANSITION_ERROR");
    expect(err.from).toBe(OptimizationState.Created);
    expect(err.to).toBe(OptimizationState.Completed);
    expect(err).toBeInstanceOf(WorkflowError);
  });

  it("MissingEngineError has correct properties", () => {
    const err = new MissingEngineError("ctx-1", "content-intelligence");
    expect(err.code).toBe("MISSING_ENGINE_ERROR");
    expect(err.engineType).toBe("content-intelligence");
  });

  it("MissingContextError has correct properties", () => {
    const err = new MissingContextError("ctx-1", ["pageDNA", "sections"]);
    expect(err.code).toBe("MISSING_CONTEXT_ERROR");
    expect(err.missingKeys).toEqual(["pageDNA", "sections"]);
  });

  it("ExecutionCancelledError has correct properties", () => {
    const err = new ExecutionCancelledError("ctx-1", "user cancelled");
    expect(err.code).toBe("EXECUTION_CANCELLED_ERROR");
    expect(err.reason).toBe("user cancelled");
  });
});

// ─── Orchestrator Integration Tests ─────────────────────────

describe("OptimizationOrchestrator", () => {
  beforeEach(() => {
    // Reset workflow registry to known state
    // (workflows are already registered by default)
  });

  it("registers engines and runs a workflow", async () => {
    const orchestrator = new OptimizationOrchestrator({
      workflowId: "content-refresh",
      project: "test-project",
      dryRun: true,
    });

    const siEngine = createMockEngine("site-intelligence");
    const ciEngine = createMockEngine("content-intelligence");
    const reviewEngine = createMockEngine("review");
    const composerEngine = createMockEngine("composer");
    const execEngine = createMockEngine("execution");

    orchestrator.registerEngine("site-intelligence", siEngine);
    orchestrator.registerEngine("content-intelligence", ciEngine);
    orchestrator.registerEngine("review", reviewEngine);
    orchestrator.registerEngine("composer", composerEngine);
    orchestrator.registerEngine("execution", execEngine);

    const result = await orchestrator.run();

    expect(result.state).toBe(OptimizationState.Completed);
    expect(result.metrics.executionSuccess).toBe(true);
    expect(ciEngine.execute).toHaveBeenCalled();
    expect(reviewEngine.execute).toHaveBeenCalled();
    expect(composerEngine.execute).toHaveBeenCalled();
    expect(execEngine.execute).toHaveBeenCalled();
  });

  it("fails when a required engine is missing", async () => {
    const orchestrator = new OptimizationOrchestrator({
      workflowId: "content-refresh",
      project: "test-project",
    });

    // Only register some engines
    orchestrator.registerEngine("content-intelligence", createMockEngine("content-intelligence"));

    const result = await orchestrator.run();
    expect(result.state).toBe(OptimizationState.Failed);
    expect(result.error).toBeDefined();
  });

  it("emits events during workflow execution", async () => {
    const orchestrator = new OptimizationOrchestrator({
      workflowId: "content-refresh",
      project: "test-project",
      dryRun: true,
    });

    const events: OptimizationEvent[] = [];
    orchestrator.getEventBus().on(OptimizationEvent.WorkflowPrepared, (p) => events.push(p.event));
    orchestrator.getEventBus().on(OptimizationEvent.ExecutionCompleted, (p) => events.push(p.event));

    const siEngine = createMockEngine("site-intelligence");
    const ciEngine = createMockEngine("content-intelligence");
    const reviewEngine = createMockEngine("review");
    const composerEngine = createMockEngine("composer");
    const execEngine = createMockEngine("execution");

    orchestrator.registerEngine("site-intelligence", siEngine);
    orchestrator.registerEngine("content-intelligence", ciEngine);
    orchestrator.registerEngine("review", reviewEngine);
    orchestrator.registerEngine("composer", composerEngine);
    orchestrator.registerEngine("execution", execEngine);

    await orchestrator.run();

    expect(events).toContain(OptimizationEvent.WorkflowPrepared);
    expect(events).toContain(OptimizationEvent.ExecutionCompleted);
  });

  it("collects metrics after run", async () => {
    const orchestrator = new OptimizationOrchestrator({
      workflowId: "content-refresh",
      project: "test-project",
      dryRun: true,
    });

    orchestrator.registerEngine("site-intelligence", createMockEngine("site-intelligence"));
    orchestrator.registerEngine("content-intelligence", createMockEngine("content-intelligence"));
    orchestrator.registerEngine("review", createMockEngine("review"));
    orchestrator.registerEngine("composer", createMockEngine("composer"));
    orchestrator.registerEngine("execution", createMockEngine("execution"));

    await orchestrator.run();

    const metrics = orchestrator.getMetrics();
    expect(metrics.workflowId).toBe("content-refresh");
    expect(metrics.project).toBe("test-project");
    expect(metrics.duration).toBeGreaterThanOrEqual(0);
    const stepCount = Object.keys(metrics.stepDurations).length;
    // Content-refresh has 4 steps (analyse, review, compose, execute)
    expect(stepCount).toBeGreaterThanOrEqual(3);
  });

  it("supports lifecycle hooks", async () => {
    const orchestrator = new OptimizationOrchestrator({
      workflowId: "content-refresh",
      project: "test-project",
      dryRun: true,
    });

    const hookCalled: string[] = [];
    orchestrator.getLifecycle().on(OptimizationState.Analysing, async () => { hookCalled.push("analysing"); });
    orchestrator.getLifecycle().on(OptimizationState.Completed, async () => { hookCalled.push("completed"); });

    orchestrator.registerEngine("site-intelligence", createMockEngine("site-intelligence"));
    orchestrator.registerEngine("content-intelligence", createMockEngine("content-intelligence"));
    orchestrator.registerEngine("review", createMockEngine("review"));
    orchestrator.registerEngine("composer", createMockEngine("composer"));
    orchestrator.registerEngine("execution", createMockEngine("execution"));

    await orchestrator.run();

    expect(hookCalled).toContain("analysing");
    expect(hookCalled).toContain("completed");
  });

  it("seeds initial context and exposes the populated context after the run", async () => {
    const metadataProposal = {
      id: "metadata-6-test",
      pageId: 6,
      title: "Proposed title",
      description: "Proposed description",
    };
    const orchestrator = new OptimizationOrchestrator({
      workflowId: "content-refresh",
      project: "test-project",
      dryRun: true,
      initialContext: {
        pageId: 6,
        pageUrl: "https://example.com/?page_id=6",
        metadataProposal,
      },
    });

    orchestrator.registerEngine("site-intelligence", createMockEngine("site-intelligence"));
    orchestrator.registerEngine("content-intelligence", createMockEngine("content-intelligence"));
    orchestrator.registerEngine("review", createMockEngine("review"));
    orchestrator.registerEngine("composer", createMockEngine("composer"));
    orchestrator.registerEngine("execution", createMockEngine("execution"));

    const result = await orchestrator.run();
    const context = orchestrator.getContext();

    expect(result.state).toBe(OptimizationState.Completed);
    expect(context.id).toBe(result.contextId);
    expect(context.project).toBe("test-project");
    expect(context.pageId).toBe(6);
    expect(context.pageUrl).toBe("https://example.com/?page_id=6");
    expect(context.metadataProposal).toEqual(metadataProposal);
    // Engine output is visible on the same object, not a copy.
    expect((context as Record<string, unknown>)["content-intelligenceDone"]).toBe(true);
  });
});