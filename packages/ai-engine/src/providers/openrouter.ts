import { BaseAIProvider, createCapabilityMatrix, capabilitiesFromMatrix, createGenerateResponse } from "./base.js";
import type { AIProviderMetadata, GenerateRequest, GenerateResponse } from "../types.js";
import { AuthenticationError, InvalidRequestError, ProviderUnavailableError } from "../errors.js";

export interface OpenRouterConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeout?: number;
}

const DEFAULT_MODEL = "openai/gpt-4o";
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterProvider extends BaseAIProvider {
  readonly metadata: AIProviderMetadata = {
    id: "openrouter",
    name: "OpenRouter",
    version: "1.0.0",
    capabilities: capabilitiesFromMatrix(
      createCapabilityMatrix({
        supportsStreaming: true,
        supportsSystemPrompts: true,
        supportsJSON: true,
        supportsVision: true,
        supportsReasoning: true,
        supportsFunctionCalling: true,
        supportsLargeContext: true,
        maxContextTokens: 128000,
        maxOutputTokens: 16384,
        costTier: "medium",
        speedTier: "fast",
      }),
    ),
    capabilityMatrix: createCapabilityMatrix({
      supportsStreaming: true,
      supportsSystemPrompts: true,
      supportsJSON: true,
      supportsVision: true,
      supportsReasoning: true,
      supportsFunctionCalling: true,
      supportsLargeContext: true,
      maxContextTokens: 128000,
      maxOutputTokens: 16384,
      costTier: "medium",
      speedTier: "fast",
    }),
  };

  private readonly config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    super();
    this.config = config;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const model = request.model ?? this.config.model ?? DEFAULT_MODEL;
    const prompt = typeof request.prompt === "string" ? request.prompt : request.prompt.template;

    const messages: Array<Record<string, unknown>> = [{ role: "user", content: prompt }];

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: 4096,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
      "HTTP-Referer": "https://seoforge.dev",
      "X-Title": "SEOforge",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 30000);

    try {
      const response = await fetch(this.config.baseUrl ?? DEFAULT_BASE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new AuthenticationError("openrouter");
      }
      if (response.status === 400) {
        const err = await response.json().catch(() => ({}));
        throw new InvalidRequestError((err as { error?: { message?: string } }).error?.message ?? "Bad request");
      }
      if (!response.ok) {
        throw new ProviderUnavailableError("openrouter");
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";

      return createGenerateResponse(content, "openrouter", model);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(this.config.baseUrl ?? DEFAULT_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model ?? DEFAULT_MODEL,
          messages: [{ role: "user", content: "test" }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}