import { describe, expect, it } from "vitest";
import { HomepageAnalyzer, HomepageDetector } from "./index.js";

describe("HomepageAnalyzer", () => {
  it("produces deterministic findings", () => {
    const detector = new HomepageDetector();
    const analyzer = new HomepageAnalyzer();
    const snapshot = {
      finalUrl: "https://example.com/",
      pageTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      robots: { noindex: false, nofollow: false, noarchive: false, nosnippet: false },
      headings: [],
      jsonLd: [],
      rawHtml: "<html><body><footer></footer></body></html>",
    } as never;
    const context = detector.detectContext("demo", snapshot, "https://example.com", {
      project: "demo",
      knowledge: { project: "demo", primaryKeywords: ["home"], brand: "Demo", products: [], services: [], competitors: [], languages: [], websiteStructure: [], contentCategories: [], secondaryKeywords: [], businessGoals: [], providerInformation: [], installedPlugins: [], taxonomies: [], schemas: [], version: { version: 1, createdAt: "", updatedAt: "" } } as never,
      memorySummary: { project: "demo", total: 0, byType: {} },
    } as never);
    const analysis = analyzer.analyze(context);
    expect(analysis.findings.length).toBeGreaterThan(0);
  });
});
