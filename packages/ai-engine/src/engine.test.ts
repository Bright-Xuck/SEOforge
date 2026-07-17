import { describe, expect, it } from "vitest";
import { AIEngine, OpenAIProvider } from "./index.js";

describe("AIEngine", () => {
  it("generates mock output", async () => {
    const engine = new AIEngine(OpenAIProvider);
    const result = await engine.generate({ prompt: "Hello" });
    expect(result.output).toContain("mock:OpenAI");
  });
});
