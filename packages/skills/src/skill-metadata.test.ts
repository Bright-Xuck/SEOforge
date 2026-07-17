import { describe, expect, it } from "vitest";
import { GenerateSeoTitleSkill } from "./index.js";

describe("Skill metadata", () => {
  it("exposes structured metadata", () => {
    expect(GenerateSeoTitleSkill.supportedProviders).toContain("openai");
    expect(GenerateSeoTitleSkill.outputs).toContain("title");
    expect(GenerateSeoTitleSkill.promptId).toBe("skill.generate-title");
  });
});
