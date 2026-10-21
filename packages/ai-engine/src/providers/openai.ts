import { BaseAIProvider, createCapabilityMatrix, capabilitiesFromMatrix, makeProviderRequest, createGenerateResponse } from "./base.js";
import type { AIProviderMetadata, GenerateRequest, GenerateResponse } from "../types.js";
import { AuthenticationError, InvalidRequestError, ProviderUnavailableError, RateLimitError } from "../errors.js";

export interface OpenAIConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeout?: number;
}

const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_BASE_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIProvider extends BaseAIProvider {
  readonly metadata: AIProviderMetadata = {
    id: "openai",
    name: "OpenAI",
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
        costTier: "high",
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
      costTier: "high",
      speedTier: "fast",
    }),
  };

  private readonly config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
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

    const response = await makeProviderRequest(
      this.config.baseUrl ?? DEFAULT_BASE_URL,
      body,
      this.config.apiKey,
      this.config.timeout ?? 30000,
    );

    if (response.status === 401) {
      throw new AuthenticationError("openai");
    }
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      throw new InvalidRequestError((err as { error?: { message?: string } }).error?.message ?? "Bad request");
    }
    if (response.status === 429 || response.status === 503) {
      throw new RateLimitError(this.metadata.id);
    }
    if (!response.ok) {
      throw new ProviderUnavailableError(this.metadata.id);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";

    return createGenerateResponse(content, this.metadata.id, model);
  }

  async health(): Promise<boolean> {
    try {
      const response = await makeProviderRequest(
        this.config.baseUrl ?? DEFAULT_BASE_URL,
        { model: this.config.model ?? DEFAULT_MODEL, messages: [{ role: "user", content: "test" }], max_tokens: 1 },
        this.config.apiKey,
        5000,
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}