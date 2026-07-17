import { describe, expect, it } from "vitest";
import { PipelineRegistry } from "./pipeline-registry.js";

describe("PipelineRegistry", () => {
  it("registers and resolves pipelines", () => {
    const registry = new PipelineRegistry();
    const pipeline = {
      id: "read",
      name: "Read",
      version: "0.8.0",
      description: "Reads a website snapshot.",
      steps: [],
    };
    registry.registerPipeline(pipeline);
    expect(registry.resolvePipeline("read")).toBe(pipeline);
    expect(registry.listPipelines()).toHaveLength(1);
  });
});
