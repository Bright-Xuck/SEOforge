import { describe, expect, it } from "vitest";
import { PromptRegistry } from "./index.js";

describe("PromptRegistry", () => {
  it("registers, renders, and validates prompts", () => {
    const registry = new PromptRegistry();
    registry.register({
      id: "skill.meta",
      name: "Meta Prompt",
      template: "Write meta.",
      variables: ["context"],
      versions: [{ version: "1.0.0", createdAt: "2026-07-17T00:00:00.000Z" }],
      metadata: {
        category: "content",
        tags: ["seo"],
        defaultProvider: "openai",
      },
    });
    expect(registry.get("skill.meta").name).toBe("Meta Prompt");
    expect(registry.list()).toHaveLength(1);
    expect(registry.validate(registry.get("skill.meta")).valid).toBe(true);
    expect(registry.render("skill.meta", { context: "site" })).toBe("Write meta.");
  });
});
