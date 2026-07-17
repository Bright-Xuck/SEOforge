import { ForgeError } from "@forge/core";

export class ProviderUnavailableError extends ForgeError {
  constructor(provider: string, cause?: unknown) {
    super("AI_PROVIDER_UNAVAILABLE", `AI provider is unavailable: ${provider}`, cause);
    this.name = "ProviderUnavailableError";
  }
}

export class PromptNotFoundError extends ForgeError {
  constructor(promptId: string) {
    super("AI_PROMPT_NOT_FOUND", `Prompt not found: ${promptId}`);
    this.name = "PromptNotFoundError";
  }
}

export class PromptValidationError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_PROMPT_VALIDATION", message, cause);
    this.name = "PromptValidationError";
  }
}

export class SkillValidationError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_SKILL_VALIDATION", message, cause);
    this.name = "SkillValidationError";
  }
}

export class ContextBuildError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_CONTEXT_BUILD", message, cause);
    this.name = "ContextBuildError";
  }
}

export class ProviderCapabilityError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_PROVIDER_CAPABILITY", message, cause);
    this.name = "ProviderCapabilityError";
  }
}

export class ModelNotSupportedError extends ForgeError {
  constructor(model: string, provider: string) {
    super("AI_MODEL_NOT_SUPPORTED", `Model "${model}" is not supported by provider "${provider}".`);
    this.name = "ModelNotSupportedError";
  }
}

export class PromptRenderError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_PROMPT_RENDER", message, cause);
    this.name = "PromptRenderError";
  }
}
