import type { AIProvider, AIProviderCapability, GenerateRequest, GenerateResponse } from "./types.js";

function createMockProvider(id: string, name: string): AIProvider {
  return {
    metadata: {
      id,
      name,
      version: "mock",
      capabilities: ["generate", "health", "json-mode", "function-calling", "reasoning", "long-context"],
      capabilityMatrix: {
        supportsStreaming: true,
        supportsJsonMode: true,
        supportsFunctionCalling: true,
        supportsImages: false,
        supportsReasoning: true,
        supportsEmbeddings: false,
        supportsVision: false,
        supportsLongContext: true,
      },
    },
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
      const prompt = typeof request.prompt === "string" ? request.prompt : request.prompt.template;
      return {
        output: `mock:${name}:${prompt}`,
        provider: id,
        model: request.model,
      };
    },
    async health(): Promise<boolean> {
      return true;
    },
    capabilities(): AIProviderCapability[] {
      return ["generate", "health", "json-mode", "function-calling", "reasoning", "long-context"];
    },
    capabilityMatrix() {
      return {
        supportsStreaming: true,
        supportsJsonMode: true,
        supportsFunctionCalling: true,
        supportsImages: false,
        supportsReasoning: true,
        supportsEmbeddings: false,
        supportsVision: false,
        supportsLongContext: true,
      };
    },
  };
}

export const OpenAIProvider = createMockProvider("openai", "OpenAI");
export const AnthropicProvider = createMockProvider("anthropic", "Anthropic");
export const GeminiProvider = createMockProvider("gemini", "Gemini");
export const OpenRouterProvider = createMockProvider("openrouter", "OpenRouter");
export const OllamaProvider = createMockProvider("ollama", "Ollama");
