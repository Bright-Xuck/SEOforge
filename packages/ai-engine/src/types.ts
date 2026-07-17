import type { PromptDefinition } from "@forge/prompt-registry";

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
  readonly supportsJsonMode: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly supportsImages: boolean;
  readonly supportsReasoning: boolean;
  readonly supportsEmbeddings: boolean;
  readonly supportsVision: boolean;
  readonly supportsLongContext: boolean;
}

export interface AIProviderMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: AIProviderCapability[];
  readonly capabilityMatrix?: AIProviderCapabilities;
}

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

export interface AIProvider {
  readonly metadata: AIProviderMetadata;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream?(request: GenerateRequest): AsyncIterable<StreamChunk>;
  embed?(input: string): Promise<number[]>;
  health(): Promise<boolean>;
  capabilities(): AIProviderCapability[];
  capabilityMatrix?(): AIProviderCapabilities;
}
