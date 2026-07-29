// @forge/optimization-orchestrator
// Deterministic state machine for optimization lifecycle

import { StateTransitionError } from "./errors.js";

export enum OptimizationState {
  Created = "Created",
  Prepared = "Prepared",
  Analysing = "Analysing",
  Generating = "Generating",
  Reviewing = "Reviewing",
  Composing = "Composing",
  Validated = "Validated",
  Ready = "Ready",
  Executing = "Executing",
  Completed = "Completed",
  Cancelled = "Cancelled",
  Failed = "Failed",
  RolledBack = "RolledBack",
}

// Order of states — used to allow forward progression
const STATE_ORDER: OptimizationState[] = [
  OptimizationState.Created,
  OptimizationState.Prepared,
  OptimizationState.Analysing,
  OptimizationState.Generating,
  OptimizationState.Reviewing,
  OptimizationState.Composing,
  OptimizationState.Validated,
  OptimizationState.Ready,
  OptimizationState.Executing,
  OptimizationState.Completed,
  OptimizationState.Cancelled,
  OptimizationState.Failed,
  OptimizationState.RolledBack,
];

// All terminal states (no outgoing transitions)
const TERMINAL_STATES = new Set([
  OptimizationState.Completed,
  OptimizationState.Cancelled,
  OptimizationState.Failed,
  OptimizationState.RolledBack,
]);

/**
 * Valid transitions.
 * Rules:
 * 1. Terminal states cannot exit.
 * 2. Forward jumps to any later non-terminal state are allowed.
 * 3. Cancelled, Failed, and RolledBack are reachable from any non-terminal state.
 */
function getAllowedTransitions(from: OptimizationState): Set<OptimizationState> {
  if (TERMINAL_STATES.has(from)) return new Set();

  const fromIndex = STATE_ORDER.indexOf(from);
  const allowed = new Set<OptimizationState>([OptimizationState.Cancelled, OptimizationState.Failed]);

  // Every later state in the normal progression is reachable
  for (let i = fromIndex + 1; i < STATE_ORDER.length; i++) {
    const state = STATE_ORDER[i]!;
    if (!TERMINAL_STATES.has(state)) {
      allowed.add(state);
    }
  }

  // Completed is reachable from Executing
  if (from === OptimizationState.Executing) {
    allowed.add(OptimizationState.Completed);
  }

  // RolledBack is only reachable from Executing
  if (from === OptimizationState.Executing) {
    allowed.add(OptimizationState.RolledBack);
  }

  return allowed;
}

export class StateMachine {
  private currentState: OptimizationState;
  private transitionCount: number;

  constructor(initialState: OptimizationState = OptimizationState.Created) {
    this.currentState = initialState;
    this.transitionCount = 0;
  }

  getCurrentState(): OptimizationState {
    return this.currentState;
  }

  getTransitionCount(): number {
    return this.transitionCount;
  }

  canTransition(to: OptimizationState): boolean {
    const allowed = getAllowedTransitions(this.currentState);
    return allowed.has(to);
  }

  transition(to: OptimizationState): void {
    if (!this.canTransition(to)) {
      throw new StateTransitionError(
        `Invalid state transition: ${this.currentState} → ${to}`,
        this.currentState,
        to,
      );
    }
    this.currentState = to;
    this.transitionCount++;
  }

  isTerminal(): boolean {
    return (
      this.currentState === OptimizationState.Completed ||
      this.currentState === OptimizationState.Cancelled ||
      this.currentState === OptimizationState.Failed ||
      this.currentState === OptimizationState.RolledBack
    );
  }

  reset(): void {
    this.currentState = OptimizationState.Created;
    this.transitionCount = 0;
  }
}