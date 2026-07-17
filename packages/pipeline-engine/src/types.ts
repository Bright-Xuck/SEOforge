import type { ExecutionPlan } from "@forge/action-engine";
import type { WebsiteSnapshot, WriteProvider } from "@forge/core";
import type { ValidationReport } from "@forge/preflight-validator";
import type { ExecutionResult } from "@forge/execution-engine";

export type PipelineStepType =
  | "website-reader"
  | "homepage-analysis"
  | "recommendation-engine"
  | "action-engine"
  | "preflight-validator"
  | "execution-engine";

export type PipelineStepStatus = "pending" | "running" | "completed" | "skipped" | "failed";

export interface PipelineContext {
  readonly project?: string;
  readonly rootDir?: string;
  readonly provider?: WriteProvider;
  snapshot?: WebsiteSnapshot;
  findings?: unknown;
  recommendations?: unknown;
  executionPlan?: ExecutionPlan;
  validationReport?: ValidationReport;
  executionResult?: ExecutionResult;
  knowledge?: unknown;
  memorySummary?: unknown;
  changes?: unknown;
  projectProfile?: unknown;
  memory?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

export interface PipelineStepResult {
  readonly stepId: string;
  readonly status: PipelineStepStatus;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly output?: unknown;
  readonly warnings: string[];
  readonly errors: string[];
}

export interface PipelineStepDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly type: PipelineStepType;
  readonly inputs: string[];
  readonly outputs: string[];
  readonly dependencies: string[];
  readonly timeout?: number;
  readonly retryPolicy?: {
    readonly retries: number;
    readonly delayMs: number;
  };
  execute(context: PipelineContext): Promise<unknown> | unknown;
}

export interface PipelineDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly steps: PipelineStepDefinition[];
  readonly metadata?: Record<string, unknown>;
}

export interface PipelineEventBase {
  readonly pipelineId: string;
  readonly pipelineName: string;
  readonly timestamp: string;
}

export interface PipelineStartedEvent extends PipelineEventBase {
  readonly type: "PipelineStarted";
}

export interface StepStartedEvent extends PipelineEventBase {
  readonly type: "StepStarted";
  readonly stepId: string;
}

export interface StepCompletedEvent extends PipelineEventBase {
  readonly type: "StepCompleted";
  readonly stepId: string;
}

export interface StepFailedEvent extends PipelineEventBase {
  readonly type: "StepFailed";
  readonly stepId: string;
  readonly error: string;
}

export interface PipelineCompletedEvent extends PipelineEventBase {
  readonly type: "PipelineCompleted";
}

export type PipelineEvent =
  | PipelineStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | PipelineCompletedEvent;

export interface PipelineResult {
  readonly status: "success" | "failed" | "partial";
  readonly pipelineId: string;
  readonly pipelineName: string;
  readonly stepsExecuted: string[];
  readonly stepsSkipped: string[];
  readonly durationMs: number;
  readonly errors: string[];
  readonly outputs: Record<string, unknown>;
  readonly events: PipelineEvent[];
  readonly stepResults: PipelineStepResult[];
}
