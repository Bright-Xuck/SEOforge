// @forge/content-intelligence
// Tests for stable section ID generation (Hardening Pass).

import { describe, expect, it } from "vitest";
import { generateSectionId } from "../src/page-dna/id-generator.js";
import { detectSections } from "../src/sections/detector.js";
import { load as loadCheerio } from "cheerio";
import { makeRichSnapshot } from "./fixtures.js";

describe("generateSectionId", () => {
  it("emits bare kind for the first occurrence (index 0)", () => {
    expect(generateSectionId("hero", 0)).toBe("hero");
    expect(generateSectionId("faq", 0)).toBe("faq");
  });

  it("emits kind-N for subsequent occurrences (index >= 1)", () => {
    expect(generateSectionId("hero", 1)).toBe("hero-1");
    expect(generateSectionId("faq", 1)).toBe("faq-1");
    expect(generateSectionId("faq", 2)).toBe("faq-2");
    expect(generateSectionId("pricing", 1)).toBe("pricing-1");
    expect(generateSectionId("footer", 1)).toBe("footer-1");
  });
});

describe("detectSections stable ids", () => {
  it("assigns a stable id to every section", () => {
    const snapshot = makeRichSnapshot();
    const $ = loadCheerio(snapshot.rawHtml);
    const inventory = detectSections(snapshot, $);
    for (const section of inventory.sections) {
      expect(section.id).toBeTruthy();
      expect(section.id).toBe(generateSectionId(section.kind, 0));
    }
  });

  it("exposes sections by id", () => {
    const snapshot = makeRichSnapshot();
    const $ = loadCheerio(snapshot.rawHtml);
    const inventory = detectSections(snapshot, $);
    expect(inventory.byId["hero"]).toBeDefined();
    expect(inventory.byId["hero"]?.kind).toBe("hero");
  });
});
