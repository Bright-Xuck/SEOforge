// @forge/content-generation
// Prompt Builder: composes registry-backed PromptDefinitions.
// Prompts are NEVER built by manual string concatenation (ADR-0010, ADR-0030).

import type { PromptDefinition } from "@forge/prompt-registry";
import type { PromptContext } from "../types.js";

/**
 * Builds a structured PromptContext from the inputs the generators receive.
 * Centralizes the mapping so generators stay thin and prompt composition is testable.
 */
export class PromptBuilder {
  /**
   * Compose a registry-backed PromptDefinition from a PromptContext.
   * The template is resolved from the prompt registry by `promptId`; variables
   * are filled from the structured context (never concatenated by hand).
   */
  buildPromptDefinition(
    registry: { resolve(id: string): PromptDefinition },
    promptId: string,
    context: PromptContext,
  ): PromptDefinition {
    const resolved = registry.resolve(promptId);
    void context;
    return {
      ...resolved,
      variables: [
        ...resolved.variables,
        "sectionKind",
        "existingSection",
        "targetKeywords",
        "missingTopics",
        "intent",
        "audience",
        "tone",
        "brand",
      ],
    };
  }

  /**
   * Render the variables map for a prompt from a PromptContext.
   * Used by the generator when calling engine.generate({ prompt, variables }).
   */
  buildVariables(context: PromptContext): Record<string, string> {
    return {
      sectionKind: context.section.kind,
      existingSection: context.existingSection,
      targetKeywords: context.targetKeywords.join(", "),
      missingTopics: context.missingTopics.join(", "),
      intent: context.intent.primary,
      audience: context.audience.level,
      tone: context.tone,
      brand: context.brand.brand,
      knowledge: context.knowledge.brand ?? "",
      memory: context.memory.project,
    };
  }
}
