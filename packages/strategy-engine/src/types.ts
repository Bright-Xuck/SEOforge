import type { KnowledgeGraph, ProjectProfile, MemorySummaryLike } from "@forge/knowledge-engine";
import type { PipelineDefinition } from "@forge/pipeline-engine";
import type { SkillDefinition } from "@forge/skills";

export type StrategyRisk = "low" | "moderate" | "high" | "critical";

export interface StrategyGoal {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface StrategyEstimate {
  readonly workItems: number;
  readonly tokens: number;
  readonly durationMs: number;
}

export interface StrategyMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: "draft" | "ready" | "executing" | "completed" | "failed" | "cancelled";
  readonly sourceAgentId: string;
}

export interface StrategyStep {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly order: number;
  readonly dependencies: string[];
  readonly selectedPipelines: string[];
  readonly selectedSkills: string[];
  readonly estimatedWork: string[];
  readonly estimatedTokens: number;
  readonly estimatedDurationMs: number;
  readonly riskLevel: StrategyRisk;
  readonly approvalRequired: boolean;
  readonly expectedOutcomes: string[];
}

export interface StrategySummary {
  readonly totalPipelines: number;
  readonly totalSkills: number;
  readonly totalSteps: number;
  readonly riskLevel: StrategyRisk;
  readonly approvalRequired: boolean;
  readonly estimatedTokens: number;
  readonly estimatedDurationMs: number;
}

export interface StrategyDecision {
  readonly agentId: string;
  readonly rationale: string;
  readonly continueExecution: boolean;
  readonly stopExecution: boolean;
  readonly escalateForApproval: boolean;
}

export interface Strategy {
  readonly metadata: StrategyMetadata;
  readonly goal: StrategyGoal;
  readonly objectives: string[];
  readonly priority: number;
  readonly steps: StrategyStep[];
  readonly selectedPipelines: string[];
  readonly selectedSkills: string[];
  readonly estimatedWork: string[];
  readonly estimatedTokens: number;
  readonly estimatedDurationMs: number;
  readonly riskLevel: StrategyRisk;
  readonly approvalRequired: boolean;
  readonly expectedOutcomes: string[];
  readonly summary: StrategySummary;
  readonly decision: StrategyDecision;
}

export interface StrategyContext {
  readonly project: string;
  readonly projectProfile: ProjectProfile;
  readonly knowledge: KnowledgeGraph;
  readonly memorySummary: MemorySummaryLike;
  readonly latestFindings: unknown[];
  readonly recommendations: unknown[];
  readonly executionPlans: unknown[];
  readonly validationReports: unknown[];
  readonly executionHistory: unknown[];
  readonly pipelineRegistry: {
    listPipelines(): PipelineDefinition[];
    exists(id: string): boolean;
  };
  readonly skillRegistry: {
    list(): SkillDefinition[];
    exists(id: string): boolean;
  };
  readonly providerRegistry: {
    list(): Array<{ readonly id: string; readonly name: string }>;
    exists(id: string): boolean;
  };
  readonly currentTask?: string;
  readonly agentId?: string;
}
