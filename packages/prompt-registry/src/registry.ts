import type { PromptDefinition, PromptValidationResult } from "./types.js";

function unique(values: readonly string[] = []): string[] {
  return [...new Set(values)];
}

/**
 * Render `{{variable}}` placeholders in a prompt template.
 *
 * This is the single rendering contract shared by the registry and the AI
 * engine. A missing variable is an error, never a silently empty string: a
 * prompt that reaches a model with unrendered placeholders is a broken prompt.
 */
export function renderPromptTemplate(
  template: string,
  variables: Record<string, string | number | boolean> = {},
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) {
      throw new Error(`Prompt variable missing: ${key}`);
    }
    return String(value);
  });
}

export class PromptRegistry {
  private prompts = new Map<string, PromptDefinition>();

  register(prompt: PromptDefinition): void {
    this.validate(prompt);

    const parentId = prompt.metadata?.inheritsFrom;
    if (parentId && !this.prompts.has(parentId)) {
      throw new Error(`Prompt inheritance target not found: ${parentId}`);
    }

    this.prompts.set(prompt.id, {
      ...prompt,
      variables: unique(prompt.variables),
      metadata: prompt.metadata
        ? {
            ...prompt.metadata,
            tags: unique(prompt.metadata.tags),
            providerOverrides: prompt.metadata.providerOverrides?.map((override) => ({
              ...override,
              variables: unique(override.variables),
            })),
          }
        : undefined,
    });
  }

  get(id: string): PromptDefinition {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }
    return prompt;
  }

  list(): PromptDefinition[] {
    return [...this.prompts.values()];
  }

  getVersion(id: string): string {
    const prompt = this.get(id);
    return prompt.versions.at(-1)?.version ?? "0.0.0";
  }

  resolve(id: string, provider?: string): PromptDefinition {
    const prompt = this.get(id);
    const inherited = prompt.metadata?.inheritsFrom ? this.resolve(prompt.metadata.inheritsFrom, provider) : null;
    const override = provider
      ? prompt.metadata?.providerOverrides?.find((item) => item.provider === provider)
      : undefined;

    return {
      ...prompt,
      template: override?.template ?? prompt.template ?? inherited?.template ?? "",
      variables: unique([...(inherited?.variables ?? []), ...prompt.variables, ...(override?.variables ?? [])]),
    };
  }

  render(id: string, variables: Record<string, string | number | boolean> = {}, provider?: string): string {
    const prompt = this.resolve(id, provider);
    return this.renderPrompt(prompt, variables);
  }

  renderPrompt(prompt: PromptDefinition, variables: Record<string, string | number | boolean> = {}): string {
    return renderPromptTemplate(prompt.template, variables);
  }

  validate(prompt: PromptDefinition): PromptValidationResult {
    const errors: string[] = [];

    if (!prompt.id.trim()) errors.push("Prompt id is required");
    if (!prompt.name.trim()) errors.push("Prompt name is required");
    if (!prompt.template.trim()) errors.push("Prompt template is required");
    if (!prompt.variables.length) errors.push("Prompt variables must not be empty");
    if (!prompt.versions.length) errors.push("Prompt versions must not be empty");

    return { valid: errors.length === 0, errors };
  }

  clear(): void {
    this.prompts.clear();
  }
}
