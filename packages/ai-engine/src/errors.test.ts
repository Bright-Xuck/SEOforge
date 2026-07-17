import { describe, expect, it } from "vitest";
import { PromptRenderError, ProviderCapabilityError } from "./index.js";

describe("AI errors", () => {
  it("creates typed errors", () => {
    expect(new ProviderCapabilityError("missing capability").name).toBe("ProviderCapabilityError");
    expect(new PromptRenderError("render failed").code).toBe("AI_PROMPT_RENDER");
  });
});
