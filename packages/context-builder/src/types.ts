export interface AIContext {
  readonly project: string;
  readonly currentTask?: string;
  readonly knowledgeSummary: string;
  readonly memorySummary: string;
  readonly projectProfileSummary: string;
  readonly findingsSummary: string;
  readonly recommendationsSummary: string;
  readonly executionPlanSummary: string;
  readonly validationReportSummary: string;
  readonly metadata: Record<string, unknown>;
}

export interface ContextBuilderInput {
  readonly project: string;
  readonly knowledge?: unknown;
  readonly memory?: unknown;
  readonly projectProfile?: unknown;
  readonly findings?: unknown;
  readonly recommendations?: unknown;
  readonly executionPlan?: unknown;
  readonly validationReport?: unknown;
  readonly currentTask?: string;
  readonly metadata?: Record<string, unknown>;
}
