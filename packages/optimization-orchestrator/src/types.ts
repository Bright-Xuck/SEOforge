// @forge/optimization-orchestrator
// Core types for the Optimization Orchestrator

import type { OptimizationState } from "./state-machine.js";
import type { OptimizationEvent } from "./events.js";

// ─── Engine Types ───────────────────────────────────────────

export type EngineType =
  | "content-intelligence"
  | "content-generation"
  | "review"
  | "composer"
  | "execution"
  | "ai-engine"
  | "knowledge"
  | "memory";

// ─── Workflow Types ─────────────────────────────────────────

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  engine: EngineType;
  phase: OptimizationState;
  config?: Record<string, unknown>;
  optional?: boolean;
}

// ─── Runtime Metadata ───────────────────────────────────────

export interface RuntimeMetadata {
  startedAt: number;
  completedAt?: number;
  duration?: number;
  stateTransitions: number;
  currentState: OptimizationState;
}

// ─── Optimization Result ────────────────────────────────────

export interface OptimizationResult {
  contextId: string;
  project: string;
  workflow: string;
  state: OptimizationState;
  metrics: OptimizationMetrics;
  events: OptimizationEventPayload[];
  error?: OptimizationError;
}

export interface OptimizationError {
  code: string;
  message: string;
  contextId: string;
  engine?: EngineType;
}

// ─── Metrics ────────────────────────────────────────────────

export interface OptimizationMetrics {
  workflowId: string;
  project: string;
  duration: number;
  stepDurations: Record<string, number>;
  tokensUsed: number;
  aiCost: number;
  provider: string;
  sectionsAnalysed: number;
  patchesGenerated: number;
  patchesApproved: number;
  patchesRejected: number;
  executionSuccess: boolean;
  rollbackCount: number;
  stateTransitions: number;
}

// ─── Event Payload ──────────────────────────────────────────

export interface OptimizationEventPayload {
  event: OptimizationEvent;
  contextId: string;
  project: string;
  workflow: string;
  state: OptimizationState;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ─── Engine Interface ───────────────────────────────────────

export interface Engine {
  type: EngineType;
  execute(context: Record<string, unknown>): Promise<Record<string, unknown>>;
}

// ─── Engine Registry Interface ──────────────────────────────

export interface IEngineRegistry {
  register(type: EngineType, engine: Engine): void;
  resolve<T extends Engine>(type: EngineType): T;
  has(type: EngineType): boolean;
  list(): EngineType[];
}

// ─── State Machine Interface ────────────────────────────────

export interface IStateMachine {
  getCurrentState(): OptimizationState;
  canTransition(to: OptimizationState): boolean;
  transition(to: OptimizationState): void;
  isTerminal(): boolean;
  getTransitionCount(): number;
  reset(): void;
}

// ─── Event Bus Interface ────────────────────────────────────

export type EventListener = (payload: OptimizationEventPayload) => void;

export interface IEventBus {
  emit(event: OptimizationEvent, context: Record<string, unknown>): void;
  on(event: OptimizationEvent, listener: EventListener): void;
  off(event: OptimizationEvent, listener: EventListener): void;
  clear(): void;
}

// ─── Metrics Collector Interface ────────────────────────────

export interface IMetricsCollector {
  recordStepDuration(stepId: string, duration: number): void;
  recordTokens(count: number): void;
  recordCost(cost: number): void;
  recordProvider(provider: string): void;
  recordSectionsAnalysed(count: number): void;
  recordPatchesGenerated(count: number): void;
  recordPatchesApproved(count: number): void;
  recordPatchesRejected(count: number): void;
  recordExecutionSuccess(success: boolean): void;
  recordRollback(): void;
  getMetrics(): OptimizationMetrics;
  reset(): void;
}

