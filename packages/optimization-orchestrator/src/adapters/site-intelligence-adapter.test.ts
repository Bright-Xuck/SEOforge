import { describe, it, expect } from "vitest";
import type { WebsiteSnapshot } from "@forge/core";
import { createSiteIntelligenceEngine } from "./site-intelligence-adapter.js";
import { createContext } from "../context.js";
import { getWorkflow } from "../workflow.js";

function makeSnapshot(url: string, title: string): WebsiteSnapshot {
  return {
    originalUrl: url,
    finalUrl: url,
    statusCode: 200,
    responseHeaders: {},
    pageTitle: title,
    metaDescription: `${title} for teams.`,
    canonicalUrl: url,
    language: "en",
    charset: "utf-8",
    favicon: "/favicon.ico",
    robots: { noindex: false, nofollow: false, noarchive: false, nosnippet: false },
    headings: [{ level: 1, text: title }],
    images: [],
    links: [],
    scripts: [],
    stylesheets: [],
    jsonLd: [],
    openGraph: {},
    twitterCard: {},
    rawHtml: `<!doctype html><html><head><title>${title}</title></head><body>
      <section class="hero"><h1>${title}</h1><p>${title} helps teams work better.</p></section>
      <section class="faq"><h2>FAQ</h2><p>Frequently asked questions about ${title}.</p></section>
    </body></html>` as never,
  };
}

describe("createSiteIntelligenceEngine", () => {
  it("exposes site-level opportunities into the orchestrator context without executing", async () => {
    const engine = createSiteIntelligenceEngine();
    const context = createContext("ctx-1", "acme", getWorkflow("homepage-optimization"));
    context.websiteSnapshots = [
      makeSnapshot("https://example.com/", "Acme CRM"),
      makeSnapshot("https://example.com/features", "Acme CRM Features"),
    ];

    const result = await engine.execute(context as never);
    const output = result as typeof context;

    expect(output.siteIntelligence).toBeTruthy();
    expect(Array.isArray(output.siteOpportunities)).toBe(true);
    expect(Array.isArray(output.refreshCandidates)).toBe(true);
    expect(Array.isArray(output.internalLinkOpportunities)).toBe(true);
    expect(Array.isArray(output.topicCoverageGaps)).toBe(true);

    const report = output.siteIntelligence as { authority: { diagnostic: boolean } };
    expect(report.authority.diagnostic).toBe(true);
  });

  it("is a no-op when no snapshots are available", async () => {
    const engine = createSiteIntelligenceEngine();
    const context = createContext("ctx-2", "acme", getWorkflow("homepage-optimization"));
    const result = await engine.execute(context as never);
    expect(result.siteIntelligence).toBeUndefined();
    expect(result.siteOpportunities).toBeUndefined();
  });

  it("registers as the site-intelligence engine type", () => {
    expect(createSiteIntelligenceEngine().type).toBe("site-intelligence");
  });
});
