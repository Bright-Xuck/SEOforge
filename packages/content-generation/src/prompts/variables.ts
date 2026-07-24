// @forge/content-generation
// Prompt variable resolution helpers.
// No AI, no providers.

export interface PromptVariables {
  readonly [key: string]: string | number | boolean | undefined;
}

export function resolveVariable(name: string, context: PromptVariables): string | undefined {
  const value = context[name];
  if (value === undefined || value === null) return undefined;
  return String(value);
}

export function resolveAllVariables(base: PromptVariables, overrides: PromptVariables = {}): PromptVariables {
  return { ...base, ...overrides };
}

export function renderTemplate(template: string, variables: PromptVariables): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(String(value ?? ""));
  }
  return result;
}
