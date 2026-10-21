import type { AIProvider } from "./types.js";
import { ProviderUnavailableError } from "./errors.js";
import { OpenAIProvider } from "./providers/openai.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { GeminiProvider } from "./providers/gemini.js";
import { OpenRouterProvider } from "./providers/openrouter.js";
import { OllamaProvider } from "./providers/ollama.js";
import { ZAIProvider } from "./providers/zai.js";
import { DEFAULT_ZAI_MODEL } from "./providers/zai.js";
import type { AIProviderConfig } from "@forge/config";

export type ProviderType = "openai" | "anthropic" | "gemini" | "openrouter" | "zai" | "ollama";

export class ProviderFactory {
  private providers: Map<string, AIProvider> = new Map();
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  getProvider(type: ProviderType): AIProvider {
    const existing = this.providers.get(type);
    if (existing) return existing;

    const provider = this.createProvider(type);
    this.providers.set(type, provider);
    return provider;
  }

  getDefaultProvider(): AIProvider {
    return this.getProvider(this.config.defaultProvider as ProviderType);
  }

  getAllProviders(): AIProvider[] {
    const result: AIProvider[] = [];
    if (this.config.openaiApiKey) result.push(this.getProvider("openai"));
    if (this.config.anthropicApiKey) result.push(this.getProvider("anthropic"));
    if (this.config.geminiApiKey) result.push(this.getProvider("gemini"));
    if (this.config.openrouterApiKey) result.push(this.getProvider("openrouter"));
    if (this.config.zaiApiKey) result.push(this.getProvider("zai"));
    result.push(this.getProvider("ollama"));
    return result;
  }

  /**
   * Static helper: create a provider from a partial config object.
   * Used by CLI commands.
   */
  static create(opts: { provider: ProviderType; model?: string }): AIProvider {
    const config: AIProviderConfig = {
      openaiApiKey: process.env.OPENAI_API_KEY ?? "",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
      geminiApiKey: process.env.GEMINI_API_KEY ?? "",
      openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
      zaiApiKey: process.env.ZAI_API_KEY ?? "",
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
      ollamaModel: process.env.OLLAMA_MODEL ?? "llama3",
      defaultProvider: opts.provider,
      defaultModel: opts.model ?? process.env.DEFAULT_MODEL ?? (opts.provider === "zai" ? DEFAULT_ZAI_MODEL : "gpt-4"),
      temperature: parseFloat(process.env.TEMPERATURE ?? "0.7"),
      maxTokens: parseInt(process.env.MAX_TOKENS ?? "4096", 10),
      timeout: parseInt(process.env.TIMEOUT ?? "30000", 10),
      maxRetries: parseInt(process.env.MAX_RETRIES ?? "3", 10),
      retryDelay: parseInt(process.env.RETRY_DELAY ?? "1000", 10),
    };
    const factory = new ProviderFactory(config);
    return factory.getProvider(opts.provider);
  }

  /**
   * Static helper: list available providers.
   */
  static listProviders(): Array<{ id: string; name: string; status: string }> {
    const providers: Array<{ id: string; name: string; status: string }> = [
      { id: "openai", name: "OpenAI", status: process.env.OPENAI_API_KEY ? "configured" : "missing key" },
      { id: "anthropic", name: "Anthropic", status: process.env.ANTHROPIC_API_KEY ? "configured" : "missing key" },
      { id: "gemini", name: "Google Gemini", status: process.env.GEMINI_API_KEY ? "configured" : "missing key" },
      { id: "openrouter", name: "OpenRouter", status: process.env.OPENROUTER_API_KEY ? "configured" : "missing key" },
      { id: "zai", name: "Z.ai", status: process.env.ZAI_API_KEY ? "configured" : "missing key" },
      {
        id: "ollama",
        name: "Ollama",
        status: "local endpoint (verify with `forge ai test ollama`)",
      },
    ];
    return providers;
  }

  private createProvider(type: ProviderType): AIProvider {
    switch (type) {
      case "openai":
        if (!this.config.openaiApiKey) throw new ProviderUnavailableError("openai");
        return new OpenAIProvider({
          apiKey: this.config.openaiApiKey,
          model: this.config.defaultModel,
          timeout: this.config.timeout,
        });
      case "anthropic":
        if (!this.config.anthropicApiKey) throw new ProviderUnavailableError("anthropic");
        return new AnthropicProvider({
          apiKey: this.config.anthropicApiKey,
          model: this.config.defaultModel,
          timeout: this.config.timeout,
        });
      case "gemini":
        if (!this.config.geminiApiKey) throw new ProviderUnavailableError("gemini");
        return new GeminiProvider({
          apiKey: this.config.geminiApiKey,
          model: this.config.defaultModel,
          timeout: this.config.timeout,
        });
      case "openrouter":
        if (!this.config.openrouterApiKey) throw new ProviderUnavailableError("openrouter");
        return new OpenRouterProvider({
          apiKey: this.config.openrouterApiKey,
          model: this.config.defaultModel,
          timeout: this.config.timeout,
        });
      case "zai":
        if (!this.config.zaiApiKey) throw new ProviderUnavailableError("zai");
        return new ZAIProvider({
          apiKey: this.config.zaiApiKey,
          model: this.config.defaultModel,
          timeout: this.config.timeout,
        });
      case "ollama":
        return new OllamaProvider({
          baseUrl: this.config.ollamaBaseUrl,
          model: this.config.ollamaModel,
          timeout: this.config.timeout,
        });
      default:
        throw new ProviderUnavailableError(type);
    }
  }
}
