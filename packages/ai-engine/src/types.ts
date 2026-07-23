import type { PromptDefinition } from "@forge/prompt-registry";

// ─── Provider Capabilities ────────────────────────────────────────────

export type AIProviderCapability =
  | "generate"
  | "stream"
  | "embed"
  | "health"
  | "json-mode"
  | "function-calling"
  | "images"
  | "reasoning"
  | "embeddings"
  | "vision"
  | "long-context";

export interface AIProviderCapabilities {
  readonly supportsStreaming: boolean;
  readonly supportsSystemPrompts: boolean;
  readonly supportsJSON: boolean;
  readonly supportsVision: boolean;
  readonly supportsReasoning: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly supportsLargeContext: boolean;
  readonly maxContextTokens: number;
  readonly maxOutputTokens: number;
  readonly costTier: "free" | "low" | "medium" | "high";
  readonly speedTier: "slow" | "medium" | "fast";
}

export interface AIProviderMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: AIProviderCapability[];
  readonly capabilityMatrix?: AIProviderCapabilities;
}

// ─── Request / Response Models ────────────────────────────────────────

export interface AIRequest {
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly context?: Record<string, unknown>;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly expectedFormat?: "text" | "json" | "html" | "markdown";
  readonly metadata?: Record<string, string>;
  readonly projectId?: string;
  readonly sessionId?: string;
  readonly traceId?: string;
}

export interface AIResponse {
  readonly content: string;
  readonly provider: string;
  readonly model: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly finishReason: "stop" | "length" | "content-filter" | "error";
  readonly latency: number;
  readonly costEstimate?: number;
  readonly warnings?: string[];
  readonly rawResponseMetadata?: Record<string, unknown>;
}

// ─── Legacy Compatibility Types ───────────────────────────────────────

export interface GenerateRequest {
  readonly prompt: PromptDefinition | string;
  readonly variables?: Record<string, string | number | boolean>;
  readonly model?: string;
}

export interface GenerateResponse {
  readonly output: string;
  readonly provider: string;
  readonly model?: string;
}

export interface StreamChunk {
  readonly content: string;
}

// ─── Provider Interface ───────────────────────────────────────────────

export interface AIProvider {
  readonly metadata: AIProviderMetadata;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream?(request: GenerateRequest): AsyncIterable<StreamChunk>;
  embed?(input: string): Promise<number[]>;
  health(): Promise<boolean>;
  capabilities(): AIProviderCapability[];
  capabilityMatrix?(): AIProviderCapabilities;
}