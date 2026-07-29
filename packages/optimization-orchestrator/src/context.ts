// @forge/optimization-orchestrator
// Strongly typed optimization context — no engine rebuilds what another produced

import type { WorkflowDefinition, RuntimeMetadata } from "./types.js";
import { OptimizationState } from "./state-machine.js";

/**
 * Single shared context for the entire optimization lifecycle.
 * Every engine reads from and writes to this context.
 * No engine should rebuild information another engine already produced.
 */
export interface OptimizationContext {
  [key: string]: unknown;

  /** Unique identifier for this optimization run */
  id: string;

  /** Project identifier */
  project: string;

  /** The workflow definition being executed */
  workflow: WorkflowDefinition;

  // ─── Mission/Agent/Strategy/Pipeline (from upstream) ───
  missionGoal?: string;
  agentResult?: unknown;
  strategy?: unknown;
  pipelineResult?: unknown;

  // ─── Content Intelligence (deterministic) ───
  websiteSnapshot?: unknown;
  analysisReport?: unknown;
  pageDNA?: unknown;
  contentGraph?: unknown;
  contentSnapshot?: unknown;
  sections?: unknown;
  gaps?: unknown;
  qualityScores?: unknown;

  // ─── AI Generation ───
  generatedPatches?: unknown[];
  brandProfile?: unknown;

  // ─── Review ───
  reviewSession?: unknown;

  // ─── Optimization Composer ───
  patchBundles?: unknown[];
  dependencyGraph?: unknown;
  conflictReport?: unknown;

  // ─── Execution ───
  executionPlan?: unknown;
  validationReport?: unknown;
  executionHistory?: unknown[];

  // ─── Knowledge & Memory ───
  knowledge?: unknown;
  memory?: unknown;

  // ─── Provider ───
  provider?: unknown;
  aiProvider?: unknown;

  // ─── Runtime ───
  configuration: Record<string, unknown>;
  metadata: RuntimeMetadata;
}

/**
 * Create a new optimization context with default values.
 */
export function createContext(
  id: string,
  project: string,
  workflow: WorkflowDefinition,
  configuration: Record<string, unknown> = {},
): OptimizationContext {
  return {
    id,
    project,
    workflow,
    configuration,
    metadata: {
      startedAt: Date.now(),
      stateTransitions: 0,
      currentState: OptimizationState.Created,
    },
  };
}

/**
 * Validate that the context has all required keys for a given step.
 * Throws MissingContextError if any required key is missing.
 */
export function validateContext(
  context: OptimizationContext,
  requiredKeys: (keyof OptimizationContext)[],
): void {
  const missing: string[] = [];
  for (const key of requiredKeys) {
    if (context[key] === undefined) {
      missing.push(key as string);
    }
  }
  if (missing.length > 0) {
    const { MissingContextError } = require("./errors.js");
    throw new MissingContextError(context.id, missing);
  }
}