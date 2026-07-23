import type { AIProvider, AIProviderCapabilities, AIProviderCapability, AIProviderMetadata, GenerateRequest, GenerateResponse } from "../types.js";

/**
 * Base provider configuration shared across all implementations.
 */
export interface BaseProviderConfig {
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly retryDelay: number;
}

/**
 * Creates a standard capability matrix for a provider.
 */
export function createCapabilityMatrix(overrides: Partial<AIProviderCapabilities>): AIProviderCapabilities {
  return {
    supportsStreaming: false,
    supportsSystemPrompts: false,
    supportsJSON: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsFunctionCalling: false,
    supportsLargeContext: false,
    maxContextTokens: 4096,
    maxOutputTokens: 1024,
    costTier: "medium",
    speedTier: "medium",
    ...overrides,
  };
}

/**
 * Builds a standard set of capability strings from a capability matrix.
 */
export function capabilitiesFromMatrix(matrix: AIProviderCapabilities): AIProviderCapability[] {
  const caps: AIProviderCapability[] = ["generate", "health"];
  if (matrix.supportsStreaming) caps.push("stream");
  if (matrix.supportsJSON) caps.push("json-mode");
  if (matrix.supportsVision) caps.push("vision");
  if (matrix.supportsReasoning) caps.push("reasoning");
  if (matrix.supportsFunctionCalling) caps.push("function-calling");
  if (matrix.supportsLargeContext) caps.push("long-context");
  return caps;
}

/**
 * Makes an HTTP request to an AI provider API.
 */
export async function makeProviderRequest(
  url: string,
  body: Record<string, unknown>,
  apiKey?: string,
  timeout = 30000,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Creates a standard GenerateResponse from provider output.
 */
export function createGenerateResponse(
  content: string,
  provider: string,
  model: string,
  _promptTokens = 0,
  _completionTokens = 0,
): GenerateResponse {
  return {
    output: content,
    provider,
    model,
  };
}

/**
 * Abstract base class for AI providers.
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly metadata: AIProviderMetadata;

  abstract generate(request: GenerateRequest): Promise<GenerateResponse>;

  abstract health(): Promise<boolean>;

  capabilities(): AIProviderCapability[] {
    return this.metadata.capabilities;
  }

  capabilityMatrix(): AIProviderCapabilities {
    return this.metadata.capabilityMatrix ?? createCapabilityMatrix({});
  }
}