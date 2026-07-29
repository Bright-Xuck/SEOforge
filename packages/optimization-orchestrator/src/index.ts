// @forge/optimization-orchestrator
// Public API

export { OptimizationOrchestrator } from "./orchestrator.js";
export type { OrchestratorOptions } from "./orchestrator.js";

export { OptimizationState } from "./state-machine.js";
export { StateMachine } from "./state-machine.js";

export { OptimizationEvent, EventBus, EVENT_TO_STATE } from "./events.js";

export { MetricsCollector } from "./metrics.js";

export { EngineRegistry } from "./registry.js";

export { LifecycleManager } from "./lifecycle.js";
export type { LifecycleHook } from "./lifecycle.js";

export { createContext, validateContext } from "./context.js";
export type { OptimizationContext } from "./context.js";

export { getWorkflow, registerWorkflow, listWorkflows, WORKFLOWS } from "./workflow.js";

export {
  WorkflowError,
  StateTransitionError,
  MissingContextError,
  MissingEngineError,
  ExecutionCancelledError,
  ValidationFailedError,
} from "./errors.js";

export type {
  EngineType,
  Engine,
  WorkflowDefinition,
  WorkflowStep,
  RuntimeMetadata,
  OptimizationResult,
  OptimizationError,
  OptimizationMetrics,
  OptimizationEventPayload,
  EventListener,
  IEngineRegistry,
  IStateMachine,
  IEventBus,
  IMetricsCollector,
} from "./types.js";