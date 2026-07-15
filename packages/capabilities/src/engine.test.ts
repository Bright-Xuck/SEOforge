import { describe, it, expect } from "vitest";
import { analyzeWebsite } from "./engine.js";
import {
  MISSING_TITLE,
  MISSING_META_DESCRIPTION,
  MISSING_H1,
  ROBOTS_NOINDEX,
  MISSING_LANG,
  MISSING_JSONLD,
} from "./rules/index.js";
import type { WebsiteSnapshot } from "@forge/core";

// Helper to create a minimal snapshot for testing
function createSnapshot(overrides: Partial<WebsiteSnapshot> = {}): WebsiteSnapshot {
  const defaults = {
    originalUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    statusCode: 200,
    responseHeaders: {},
    pageTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    language: "",
    charset: "utf-8",
    favicon: "",
    robots: { noindex: false, nofollow: false, noarchive: false, nosnippet: false },
    headings: [],
    images: [],
    links: [],
    scripts: [],
    stylesheets: [],
    jsonLd: [],
    openGraph: {},
    twitterCard: {},
    rawHtml: "test" as WebsiteSnapshot["rawHtml"],
  };
  return { ...defaults, ...overrides } as WebsiteSnapshot;
}

describe("analyzeWebsite", () => {
  it("returns summary with correct structure", () => {
    const snapshot = createSnapshot({
      pageTitle: "Test Page Title",
      metaDescription: "Test meta description.",
      links: [],
    });

    const report = analyzeWebsite(snapshot);

    expect(report.url).toBe("https://example.com/");
    expect(report.analyzedAt).toBeDefined();
    expect(report.findings).toBeInstanceOf(Array);
    expect(report.summary.total).toBeGreaterThanOrEqual(0);
    expect(report.summary.bySeverity).toHaveProperty("critical");
    expect(report.summary.bySeverity).toHaveProperty("high");
    expect(report.summary.bySeverity).toHaveProperty("medium");
    expect(report.summary.bySeverity).toHaveProperty("low");
    expect(report.summary.bySeverity).toHaveProperty("info");
  });

  it("detects missing title", () => {
    const finding = MISSING_TITLE.analyze(createSnapshot({ pageTitle: "" }))[0];
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("critical");
  });

  it("detects missing meta description", () => {
    const finding = MISSING_META_DESCRIPTION.analyze(createSnapshot({ metaDescription: "" }))[0];
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("high");
  });

  it("detects missing H1", () => {
    const finding = MISSING_H1.analyze(createSnapshot({ headings: [] }))[0];
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("high");
  });

  it("detects noindex directive", () => {
    const finding = ROBOTS_NOINDEX.analyze(
      createSnapshot({
        robots: { noindex: true, nofollow: false, noarchive: false, nosnippet: false },
      }),
    )[0];
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("critical");
  });

  it("detects missing language", () => {
    const finding = MISSING_LANG.analyze(createSnapshot({ language: "" }))[0];
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("low");
  });

  it("detects missing JSON-LD", () => {
    const finding = MISSING_JSONLD.analyze(createSnapshot({ jsonLd: [] }))[0];
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("info");
  });

  it("returns summary with correct counts", () => {
    const report = analyzeWebsite(
      createSnapshot({
        pageTitle: "",
        metaDescription: "",
        headings: [],
        jsonLd: [],
      }),
    );

    expect(report.summary.total).toBeGreaterThan(0);
    expect(report.summary.bySeverity.critical).toBeGreaterThan(0);
  });
});
