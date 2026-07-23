import { BaseAIProvider, createCapabilityMatrix, capabilitiesFromMatrix, createGenerateResponse } from "./base.js";
import type { AIProviderMetadata, GenerateRequest, GenerateResponse } from "../types.js";
import { AuthenticationError, InvalidRequestError, ProviderUnavailableError } from "../errors.js";

export interface GeminiConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeout?: number;
}

const DEFAULT_MODEL = "gemini-1.5-pro";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiProvider extends BaseAIProvider {
  readonly metadata: AIProviderMetadata = {
    id: "gemini",
    name: "Google Gemini",
    version: "1.0.0",
    capabilities: capabilitiesFromMatrix(
      createCapabilityMatrix({
        supportsStreaming: true,
        supportsSystemPrompts: true,
        supportsJSON: true,
        supportsVision: true,
        supportsReasoning: false,
        supportsFunctionCalling: true,
        supportsLargeContext: true,
        maxContextTokens: 1048576,
        maxOutputTokens: 8192,
        costTier: "medium",
        speedTier: "medium",
      }),
    ),
    capabilityMatrix: createCapabilityMatrix({
      supportsStreaming: true,
      supportsSystemPrompts: true,
      supportsJSON: true,
      supportsVision: true,
      supportsReasoning: false,
      supportsFunctionCalling: true,
      supportsLargeContext: true,
      maxContextTokens: 1048576,
      maxOutputTokens: 8192,
      costTier: "medium",
      speedTier: "medium",
    }),
  };

  private readonly config: GeminiConfig;

  constructor(config: GeminiConfig) {
    super();
    this.config = config;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const model = request.model ?? this.config.model ?? DEFAULT_MODEL;
    const prompt = typeof request.prompt === "string" ? request.prompt : request.prompt.template;

    const url = `${this.config.baseUrl ?? DEFAULT_BASE_URL}/${model}:generateContent?key=${this.config.apiKey}`;

    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 4096,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 30000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError("gemini");
      }
      if (response.status === 400) {
        const err = await response.json().catch(() => ({}));
        throw new InvalidRequestError((err as { error?: { message?: string } }).error?.message ?? "Bad request");
      }
      if (!response.ok) {
        throw new ProviderUnavailableError("gemini");
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      return createGenerateResponse(content, "gemini", model);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async health(): Promise<boolean> {
    try {
      const model = this.config.model ?? DEFAULT_MODEL;
      const url = `${this.config.baseUrl ?? DEFAULT_BASE_URL}/${model}:generateContent?key=${this.config.apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "test" }] }], generationConfig: { maxOutputTokens: 1 } }),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}