// @forge/optimization-orchestrator
// Typed error classes — no generic Error objects

import type { EngineType } from "./types.js";
import type { OptimizationState } from "./state-machine.js";

export class WorkflowError extends Error {
  public readonly code: string;
  public readonly contextId: string;

  constructor(code: string, message: string, contextId: string) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
    this.contextId = contextId;
  }
}

export class StateTransitionError extends WorkflowError {
  public readonly from: OptimizationState;
  public readonly to: OptimizationState;

  constructor(message: string, from: OptimizationState, to: OptimizationState) {
    super("STATE_TRANSITION_ERROR", message, "unknown");
    this.name = "StateTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class MissingContextError extends WorkflowError {
  public readonly missingKeys: string[];

  constructor(contextId: string, missingKeys: string[]) {
    super(
      "MISSING_CONTEXT_ERROR",
      `Missing required context keys: ${missingKeys.join(", ")}`,
      contextId,
    );
    this.name = "MissingContextError";
    this.missingKeys = missingKeys;
  }
}

export class MissingEngineError extends WorkflowError {
  public readonly engineType: EngineType;

  constructor(contextId: string, engineType: EngineType) {
    super(
      "MISSING_ENGINE_ERROR",
      `Engine not registered: ${engineType}`,
      contextId,
    );
    this.name = "MissingEngineError";
    this.engineType = engineType;
  }
}

export class ExecutionCancelledError extends WorkflowError {
  public readonly reason: string;

  constructor(contextId: string, reason: string) {
    super("EXECUTION_CANCELLED_ERROR", `Execution cancelled: ${reason}`, contextId);
    this.name = "ExecutionCancelledError";
    this.reason = reason;
  }
}

export class ValidationFailedError extends WorkflowError {
  public readonly validationErrors: string[];

  constructor(contextId: string, validationErrors: string[]) {
    super(
      "VALIDATION_FAILED_ERROR",
      `Validation failed: ${validationErrors.join("; ")}`,
      contextId,
    );
    this.name = "ValidationFailedError";
    this.validationErrors = validationErrors;
  }
}