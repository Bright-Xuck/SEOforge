import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { detectSections } from "../src/sections/detector.js";
import { makeRichSnapshot, makeSnapshot } from "./fixtures.js";

describe("detectSections", () => {
  it("detects present sections in a rich homepage", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const inventory = detectSections(snapshot, $);
    expect(inventory.present).toContain("hero");
    expect(inventory.present).toContain("features");
    expect(inventory.present).toContain("pricing");
    expect(inventory.present).toContain("testimonials");
    expect(inventory.present).toContain("faq");
    expect(inventory.present).toContain("footer");
    expect(inventory.present).toContain("navigation");
  });

  it("reports missing sections for a sparse page", () => {
    const snapshot = makeSnapshot({ rawHtml: "<html><body><h1>Hi</h1></body></html>" });
    const $ = cheerio.load(snapshot.rawHtml);
    const inventory = detectSections(snapshot, $);
    expect(inventory.present).not.toContain("faq");
    expect(inventory.missing).toContain("faq");
  });

  it("every section has a kind and present boolean", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const inventory = detectSections(snapshot, $);
    for (const section of inventory.sections) {
      expect(typeof section.kind).toBe("string");
      expect(typeof section.present).toBe("boolean");
      expect(section.confidence).toBeGreaterThanOrEqual(0);
    }
  });

  it("populates boundary fields for present sections", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const inventory = detectSections(snapshot, $);
    const hero = inventory.byId["hero"];
    expect(hero).toBeDefined();
    expect(hero?.present).toBe(true);
    expect(hero?.id).toBe("hero");
    expect(hero?.startNode).toBeTruthy();
    expect(hero?.endNode).toBeTruthy();
    expect(Array.isArray(hero?.containedNodes)).toBe(true);
    expect(hero?.containedNodes.length).toBeGreaterThan(0);
    expect(Array.isArray(hero?.childSections)).toBe(true);
  });
});
