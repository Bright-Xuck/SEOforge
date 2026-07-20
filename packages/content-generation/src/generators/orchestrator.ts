// @forge/content-generation
// Shared orchestration for all section generators.
// Enforces: Prompt Registry -> AI Engine -> Validation -> ContentPatch.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { GeneratedSection, GenerationConfidence, GenerationWarnings } from "../types.js";
import type { SectionGeneratorInput } from "./types.js";
import { PromptBuilder } from "../prompt/builder.js";
import { validateGeneratedSection } from "../validation/validator.js";
import { buildPatch } from "../patch/builder.js";
import type { PatchOperation } from "../patch/types.js";

const builder = new PromptBuilder();

/**
 * Run the generation pipeline for a single section.
 * Returns a GeneratedSection plus its self-contained ContentPatch.
 */
export async function generateSection(
  input: SectionGeneratorInput,
  promptId: string,
  operation: PatchOperation,
  selector: string,
  engine: AIEngine,
  registry: PromptRegistry,
): Promise<{ section: GeneratedSection; patch: ReturnType<typeof buildPatch> }> {
  const { section, brand, intent, audience, knowledge, memory, targetKeyword } = input;
  const existingSection = section.evidence.join("\n\n");

  const context = {
    pageDNA: input.pageDna,
    section,
    knowledge,
    memory,
    audience,
    intent,
    tone: knowledge.brandVoice ?? "neutral",
    brand,
    existingSection,
    targetKeywords: [targetKeyword],
    missingTopics: [],
    missionContext: input.missionContext,
  };

  const definition = builder.buildPromptDefinition(registry, promptId, context);
  const variables = builder.buildVariables(context);

  const response = await engine.generate({ prompt: definition, variables });
  const generatedContent = response.output;

  const warnings: GenerationWarnings = {
    keywordStuffing: false,
    repeatedPhrases: false,
    unsafePlaceholders: false,
    lengthOutOfBounds: false,
    malformedMarkup: false,
    brokenLinks: false,
    messages: [],
  };
  const confidence: GenerationConfidence = {
    score: section.confidence,
    basis: "content-intelligence section confidence",
  };

  const generated: GeneratedSection = {
    sectionId: section.id,
    sectionKind: section.kind,
    currentSection: existingSection,
    generatedSection: generatedContent,
    reason: { code: "section-selected", description: "Section selected for improvement.", evidence: [] },
    expectedSeoImpact: "pending-review",
    confidence,
    warnings,
    estimatedTokenCost: Math.ceil(generatedContent.length / 4),
  };

  const validation = validateGeneratedSection(generated);
  const patch = buildPatch(generated, operation, selector, validation, {
    provider: response.provider,
    model: response.model,
    promptVersion: definition.versions?.[0]?.version ?? "1.0.0",
    generatedBy: "content-generation",
  });

  return { section: generated, patch };
}
