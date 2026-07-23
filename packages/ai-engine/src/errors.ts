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

export class RetryExhaustedError extends ForgeError {
  constructor(provider: string, attempts: number, cause?: unknown) {
    super("AI_RETRY_EXHAUSTED", `Provider "${provider}" exhausted after ${attempts} retries.`, cause);
    this.name = "RetryExhaustedError";
  }
}

export class RateLimitError extends ForgeError {
  constructor(provider: string, retryAfter?: number) {
    super(
      "AI_RATE_LIMIT",
      `Rate limited by provider "${provider}"${retryAfter ? `. Retry after ${retryAfter}ms.` : "."}`,
    );
    this.name = "RateLimitError";
  }
}

export class ProviderFallbackError extends ForgeError {
  constructor(providersTried: string[]) {
    super("AI_PROVIDER_FALLBACK", `All providers failed: ${providersTried.join(", ")}`);
    this.name = "ProviderFallbackError";
  }
}

export class AuthenticationError extends ForgeError {
  constructor(provider: string, cause?: unknown) {
    super("AI_AUTHENTICATION", `Authentication failed for provider "${provider}".`, cause);
    this.name = "AuthenticationError";
  }
}

export class InvalidRequestError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_INVALID_REQUEST", message, cause);
    this.name = "InvalidRequestError";
  }
}

export class CostTrackingError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_COST_TRACKING", message, cause);
    this.name = "CostTrackingError";
  }
}

export class ProviderLoggingError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_PROVIDER_LOGGING", message, cause);
    this.name = "ProviderLoggingError";
  }
}

export class ConfigError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_CONFIG", message, cause);
    this.name = "ConfigError";
  }
}

export class ProviderConfigError extends ForgeError {
  constructor(provider: string, message: string, cause?: unknown) {
    super("AI_PROVIDER_CONFIG", `Provider "${provider}" configuration error: ${message}`, cause);
    this.name = "ProviderConfigError";
  }
}

export class TokenBudgetExceededError extends ForgeError {
  constructor(budget: number, requested: number) {
    super("AI_TOKEN_BUDGET_EXCEEDED", `Token budget exceeded: budget=${budget}, requested=${requested}`);
    this.name = "TokenBudgetExceededError";
  }
}

export class RequestFingerprintError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_REQUEST_FINGERPRINT", message, cause);
    this.name = "RequestFingerprintError";
  }
}

export class PromptCacheError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_PROMPT_CACHE", message, cause);
    this.name = "PromptCacheError";
  }
}

export class ConflictDetectionError extends ForgeError {
  constructor(section: string, patches: number[]) {
    super(
      "AI_CONFLICT_DETECTION",
      `Conflict detected. Section: ${section}. Patches: ${patches.join(", ")}. Resolution required.`,
    );
    this.name = "ConflictDetectionError";
  }
}

export class DependencyGraphError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_DEPENDENCY_GRAPH", message, cause);
    this.name = "DependencyGraphError";
  }
}

export class PatchBundleError extends ForgeError {
  constructor(bundleId: string, message: string, cause?: unknown) {
    super("AI_PATCH_BUNDLE", `Patch bundle "${bundleId}" error: ${message}`, cause);
    this.name = "PatchBundleError";
  }
}

export class OptimizationGoalError extends ForgeError {
  constructor(goalId: string, message: string, cause?: unknown) {
    super("AI_OPTIMIZATION_GOAL", `Optimization goal "${goalId}" error: ${message}`, cause);
    this.name = "OptimizationGoalError";
  }
}

export class RollbackGroupError extends ForgeError {
  constructor(groupId: string, message: string, cause?: unknown) {
    super("AI_ROLLBACK_GROUP", `Rollback group "${groupId}" error: ${message}`, cause);
    this.name = "RollbackGroupError";
  }
}

export class PreviewPackageError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_PREVIEW_PACKAGE", message, cause);
    this.name = "PreviewPackageError";
  }
}

export class BatchValidationError extends ForgeError {
  constructor(patches: number[], message: string, cause?: unknown) {
    super("AI_BATCH_VALIDATION", `Batch validation failed for patches [${patches.join(", ")}]: ${message}`, cause);
    this.name = "BatchValidationError";
  }
}

export class PatchPriorityError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_PATCH_PRIORITY", message, cause);
    this.name = "PatchPriorityError";
  }
}

export class ExecutionEngineError extends ForgeError {
  constructor(message: string, cause?: unknown) {
    super("AI_EXECUTION_ENGINE", message, cause);
    this.name = "ExecutionEngineError";
  }
}
