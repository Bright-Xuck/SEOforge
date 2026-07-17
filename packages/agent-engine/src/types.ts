import type { ContextBuilder, AIContext } from "@forge/context-builder";
import type { KnowledgeGraph, ProjectProfile, MemorySummaryLike } from "@forge/knowledge-engine";
import type { PipelineDefinition, PipelineResult } from "@forge/pipeline-engine";
import type { SkillDefinition } from "@forge/skills";

export type AgentCapability =
  | "select-pipeline"
  | "review-findings"
  | "review-recommendations"
  | "review-execution"
  | "escalate-approval"
  | "stop-execution";

export interface AgentMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly goal: string;
  readonly supportedProviders: string[];
  readonly supportedProjects: string[];
  readonly supportedPipelines: string[];
  readonly supportedSkills: string[];
  readonly capabilities: AgentCapability[];
}

export interface AgentDecision {
  readonly agentId: string;
  readonly pipelineId: string;
  readonly requiredSkillIds: string[];
  readonly continueExecution: boolean;
  readonly stopExecution: boolean;
  readonly escalateForApproval: boolean;
  readonly rationale: string;
}

export interface AgentExecution {
  readonly decision: AgentDecision;
  readonly pipeline?: PipelineResult;
}

export interface AgentResult {
  readonly agentId: string;
  readonly status: "success" | "stopped" | "escalated" | "failed";
  readonly decision: AgentDecision;
  readonly execution?: AgentExecution;
  readonly messages: string[];
}

export interface AgentContext {
  readonly project: string;
  readonly projectProfile: ProjectProfile;
  readonly knowledge: KnowledgeGraph;
  readonly memorySummary: MemorySummaryLike;
  readonly pipelineRegistry: AgentPipelineRegistry;
  readonly skillRegistry: AgentSkillRegistry;
  readonly providerRegistry: AgentProviderRegistry;
  readonly latestFindings: unknown[];
  readonly recommendations: unknown[];
  readonly executionPlans: unknown[];
  readonly validationReports: unknown[];
  readonly executionHistory: unknown[];
  readonly currentTask?: string;
  readonly aiContext?: AIContext;
  readonly contextBuilder?: ContextBuilder;
}

export interface AgentPipelineRegistry {
  listPipelines(): PipelineDefinition[];
  getPipeline(id: string): PipelineDefinition;
  exists(id: string): boolean;
}

export interface AgentSkillRegistry {
  list(): SkillDefinition[];
  get(id: string): SkillDefinition;
  exists(id: string): boolean;
}

export interface AgentProviderRegistry {
  list(): Array<{ readonly id: string; readonly name: string }>;
  exists(id: string): boolean;
}

export interface Agent {
  readonly metadata: AgentMetadata;
  decide(context: AgentContext): AgentDecision;
  execute(
    context: AgentContext,
    runtime: {
      invokePipeline(pipelineId: string, context: AgentContext): Promise<PipelineResult>;
      dryRun?: boolean;
    },
  ): Promise<AgentResult>;
  review(context: AgentContext, decision: AgentDecision): string[];
}
