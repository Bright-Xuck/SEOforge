import { describe, expect, it } from "vitest";
import { AgentRegistry, SEOAgent } from "./index.js";

describe("AgentRegistry", () => {
  it("registers, resolves, lists, and validates agents", () => {
    const registry = new AgentRegistry();
    registry.register(SEOAgent);

    expect(registry.exists("seo-agent")).toBe(true);
    expect(registry.get("seo-agent").metadata.name).toBe("SEO Agent");
    expect(registry.list()).toHaveLength(1);
    expect(registry.validate(SEOAgent).valid).toBe(true);
  });
});
