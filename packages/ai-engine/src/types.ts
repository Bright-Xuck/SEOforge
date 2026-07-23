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

// ─── Session Object ───────────────────────────────────────────────────

export interface AISession {
  readonly id: string;
  readonly projectId?: string;
  readonly agentId?: string;
  readonly missionId?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly status: "active" | "completed" | "failed" | "cancelled";
  readonly metadata?: Record<string, string>;
}

export interface AISessionContext {
  readonly session: AISession;
  readonly projectProfile?: Record<string, unknown>;
  readonly knowledgeGraph?: Record<string, unknown>;
  readonly memoryTimeline?: Record<string, unknown>;
  readonly mission?: string;
  readonly strategy?: string;
  readonly pageDNA?: Record<string, unknown>;
  readonly section?: string;
  readonly brandProfile?: Record<string, unknown>;
  readonly competitorSnapshot?: Record<string, unknown>;
  readonly reviewSummary?: string;
  readonly previousApprovedPatches?: string[];
}

// ─── Health Tracking ──────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface AIHealthCheck {
  readonly status: HealthStatus;
  readonly latency: number;
  readonly lastChecked: number;
  readonly consecutiveFailures: number;
  readonly errorRate: number;
  readonly message?: string;
}

export interface ProviderHealthRecord {
  readonly providerId: string;
  readonly checks: AIHealthCheck[];
  readonly uptimePercentage: number;
  readonly averageLatency: number;
  readonly lastError?: string;
  readonly lastErrorAt?: number;
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

// ─── Cost Tracking ────────────────────────────────────────────────────

export interface CostBreakdown {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCost: number;
  readonly currency: string;
}

export interface CostEntry {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly projectId?: string;
  readonly missionId?: string;
  readonly sessionId?: string;
  readonly category?: string;
  readonly section?: string;
  readonly tokens: number;
  readonly estimatedCost: number;
  readonly timestamp: number;
}

export interface CostSummary {
  readonly totalCost: number;
  readonly totalTokens: number;
  readonly byProvider: Record<string, number>;
  readonly byProject: Record<string, number>;
  readonly byMission: Record<string, number>;
  readonly byCategory: Record<string, number>;
  readonly bySection: Record<string, number>;
  readonly dailyTotal: number;
  readonly monthlyTotal: number;
  readonly yearlyTotal: number;
  readonly currency: string;
  readonly periodStart: number;
  readonly periodEnd: number;
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