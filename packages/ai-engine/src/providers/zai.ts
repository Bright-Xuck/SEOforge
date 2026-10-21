import type { AIProviderMetadata, GenerateRequest, GenerateResponse } from "../types.js";
import { RateLimitError } from "../errors.js";
import { withRetry } from "../retry.js";
import { capabilitiesFromMatrix, createCapabilityMatrix, makeProviderRequest } from "./base.js";
import { OpenAIProvider } from "./openai.js";
import type { OpenAIConfig } from "./openai.js";

/**
 * Z.ai exposes an OpenAI-compatible chat completions API. Reuse the OpenAI
 * transport and only override the provider identity, endpoint and capabilities
 * so downstream reports name the provider correctly.
 */
export interface ZAIConfig extends Omit<OpenAIConfig, "baseUrl"> {
  readonly baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.z.ai/api/paas/v4/chat/completions";

/**
 * Verified against the live Z.ai endpoint. `glm-4.7-flash` was observed
 * returning intermittent 429/1305 responses and is intentionally not default.
 */
export const DEFAULT_ZAI_MODEL = "glm-4.5-flash";

const MATRIX = createCapabilityMatrix({
  supportsStreaming: true,
  supportsSystemPrompts: true,
  supportsJSON: true,
  supportsVision: false,
  supportsReasoning: true,
  supportsFunctionCalling: true,
  supportsLargeContext: true,
  maxContextTokens: 128000,
  maxOutputTokens: 8192,
  costTier: "free",
  speedTier: "fast",
});

export class ZAIProvider extends OpenAIProvider {
  readonly metadata: AIProviderMetadata = {
    id: "zai",
    name: "Z.ai",
    version: "1.0.0",
    capabilities: capabilitiesFromMatrix(MATRIX),
    capabilityMatrix: MATRIX,
  };

  constructor(config: ZAIConfig) {
    super({ ...config, baseUrl: config.baseUrl ?? DEFAULT_BASE_URL });
    this.zaiConfig = config;
  }

  private readonly zaiConfig: ZAIConfig;

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    // Z.ai's free tier is frequently overloaded and returns transient 429s.
    // Retry with backoff at the provider seam instead of failing the workflow.
    return withRetry(
      () => super.generate(request),
      { maxRetries: 5, baseDelay: 3000, maxDelay: 30000 },
      "zai",
    );
  }

  async health(): Promise<boolean> {
    try {
      return await withRetry(
        async () => {
          const response = await makeProviderRequest(
            this.zaiConfig.baseUrl ?? DEFAULT_BASE_URL,
            {
              model: this.zaiConfig.model ?? DEFAULT_ZAI_MODEL,
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 16,
            },
            this.zaiConfig.apiKey,
            this.zaiConfig.timeout ?? 30000,
          );
          if (response.status === 429 || response.status === 503) {
            throw new RateLimitError("zai");
          }
          return response.ok;
        },
        { maxRetries: 5, baseDelay: 3000, maxDelay: 30000 },
        "zai",
      );
    } catch {
      return false;
    }
  }
}
