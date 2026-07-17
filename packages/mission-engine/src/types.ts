import type { KnowledgeGraph, MemorySummaryLike, ProjectProfile } from "@forge/knowledge-engine";
import type { Strategy, StrategyContext, StrategyRisk, StrategyStep } from "@forge/strategy-engine";

export type MissionStatus = "draft" | "ready" | "running" | "completed" | "failed" | "cancelled";

export interface MissionGoal {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface MissionStep {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly order: number;
  readonly dependencies: string[];
  readonly agentId: string;
  readonly strategy: Strategy;
  readonly pipelines: string[];
  readonly selectedSkills: string[];
  readonly estimatedTokens: number;
  readonly estimatedDurationMs: number;
  readonly riskLevel: StrategyRisk;
  readonly approvalRequired: boolean;
  readonly expectedOutcomes: string[];
}

export interface MissionMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: MissionStatus;
  readonly source: "builtin" | "template" | "manual";
}

export interface MissionEstimate {
  readonly steps: number;
  readonly tokens: number;
  readonly durationMs: number;
  readonly riskLevel: StrategyRisk;
  readonly approvalRequired: boolean;
}

export interface MissionSummary {
  readonly totalSteps: number;
  readonly totalAgents: number;
  readonly totalStrategies: number;
  readonly totalPipelines: number;
  readonly estimatedTokens: number;
  readonly estimatedDurationMs: number;
  readonly riskLevel: StrategyRisk;
  readonly approvalRequired: boolean;
}

export interface MissionTemplate {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly goal: MissionGoal;
  readonly agentIds: string[];
  readonly objectiveKeywords: string[];
}

export interface MissionContext {
  readonly project: string;
  readonly projectProfile: ProjectProfile;
  readonly knowledge: KnowledgeGraph;
  readonly memorySummary: MemorySummaryLike;
  readonly strategyContext: StrategyContext;
  readonly availableAgents: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly supportedPipelines: ReadonlyArray<string>;
    readonly supportedSkills: ReadonlyArray<string>;
  }>;
  readonly currentTask?: string;
  readonly missionTemplateId?: string;
}

export interface MissionDefinition {
  readonly metadata: MissionMetadata;
  readonly goal: MissionGoal;
  readonly objectives: string[];
  readonly agentIds: string[];
  readonly steps: MissionStep[];
  readonly summary: MissionSummary;
  readonly estimate: MissionEstimate;
  readonly expectedOutcomes: string[];
  readonly templateId?: string;
}

export interface MissionPlan {
  readonly mission: MissionDefinition;
  readonly strategies: Strategy[];
  readonly strategySteps: StrategyStep[];
  readonly estimate: MissionEstimate;
  readonly executionOrder: string[];
}

export interface MissionExecution {
  readonly missionId: string;
  readonly status: "dry-run" | "completed" | "failed";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly stepResults: Array<{
    readonly stepId: string;
    readonly agentId: string;
    readonly strategyId: string;
    readonly pipelineResults: unknown[];
  }>;
}

export interface MissionResult {
  readonly mission: MissionDefinition;
  readonly plan: MissionPlan;
  readonly execution: MissionExecution;
  readonly messages: string[];
}

export interface MissionHistory {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: MissionStatus;
  readonly runs: Array<{
    readonly at: string;
    readonly status: MissionExecution["status"];
    readonly missionId: string;
  }>;
}
