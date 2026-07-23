import { BaseAIProvider, createCapabilityMatrix, capabilitiesFromMatrix, createGenerateResponse } from "./base.js";
import type { AIProviderMetadata, GenerateRequest, GenerateResponse } from "../types.js";
import { AuthenticationError, InvalidRequestError, ProviderUnavailableError } from "../errors.js";

export interface AnthropicConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeout?: number;
}

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const DEFAULT_BASE_URL = "https://api.anthropic.com/v1/messages";

export class AnthropicProvider extends BaseAIProvider {
  readonly metadata: AIProviderMetadata = {
    id: "anthropic",
    name: "Anthropic",
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
        maxContextTokens: 200000,
        maxOutputTokens: 8192,
        costTier: "high",
        speedTier: "medium",
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
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
      costTier: "high",
      speedTier: "medium",
    }),
  };

  private readonly config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    super();
    this.config = config;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const model = request.model ?? this.config.model ?? DEFAULT_MODEL;
    const prompt = typeof request.prompt === "string" ? request.prompt : request.prompt.template;

    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": this.config.apiKey,
      "anthropic-version": "2023-06-01",
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
        throw new AuthenticationError("anthropic");
      }
      if (response.status === 400) {
        const err = await response.json().catch(() => ({}));
        throw new InvalidRequestError((err as { error?: { message?: string } }).error?.message ?? "Bad request");
      }
      if (!response.ok) {
        throw new ProviderUnavailableError("anthropic");
      }

      const data = (await response.json()) as {
        content?: Array<{ text?: string }>;
      };
      const content = data.content?.[0]?.text ?? "";

      return createGenerateResponse(content, "anthropic", model);
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
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.config.model ?? DEFAULT_MODEL,
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}