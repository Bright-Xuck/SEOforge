import type { AIContext } from "@forge/context-builder";
import type { AIEngine } from "@forge/ai-engine";
import type { KnowledgeGraph, ProjectProfile, MemorySummaryLike } from "@forge/knowledge-engine";
import type { PromptDefinition, PromptValidationResult } from "@forge/prompt-registry";

export interface SkillMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: string;
  readonly tags: string[];
  readonly difficulty: "beginner" | "intermediate" | "advanced";
  readonly costEstimate: string;
  readonly estimatedTokens: number;
  readonly supportedProviders: string[];
  readonly requiredKnowledge: string[];
  readonly requiredMemory: string[];
  readonly requiredInputs: string[];
  readonly outputs: string[];
  readonly validator: string;
}

export interface SkillContext {
  readonly project: string;
  readonly knowledge: KnowledgeGraph;
  readonly profile: ProjectProfile;
  readonly memorySummary: MemorySummaryLike;
  readonly findings: unknown[];
  readonly recommendations: unknown[];
  readonly provider?: string;
  readonly model?: string;
  readonly aiContext?: AIContext;
}

export interface SkillValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

export interface SkillExecutionResult<TOutput> {
  readonly skillId: string;
  readonly status: "success" | "failed";
  readonly output?: TOutput;
  readonly validation: SkillValidationResult;
  readonly provider?: string;
}

export interface SkillDefinition<TInput = unknown, TOutput = unknown> extends SkillMetadata {
  readonly promptId: string;
  readonly prompt: PromptDefinition;
  readonly requiredContext: string[];
  readonly inputs: string[];
  validate(input: TInput, context: SkillContext): SkillValidationResult;
  execute(input: TInput, context: SkillContext, engine: AIEngine): Promise<SkillExecutionResult<TOutput>>;
  validatePrompt(prompt: PromptDefinition): PromptValidationResult;
}
