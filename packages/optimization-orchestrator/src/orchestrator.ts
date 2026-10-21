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
  /**
   * Seed values for the run context (site snapshot, page DNA inputs, brand,
   * concrete provider targets). The orchestrator owns the context lifecycle;
   * callers that already read the real site must be able to hand those facts
   * in rather than have every engine re-read or re-derive them.
   */
  initialContext?: Record<string, unknown>;
}

export class OptimizationOrchestrator {
  private registry: IEngineRegistry;
  private stateMachine: IStateMachine;
  private eventBus: IEventBus;
  private metrics: IMetricsCollector;
  private lifecycle: LifecycleManager;
  private context!: OptimizationContext;
  private options: Required<Omit<OrchestratorOptions, "initialContext">>;
  private readonly initialContext?: Record<string, unknown>;
  private events: OptimizationEvent[] = [];

  constructor(options: OrchestratorOptions = {}) {
    this.registry = new EngineRegistry();
    this.stateMachine = new StateMachine();
    this.eventBus = new EventBus();
    this.lifecycle = new LifecycleManager();
    this.initialContext = options.initialContext;
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
    if (this.initialContext) {
      Object.assign(this.context, this.initialContext);
    }

    try {
      // Created → Prepared
      await this.transition(OptimizationState.Prepared, OptimizationEvent.WorkflowPrepared);

      // Execute each step in the workflow
      for (const step of workflow.steps) {
        // Check for cancellation
        if (this.stateMachine.getCurrentState() === OptimizationState.Cancelled) {
          throw new ExecutionCancelledError(this.context.id, "Workflow was cancelled");
        }

        // Transition to the step's phase. Multiple steps can share a phase
        // (e.g. site-intelligence then page analysis), so a same-state step is
        // a no-op rather than an invalid transition.
        const stepEvent = Object.entries(EVENT_TO_STATE).find(([, s]) => s === step.phase)?.[0] as OptimizationEvent | undefined;
        if (stepEvent && this.stateMachine.getCurrentState() !== step.phase) {
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
      this.syncMetricsFromContext();
      await this.transition(OptimizationState.Completed, OptimizationEvent.ExecutionCompleted);
      const execution = this.context.executionResult as
        | { failedActions?: unknown[]; errors?: unknown[] }
        | undefined;
      this.metrics.recordExecutionSuccess(
        !execution ||
          ((execution.failedActions?.length ?? 0) === 0 && (execution.errors?.length ?? 0) === 0),
      );
    } catch (err) {
      if (err instanceof ExecutionCancelledError) {
        await this.transition(OptimizationState.Cancelled, OptimizationEvent.WorkflowCancelled);
      } else {
        await this.transition(OptimizationState.Failed, OptimizationEvent.ExecutionFailed);
      }
      this.syncMetricsFromContext();
      this.metrics.recordExecutionSuccess(false);

      const failure =
        err instanceof WorkflowError
          ? err
          : new WorkflowError(
              "ENGINE_EXECUTION_ERROR",
              err instanceof Error ? err.message : String(err),
              this.context.id,
            );
      return this.buildResult(failure);
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

  /**
   * Project the concrete artifacts produced by adapters into the public
   * metrics. The orchestrator cannot know these counts itself: review owns the
   * decisions, generation owns the patches, and execution owns failures.
   */
  private syncMetricsFromContext(): void {
    const context = this.context;
    if (this.options.provider) {
      this.metrics.recordProvider(this.options.provider);
    }

    const patches = context.generatedPatches;
    if (Array.isArray(patches)) {
      this.metrics.recordPatchesGenerated(patches.length);
    }

    const sections = Array.isArray(context.documentSections)
      ? context.documentSections
      : (context.sections as { sections?: unknown[] } | undefined)?.sections;
    if (Array.isArray(sections)) {
      this.metrics.recordSectionsAnalysed(sections.filter((section) => (section as { present?: boolean }).present !== false).length);
    }

    const session = context.reviewSession as
      | { summary?: { approved?: number; edited?: number; rejected?: number } }
      | undefined;
    if (session?.summary) {
      this.metrics.recordPatchesApproved((session.summary.approved ?? 0) + (session.summary.edited ?? 0));
      this.metrics.recordPatchesRejected(session.summary.rejected ?? 0);
    }
  }

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