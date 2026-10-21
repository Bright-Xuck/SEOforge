import { ProviderCapabilityError, ProviderUnavailableError } from "./errors.js";
import { resolveRequestPrompt } from "./prompt-render.js";
import type { AIProvider, AIProviderCapability, AIProviderCapabilities, GenerateRequest, GenerateResponse } from "./types.js";

export class AIEngine {
  constructor(private readonly provider: AIProvider) {}

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    if (!(await this.health())) {
      throw new ProviderUnavailableError(this.provider.metadata.id);
    }
    return this.provider.generate(resolveRequestPrompt(request));
  }

  async health(): Promise<boolean> {
    return this.provider.health();
  }

  capabilities(): AIProviderCapability[] {
    return this.provider.capabilities();
  }

  capabilityMatrix(): AIProviderCapabilities {
    const matrix = this.provider.capabilityMatrix?.() ?? this.provider.metadata.capabilityMatrix;
    if (!matrix) {
      throw new ProviderCapabilityError(`Provider ${this.provider.metadata.id} does not declare a capability matrix.`);
    }
    return matrix;
  }
}
