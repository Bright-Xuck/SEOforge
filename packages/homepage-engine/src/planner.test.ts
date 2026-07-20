import { describe, expect, it } from "vitest";
import { HomepageAnalyzer, HomepageDetector, HomepagePlanner } from "./index.js";

describe("HomepagePlanner", () => {
  it("builds a homepage plan and preview", () => {
    const detector = new HomepageDetector();
    const analyzer = new HomepageAnalyzer();
    const planner = new HomepagePlanner();
    const snapshot = {
      finalUrl: "https://example.com/",
      originalUrl: "https://example.com/",
      statusCode: 200,
      pageTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      language: "en",
      charset: "utf-8",
      favicon: "/favicon.ico",
      robots: { noindex: false, nofollow: false, noarchive: false, nosnippet: false, index: true, follow: true },
      headings: [],
      images: [],
      links: [],
      scripts: [],
      stylesheets: [],
      jsonLd: [],
      openGraph: {},
      twitterCard: {},
      rawHtml: "<html><body><footer></footer></body></html>",
    } as never;
    const context = detector.detectContext("demo", snapshot, "https://example.com", {
      project: "demo",
      knowledge: { project: "demo", primaryKeywords: ["home"], brand: "Demo", products: [], services: [], competitors: [], languages: [], websiteStructure: [], contentCategories: [], secondaryKeywords: [], businessGoals: [], providerInformation: [], installedPlugins: [], taxonomies: [], schemas: [], version: { version: 1, createdAt: "", updatedAt: "" } } as never,
      memorySummary: { project: "demo", total: 0, byType: {} },
    } as never);
    const analysis = analyzer.analyze(context);
    const plan = planner.plan(context, analysis);
    const preview = planner.preview(plan);
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(preview.length).toBe(plan.actions.length);
  });
});
