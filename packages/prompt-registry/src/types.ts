export interface PromptVersion {
  readonly version: string;
  readonly createdAt: string;
  readonly notes?: string;
  readonly deprecated?: boolean;
  readonly deprecatedAt?: string;
}

export interface PromptOverride {
  readonly provider: string;
  readonly template?: string;
  readonly variables?: string[];
}

export interface PromptMetadata {
  readonly category?: string;
  readonly tags?: string[];
  readonly description?: string;
  readonly defaultProvider?: string;
  readonly providerOverrides?: PromptOverride[];
  readonly inheritsFrom?: string;
}

export interface PromptValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

export interface PromptDefinition {
  readonly id: string;
  readonly name: string;
  readonly template: string;
  readonly variables: string[];
  readonly owner?: string;
  readonly versions: PromptVersion[];
  readonly metadata?: PromptMetadata;
}
