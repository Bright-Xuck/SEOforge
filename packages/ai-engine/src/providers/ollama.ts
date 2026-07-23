import { BaseAIProvider, createCapabilityMatrix, capabilitiesFromMatrix, createGenerateResponse } from "./base.js";
import type { AIProviderMetadata, GenerateRequest, GenerateResponse } from "../types.js";
import { InvalidRequestError, ProviderUnavailableError } from "../errors.js";

export interface OllamaConfig {
  readonly baseUrl?: string;
  readonly model?: string;
  readonly timeout?: number;
}

const DEFAULT_MODEL = "llama3";
const DEFAULT_BASE_URL = "http://localhost:11434/api/generate";

export class OllamaProvider extends BaseAIProvider {
  readonly metadata: AIProviderMetadata = {
    id: "ollama",
    name: "Ollama",
    version: "1.0.0",
    capabilities: capabilitiesFromMatrix(
      createCapabilityMatrix({
        supportsStreaming: true,
        supportsSystemPrompts: true,
        supportsJSON: true,
        supportsVision: false,
        supportsReasoning: false,
        supportsFunctionCalling: false,
        supportsLargeContext: false,
        maxContextTokens: 8192,
        maxOutputTokens: 4096,
        costTier: "free",
        speedTier: "medium",
      }),
    ),
    capabilityMatrix: createCapabilityMatrix({
      supportsStreaming: true,
      supportsSystemPrompts: true,
      supportsJSON: true,
      supportsVision: false,
      supportsReasoning: false,
      supportsFunctionCalling: false,
      supportsLargeContext: false,
      maxContextTokens: 8192,
      maxOutputTokens: 4096,
      costTier: "free",
      speedTier: "medium",
    }),
  };

  private readonly config: OllamaConfig;

  constructor(config: OllamaConfig) {
    super();
    this.config = config;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const model = request.model ?? this.config.model ?? DEFAULT_MODEL;
    const prompt = typeof request.prompt === "string" ? request.prompt : request.prompt.template;

    const body: Record<string, unknown> = {
      model,
      prompt,
      stream: false,
      options: {
        num_predict: 4096,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 30000);

    try {
      const response = await fetch(this.config.baseUrl ?? DEFAULT_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 400) {
        const err = await response.json().catch(() => ({}));
        throw new InvalidRequestError((err as { error?: string }).error ?? "Bad request");
      }
      if (!response.ok) {
        throw new ProviderUnavailableError("ollama");
      }

      const data = (await response.json()) as {
        response?: string;
      };
      const content = data.response ?? "";

      return createGenerateResponse(content, "ollama", model);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async health(): Promise<boolean> {
    try {
      const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL;
      const healthUrl = baseUrl.replace("/api/generate", "");
      const response = await fetch(`${healthUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}