// @forge/ai-engine/request-fingerprint
// Generates deterministic fingerprints for AI requests to enable caching,
// deduplication, and traceability.

import { createHash } from "node:crypto";
import type { AIRequest } from "./types.js";

export interface FingerprintConfig {
  readonly includeTimestamp: boolean;
  readonly includeProvider: boolean;
  readonly includeModel: boolean;
}

export class RequestFingerprinter {
  private config: FingerprintConfig;

  constructor(config?: Partial<FingerprintConfig>) {
    this.config = {
      includeTimestamp: config?.includeTimestamp ?? false,
      includeProvider: config?.includeProvider ?? true,
      includeModel: config?.includeModel ?? true,
    };
  }

  /**
   * Generate a deterministic fingerprint for an AI request.
   */
  fingerprint(request: AIRequest, provider?: string, model?: string): string {
    const parts: Record<string, unknown> = {
      prompt: request.prompt,
      systemPrompt: request.systemPrompt ?? "",
      context: request.context ?? {},
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 4096,
      expectedFormat: request.expectedFormat ?? "text",
    };

    if (this.config.includeProvider && provider) {
      parts.provider = provider;
    }
    if (this.config.includeModel && model) {
      parts.model = model;
    }
    if (this.config.includeTimestamp && request.traceId) {
      parts.traceId = request.traceId;
    }

    const serialized = JSON.stringify(parts, Object.keys(parts).sort());
    return createHash("sha256").update(serialized).digest("hex");
  }

  /**
   * Quick fingerprint for caching (no provider/model needed).
   */
  cacheKey(request: AIRequest): string {
    const parts: Record<string, unknown> = {
      prompt: request.prompt,
      systemPrompt: request.systemPrompt ?? "",
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 4096,
    };
    const serialized = JSON.stringify(parts, Object.keys(parts).sort());
    return createHash("sha256").update(serialized).digest("hex");
  }
}