// @forge/optimization-orchestrator
// Optimization Orchestrator — central coordination layer

import type {
  Engine,
  EngineType,
  IEngineRegistry,
  IStateMachine,
  IEventBus,
  IMetricsCollector,
  OptimizationResult,
  OptimizationMetrics,
  WorkflowDefinition,
} from "./types.js";
import type { OptimizationContext } from "./context.js";
import { OptimizationState } from "./state-machine.js";
import { OptimizationEvent, EVENT_TO_STATE } from "./events.js";
import { StateMachine } from "./state-machine.js";
import { EventBus } from "./events.js";
import { MetricsCollector } from "./metrics.js";
import { EngineRegistry } from "./registry.js";
import { LifecycleManager } from "./lifecycle.js";
import { getWorkflow, registerWorkflow } from "./workflow.js";
import { createContext } from "./context.js";
import { WorkflowError, ExecutionCancelledError } from "./errors.js";

export interface OrchestratorOptions {
  workflowId?: string;
  project?: string;
  provider?: string;
  model?: string;
  preview?: boolean;
  review?: boolean;
  apply?: boolean;
  dryRun?: boolean;
  configuration?: Record<string, unknown>;
}

export class OptimizationOrchestrator {
  private registry: IEngineRegistry;
  private stateMachine: IStateMachine;
  private eventBus: IEventBus;
  private metrics: IMetricsCollector;
  private lifecycle: LifecycleManager;
  private context!: OptimizationContext;
  private options: Required<OrchestratorOptions>;
  private events: OptimizationEvent[] = [];

  constructor(options: OrchestratorOptions = {}) {
    this.registry = new EngineRegistry();
    this.stateMachine = new StateMachine();
    this.eventBus = new EventBus();
    this.lifecycle = new LifecycleManager();
    this.options = {
      workflowId: options.workflowId ?? "homepage-optimization",
      project: options.project ?? "default",
      provider: options.provider ?? "",
      model: options.model ?? "",
      preview: options.preview ?? false,
      review: options.review ?? true,
      apply: options.apply ?? false,
      dryRun: options.dryRun ?? true,
      configuration: options.configuration ?? {},
    };
    this.metrics = new MetricsCollector(this.options.workflowId, this.options.project);
  }

  // ─── Engine Registration ──────────────────────────────────

  registerEngine(type: EngineType, engine: Engine): void {
    this.registry.register(type, engine);
  }

  getRegistry(): IEngineRegistry {
    return this.registry;
  }

  getEventBus(): IEventBus {
    return this.eventBus;
  }

  getLifecycle(): LifecycleManager {
    return this.lifecycle;
  }

  // ─── Workflow ─────────────────────────────────────────────

  registerWorkflow(definition: WorkflowDefinition): void {
    registerWorkflow(definition);
  }

  // ─── Execution ────────────────────────────────────────────

  async run(): Promise<OptimizationResult> {
    const workflow = getWorkflow(this.options.workflowId);
    this.context = createContext(
      crypto.randomUUID(),
      this.options.project,
      workflow,
      this.options.configuration,
    );

    try {
      // Created → Prepared
      await this.transition(OptimizationState.Prepared, OptimizationEvent.WorkflowPrepared);

      // Execute each step in the workflow
      for (const step of workflow.steps) {
        // Check for cancellation
        if (this.stateMachine.getCurrentState() === OptimizationState.Cancelled) {
          throw new ExecutionCancelledError(this.context.id, "Workflow was cancelled");
        }

        // Transition to the step's phase
        const stepEvent = Object.entries(EVENT_TO_STATE).find(([, s]) => s === step.phase)?.[0] as OptimizationEvent | undefined;
        if (stepEvent) {
          await this.transition(step.phase, stepEvent);
        }

        // Execute the engine
        const engine = this.registry.resolve<Engine>(step.engine);
        const stepStart = Date.now();
        try {
          const result = await engine.execute(this.context);
          this.context = result as unknown as OptimizationContext;
        } catch (err) {
          if (step.optional) {
            continue; // Skip optional steps on failure
          }
          throw err;
        }
        const stepDuration = Date.now() - stepStart;
        this.metrics.recordStepDuration(step.id, stepDuration);
      }

      // Final state: Completed
      await this.transition(OptimizationState.Completed, OptimizationEvent.ExecutionCompleted);
      this.metrics.recordExecutionSuccess(true);
    } catch (err) {
      if (err instanceof ExecutionCancelledError) {
        await this.transition(OptimizationState.Cancelled, OptimizationEvent.WorkflowCancelled);
      } else {
        await this.transition(OptimizationState.Failed, OptimizationEvent.ExecutionFailed);
      }
      this.metrics.recordExecutionSuccess(false);

      return this.buildResult(err instanceof WorkflowError ? err : undefined);
    }

    return this.buildResult();
  }

  async cancel(reason: string): Promise<void> {
    if (!this.stateMachine.isTerminal()) {
      this.context.metadata.currentState = OptimizationState.Cancelled;
      this.eventBus.emit(OptimizationEvent.WorkflowCancelled, this.context);
      throw new ExecutionCancelledError(this.context.id, reason);
    }
  }

  getMetrics(): OptimizationMetrics {
    return this.metrics.getMetrics();
  }

  getContext(): OptimizationContext {
    return this.context;
  }

  // ─── Private ──────────────────────────────────────────────

  private async transition(
    to: OptimizationState,
    event: OptimizationEvent,
  ): Promise<void> {
    this.stateMachine.transition(to);
    this.context.metadata.currentState = to;
    this.context.metadata.stateTransitions = this.stateMachine.getTransitionCount();
    this.eventBus.emit(event, this.context);
    await this.lifecycle.runHooks(to, this.context);
    this.events.push(event);
  }

  private buildResult(error?: WorkflowError): OptimizationResult {
    return {
      contextId: this.context.id,
      project: this.context.project,
      workflow: this.context.workflow.id,
      state: this.stateMachine.getCurrentState(),
      metrics: this.metrics.getMetrics(),
      events: [],
      error: error
        ? {
            code: error.code,
            message: error.message,
            contextId: error.contextId,
          }
        : undefined,
    };
  }
}