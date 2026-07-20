// @forge/content-intelligence
// Tests for provider-independent selectors (Hardening Pass).

import { describe, expect, it } from "vitest";
import { SelectorBuilder } from "../src/selector/builder.js";

describe("SelectorBuilder", () => {
  it("builds a section selector describing WHAT not HOW", () => {
    const selector = SelectorBuilder.section("hero");
    expect(selector.type).toBe("section");
    expect(selector.kind).toBe("hero");
    expect(selector.css).not.toMatch(/wordpress|wp-|provider/i);
  });

  it("builds a block selector from a stable id", () => {
    const selector = SelectorBuilder.block("hero-block-0");
    expect(selector.type).toBe("block");
    expect(selector.sectionId).toBe("hero-block-0");
    expect(selector.css).not.toMatch(/wordpress|wp-|provider/i);
  });

  it("builds stable-id selectors via helpers", () => {
    const section = SelectorBuilder.buildSectionSelector("faq-1");
    const block = SelectorBuilder.buildBlockSelector("faq-1-block-0");
    expect(section.css).toContain("faq-1");
    expect(block.css).toContain("faq-1-block-0");
    expect(section.css).not.toMatch(/wordpress|wp-|provider/i);
    expect(block.css).not.toMatch(/wordpress|wp-|provider/i);
  });

  it("never emits provider-specific strings", () => {
    const built = SelectorBuilder.heading(2);
    expect(built.css).not.toMatch(/wordpress|wp-|provider/i);
  });
});
