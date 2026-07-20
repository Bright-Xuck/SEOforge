// @forge/content-generation
// Top-level orchestrator: produces a ContentGenerationResult.
// Output is ContentGenerationResult only — no execution (Sprint 17 scope).

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { KnowledgeGraph, MemorySummaryLike, ProjectProfile } from "@forge/knowledge-engine";
import type { MissionContext } from "@forge/mission-engine";
import type { BrandProfile } from "@forge/core";
import type {
  ContentGenerationRequest,
  ContentGenerationResult,
  GeneratedSection,
  ValidationReport,
} from "./types.js";
import type { ContentPatch } from "./patch/types.js";
import type { SectionDiff } from "./diff/types.js";
import { buildProjectContext } from "./context/project-context.js";
import { runGenerator } from "./generators/registry.js";
import type { SectionGeneratorInput } from "./generators/types.js";

/**
 * Generate candidate section improvements for a request.
 * Returns a ContentGenerationResult (never writes anything).
 */
export async function generateContent(
  request: ContentGenerationRequest,
  deps: {
    readonly engine: AIEngine;
    readonly registry: PromptRegistry;
    readonly knowledge: KnowledgeGraph;
    readonly memory: MemorySummaryLike;
    readonly profile: ProjectProfile;
    readonly brand: BrandProfile;
    readonly missionContext?: MissionContext;
  },
): Promise<ContentGenerationResult> {
  const projectContext = buildProjectContext({
    project: request.project,
    profile: deps.profile,
    knowledge: deps.knowledge,
    memory: deps.memory,
    missionContext: deps.missionContext,
  });

  const generatedSections: GeneratedSection[] = [];
  const patches: ContentPatch[] = [];
  const diffs: SectionDiff[] = [];

  for (const section of request.sections) {
    const input: SectionGeneratorInput = {
      project: request.project,
      pageDna: request.pageDNA,
      section,
      projectContext,
      knowledge: deps.knowledge,
      memory: deps.memory,
      profile: deps.profile,
      missionContext: deps.missionContext,
      brand: deps.brand,
      targetKeyword: request.targetKeyword,
      intent: request.intent,
      audience: request.audience,
      engine: deps.engine,
      registry: deps.registry,
    };
    const result = await runGenerator(section.kind, input);
    generatedSections.push(result.section);
    patches.push(result.patch);
    diffs.push(result.patch.diff);
  }

  const validation: ValidationReport = {
    valid: patches.every((patch) => patch.validation.valid),
    errors: patches.flatMap((patch) => patch.validation.errors),
    warnings: patches.flatMap((patch) => patch.validation.warnings),
  };

  return {
    request,
    generated: generatedSections,
    patches,
    diffs,
    validation,
    generatedAt: new Date().toISOString(),
    provider: deps.engine.constructor.name,
    model: request.model,
  };
}
