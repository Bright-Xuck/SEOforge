// @forge/optimization-orchestrator
// Adapter: wraps @forge/content-generation into the Engine interface

import type { Engine } from "../types.js";
import type { OptimizationContext } from "../context.js";
import { generateContent } from "@forge/content-generation";
import type { ContentGenerationRequest } from "@forge/content-generation";
import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { KnowledgeGraph, MemorySummaryLike, ProjectProfile } from "@forge/knowledge-engine";
import type { BrandProfile } from "@forge/core";

/**
 * Options for creating the content-generation engine adapter.
 * The adapter needs AIEngine and PromptRegistry instances since
 * content generation requires AI to produce section patches.
 */
export interface ContentGenerationAdapterOptions {
  engine: AIEngine;
  registry: PromptRegistry;
  knowledge: KnowledgeGraph;
  memory: MemorySummaryLike;
  profile: ProjectProfile;
  brand: BrandProfile;
}

/**
 * Content Generation Engine adapter.
 *
 * Reads: pageDNA, sections, brandProfile, knowledge, memory from context
 * Writes: generatedPatches to context
 *
 * Only generates section patches — never rewrites whole pages, never publishes,
 * never executes, never knows WordPress, never modifies HTML directly.
 */
export function createContentGenerationEngine(options: ContentGenerationAdapterOptions): Engine {
  return {
    type: "content-generation",
    async execute(ctx: Record<string, unknown>): Promise<Record<string, unknown>> {
      const context = ctx as OptimizationContext;
      const pageDNA = context.pageDNA as any;
      const sections = context.sections as any;

      if (!pageDNA || !sections) {
        // No page DNA or sections — skip generation
        return ctx;
      }

      const request: ContentGenerationRequest = {
        project: context.project,
        pageDNA,
        sections: sections.sections ?? sections,
        projectContext: {
          project: context.project,
          profile: options.profile,
          knowledge: options.knowledge,
          memory: options.memory,
          recentOptimizations: [],
          brandVoice: "",
          preferredTone: "",
          competitors: [],
          targetAudience: "",
          missionGoal: context.missionGoal ?? "",
        },
        brand: options.brand,
        targetKeyword: pageDNA.targetKeyword ?? "",
        intent: pageDNA.searchIntent ?? { kind: "informational", label: "Informational" },
        audience: pageDNA.audience ?? { primary: "general", segments: [] },
        provider: context.aiProvider as string | undefined,
        model: context.configuration["model"] as string | undefined,
      };

      const result = await generateContent(request, {
        engine: options.engine,
        registry: options.registry,
        knowledge: options.knowledge,
        memory: options.memory,
        profile: options.profile,
        brand: options.brand,
      });

      context.generatedPatches = result.patches as unknown[];
      context.brandProfile = options.brand;

      return context;
    },
  };
}