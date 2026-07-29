// @forge/optimization-orchestrator
// Deterministic event system

import type { OptimizationContext } from "./context.js";
import type { OptimizationEventPayload, EventListener, IEventBus } from "./types.js";
import { OptimizationState } from "./state-machine.js";

export enum OptimizationEvent {
  WorkflowStarted = "WorkflowStarted",
  WorkflowPrepared = "WorkflowPrepared",
  AnalysisCompleted = "AnalysisCompleted",
  GenerationCompleted = "GenerationCompleted",
  ReviewCompleted = "ReviewCompleted",
  CompositionCompleted = "CompositionCompleted",
  ValidationCompleted = "ValidationCompleted",
  ExecutionStarted = "ExecutionStarted",
  ExecutionCompleted = "ExecutionCompleted",
  ExecutionFailed = "ExecutionFailed",
  WorkflowCancelled = "WorkflowCancelled",
  WorkflowFinished = "WorkflowFinished",
}

// Map event to the state it represents
export const EVENT_TO_STATE: Record<OptimizationEvent, OptimizationState> = {
  [OptimizationEvent.WorkflowStarted]: OptimizationState.Created,
  [OptimizationEvent.WorkflowPrepared]: OptimizationState.Prepared,
  [OptimizationEvent.AnalysisCompleted]: OptimizationState.Analysing,
  [OptimizationEvent.GenerationCompleted]: OptimizationState.Generating,
  [OptimizationEvent.ReviewCompleted]: OptimizationState.Reviewing,
  [OptimizationEvent.CompositionCompleted]: OptimizationState.Composing,
  [OptimizationEvent.ValidationCompleted]: OptimizationState.Validated,
  [OptimizationEvent.ExecutionStarted]: OptimizationState.Executing,
  [OptimizationEvent.ExecutionCompleted]: OptimizationState.Completed,
  [OptimizationEvent.ExecutionFailed]: OptimizationState.Failed,
  [OptimizationEvent.WorkflowCancelled]: OptimizationState.Cancelled,
  [OptimizationEvent.WorkflowFinished]: OptimizationState.Completed,
};

export class EventBus implements IEventBus {
  private listeners: Map<OptimizationEvent, Set<EventListener>> = new Map();

  emit(event: OptimizationEvent, context: OptimizationContext): void {
    const payload: OptimizationEventPayload = {
      event,
      contextId: context.id,
      project: context.project,
      workflow: context.workflow.id,
      state: context.metadata.currentState,
      timestamp: Date.now(),
    };

    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch {
          // Swallow listener errors — don't let a bad listener break the orchestrator
        }
      }
    }
  }

  on(event: OptimizationEvent, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: OptimizationEvent, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  clear(): void {
    this.listeners.clear();
  }
}