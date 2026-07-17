import { describe, expect, it } from "vitest";
import { executePipeline, createReadPipeline, createAnalyzePipeline } from "./index.js";

describe("executePipeline", () => {
  it("runs a single-step pipeline", async () => {
    const result = await executePipeline(createReadPipeline("https://example.com"));
    expect(result.status).toBe("success");
    expect(result.stepsExecuted).toEqual(["website-reader"]);
    expect(result.outputs["website-reader"]).toBeTruthy();
  });

  it("runs dependent steps sequentially", async () => {
    const result = await executePipeline(createAnalyzePipeline("https://example.com"));
    expect(result.stepsExecuted).toEqual(["website-reader", "homepage-analysis"]);
    expect(result.outputs["homepage-analysis"]).toBeTruthy();
  });
});
