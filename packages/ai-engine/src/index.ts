// @forge/ai-engine
// Production AI provider implementations, factory, retry, rate limiting, logging, cost tracking, fallback.

export type {
  AIProvider,
  AIProviderCapability,
  AIProviderCapabilities,
  AIProviderMetadata,
  AIRequest,
  AIResponse,
  GenerateRequest,
  GenerateResponse,
  StreamChunk,
} from "./types.js";

export {
  ProviderUnavailableError,
  PromptNotFoundError,
  PromptValidationError,
  SkillValidationError,
  ContextBuildError,
  ProviderCapabilityError,
  ModelNotSupportedError,
  PromptRenderError,
  RetryExhaustedError,
  RateLimitError,
  ProviderFallbackError,
  AuthenticationError,
  InvalidRequestError,
  CostTrackingError,
  ProviderLoggingError,
} from "./errors.js";

export { AIEngine } from "./engine.js";
export { ProviderFactory } from "./factory.js";
export type { ProviderType } from "./factory.js";

export { withRetry, isRetryable, calculateDelay } from "./retry.js";
export type { RetryConfig } from "./retry.js";

export { RateLimiter } from "./rate-limiter.js";

export { ProviderLogger } from "./provider-logger.js";
export type { LogEntry } from "./provider-logger.js";

export { PromptHistory } from "./prompt-history.js";
export type { PromptExecution } from "./prompt-history.js";

export { CostTracker, estimateCost } from "./cost-tracker.js";
export type { CostRecord } from "./cost-tracker.js";

export { withFallback, DEFAULT_FALLBACK_CHAIN } from "./fallback.js";
export type { FallbackChain } from "./fallback.js";

// Provider implementations
export {
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  OpenRouterProvider,
  OllamaProvider,
  BaseAIProvider,
  createCapabilityMatrix,
  capabilitiesFromMatrix,
  makeProviderRequest,
  createGenerateResponse,
} from "./providers/index.js";

export type {
  OpenAIConfig,
  AnthropicConfig,
  GeminiConfig,
  OpenRouterConfig,
  OllamaConfig,
  BaseProviderConfig,
} from "./providers/index.js";