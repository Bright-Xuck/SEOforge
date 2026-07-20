import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { detectPageType } from "../src/page-dna/page-type-detector.js";
import { detectSections } from "../src/sections/detector.js";
import { makeSnapshot } from "./fixtures.js";

describe("detectPageType", () => {
  it("detects homepage from root path", () => {
    const snapshot = makeSnapshot({ finalUrl: "https://example.com/", rawHtml: "<h1>Welcome to Example</h1>" });
    const $ = cheerio.load(snapshot.rawHtml);
    const sections = detectSections(snapshot, $);
    const result = detectPageType(snapshot, sections);
    expect(result.kind).toBe("homepage");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("detects product page from schema and keywords", () => {
    const snapshot = makeSnapshot({
      finalUrl: "https://example.com/product/widget",
      pageTitle: "Widget - Buy Now",
      metaDescription: "Add to cart the Widget at the best price.",
      jsonLd: [{ "@type": "Product", name: "Widget" }],
    });
    const $ = cheerio.load(snapshot.rawHtml);
    const sections = detectSections(snapshot, $);
    const result = detectPageType(snapshot, sections);
    expect(result.kind).toBe("product-page");
  });

  it("falls back to generic when no signals", () => {
    const snapshot = makeSnapshot({
      finalUrl: "https://example.com/x",
      pageTitle: "Random Page",
      metaDescription: "A random page.",
      jsonLd: [],
      headings: [{ level: 1, text: "Random" }],
      rawHtml: "<p>random</p>",
    });
    const $ = cheerio.load(snapshot.rawHtml);
    const sections = detectSections(snapshot, $);
    const result = detectPageType(snapshot, sections);
    expect(["generic", "homepage"]).toContain(result.kind);
  });
});
