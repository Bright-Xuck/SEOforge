import { describe, expect, it } from "vitest";
import { AIEngine } from "./engine.js";
import { OpenAIProvider } from "./providers/openai.js";

describe("AIEngine", () => {
  it("creates an engine with a provider", () => {
    const provider = new OpenAIProvider({ apiKey: "test-key" });
    const engine = new AIEngine(provider);
    expect(engine).toBeInstanceOf(AIEngine);
  });

  it("returns capabilities from provider", () => {
    const provider = new OpenAIProvider({ apiKey: "test-key" });
    const engine = new AIEngine(provider);
    const caps = engine.capabilities();
    expect(caps).toContain("generate");
    expect(caps).toContain("health");
  });

  it("returns capability matrix from provider", () => {
    const provider = new OpenAIProvider({ apiKey: "test-key" });
    const engine = new AIEngine(provider);
    const matrix = engine.capabilityMatrix();
    expect(matrix.supportsStreaming).toBe(true);
    expect(matrix.supportsJSON).toBe(true);
  });

  it("health check returns false when provider is not available", async () => {
    const provider = new OpenAIProvider({ apiKey: "test-key" });
    const engine = new AIEngine(provider);
    const healthy = await engine.health();
    expect(healthy).toBe(false);
  });
});