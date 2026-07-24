// @forge/content-generation
// PromptComposer: registry-backed prompt composition.
// Integrates with @forge/prompt-registry. No hardcoded prompts.

import type { PromptDefinition } from "@forge/prompt-registry";
import type { PromptContext } from "../types.js";
import { PromptBuilder } from "../prompt/builder.js";

export class PromptComposer {
  private readonly builder: PromptBuilder;

  constructor() {
    this.builder = new PromptBuilder();
  }

  compose(
    registry: { resolve(id: string): PromptDefinition },
    promptId: string,
    context: PromptContext,
  ): PromptDefinition {
    return this.builder.buildPromptDefinition(registry, promptId, context);
  }

  variables(context: PromptContext): Record<string, string> {
    return this.builder.buildVariables(context);
  }
}
