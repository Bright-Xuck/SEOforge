// @forge/ai-engine
// Public API exports

export { AIEngine } from "./engine.js";
export { resolveRequestPrompt } from "./prompt-render.js";
export { SessionManager } from "./session.js";
export { HealthTracker } from "./health-tracker.js";
export { CostTracker, estimateCost } from "./cost-tracker.js";
export { ProviderFactory } from "./factory.js";
export { DEFAULT_ZAI_MODEL } from "./providers/zai.js";
// export { ProviderRegistry } from "./providers.js"; // exported elsewhere
export { RequestFingerprinter } from "./request-fingerprint.js";
export { TokenBudgetManager } from "./token-budget.js";
export { PromptCache } from "./prompt-cache.js";
export { ProviderLogger } from "./provider-logger.js";
export { PromptHistory } from "./prompt-history.js";

// Provider exports
export { OpenAIProvider } from "./providers/openai.js";
export type { OpenAIConfig } from "./providers/openai.js";
export { ZAIProvider } from "./providers/zai.js";
export type { ZAIConfig } from "./providers/zai.js";

// Error classes
export * from "./errors.js";

// Type exports
export type {
  AIProvider, AIProviderCapability, AIProviderCapabilities, AIProviderMetadata,
  AIRequest, AIResponse,
  AISession, AISessionContext,
  AIHealthCheck, HealthStatus, ProviderHealthRecord,
  CostEntry, CostBreakdown, CostSummary,
  GenerateRequest, GenerateResponse, StreamChunk,
} from "./types.js";

export type { FingerprintConfig } from "./request-fingerprint.js";