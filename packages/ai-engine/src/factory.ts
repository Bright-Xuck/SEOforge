// @forge/ai-engine
// ProviderFactory: swaps Mock -> Real providers without changing callers (ADR-0030).
// Sprint 17 keeps providers mocked; real API wiring lands later.

import type { AIProvider } from "./types.js";
import {
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  OpenRouterProvider,
  OllamaProvider,
} from "./providers.js";

/**
 * Configuration for constructing an AI provider.
 */
export interface AIProviderConfig {
  readonly provider: "openai" | "anthropic" | "gemini" | "openrouter" | "ollama";
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
}

const PROVIDER_MAP = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
  openrouter: OpenRouterProvider,
  ollama: OllamaProvider,
} as const;

/**
 * Create a provider from config. Currently returns the mocked implementation
 * for every provider; the factory boundary lets us swap in real clients later
 * without touching any caller.
 */
export function createProvider(config: AIProviderConfig): AIProvider {
  return PROVIDER_MAP[config.provider];
}

/**
 * ProviderFactory namespace for ergonomic construction.
 */
export const ProviderFactory = {
  create(config: AIProviderConfig): AIProvider {
    return createProvider(config);
  },
};
