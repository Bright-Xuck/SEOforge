// @forge/content-generation
// Prompt template helpers.
// No AI, no providers.

export interface PromptTemplate {
  readonly id: string;
  readonly version: string;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly variables: string[];
}

export function createPromptTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: "default",
    version: "1.0.0",
    systemPrompt: "You are a professional SEO content writer.",
    userPrompt: "Write a {{sectionType}} section about {{primaryKeyword}}.",
    variables: ["sectionType", "primaryKeyword"],
    ...overrides,
  };
}

export function mergeTemplates(base: PromptTemplate, override: Partial<PromptTemplate>): PromptTemplate {
  return {
    ...base,
    ...override,
    variables: [...new Set([...base.variables, ...(override.variables ?? [])])],
  };
}
