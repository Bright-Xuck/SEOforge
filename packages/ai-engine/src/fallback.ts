import type { AIProvider } from "./types.js";
import { ProviderFallbackError } from "./errors.js";

export type FallbackChain = readonly string[];

/**
 * Default fallback chain when a provider fails.
 * OpenAI -> Anthropic -> Gemini -> OpenRouter -> Ollama
 */
export const DEFAULT_FALLBACK_CHAIN: FallbackChain = [
  "openai",
  "anthropic",
  "gemini",
  "openrouter",
  "ollama",
] as const;

/**
 * Execute a function with fallback across providers.
 * Falls back only when compatible (same capability requirements).
 */
export async function withFallback<T>(
  providers: Map<string, AIProvider>,
  chain: FallbackChain,
  fn: (provider: AIProvider, name: string) => Promise<T>,
): Promise<{ result: T; provider: string }> {
  const errors: string[] = [];

  for (const name of chain) {
    const provider = providers.get(name);
    if (!provider) continue;

    try {
      const result = await fn(provider, name);
      return { result, provider: name };
    } catch (error) {
      errors.push(`${name}: ${String(error)}`);
      continue;
    }
  }

  throw new ProviderFallbackError(errors);
}