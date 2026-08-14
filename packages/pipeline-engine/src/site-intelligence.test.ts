import { describe, it, expect } from "vitest";
import type { WebsiteSnapshot } from "@forge/core";
import { createSiteIntelligenceStep } from "./adapters.js";
import { createSiteIntelligencePipeline } from "./default-pipelines.js";
import { executePipeline } from "./engine.js";

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
    robots: { noindex: false, nofollow: false, index: true, follow: true },
    headings: [
      { level: 1, text: title },
      { level: 2, text: "Features" },
      { level: 2, text: "Pricing" },
    ],
    images: [],
    links: [{ href: "/pricing", text: "Pricing", isInternal: true }],
    scripts: [],
    stylesheets: [],
    jsonLd: [],
    openGraph: {},
    twitterCard: {},
    rawHtml: `<!doctype html><html><head><title>${title}</title></head><body>
      <section class="hero"><h1>${title}</h1><p>${title} helps teams work better.</p></section>
      <section class="features"><h2>Features</h2><p>${title} features include everything a team needs to get started today.</p></section>
      <section class="pricing"><h2>Pricing</h2><p>${title} pricing starts at a low monthly rate for every team.</p></section>
    </body></html>`,
  };
}

describe("site-intelligence pipeline step", () => {
  it("runs the site-intelligence step with site snapshots in context", async () => {
    const step = createSiteIntelligenceStep();
    const context: { siteSnapshots: WebsiteSnapshot[]; outputs?: Record<string, unknown>; variables?: Record<string, unknown> } = {
      siteSnapshots: [
        makeSnapshot("https://example.com/", "Acme CRM"),
        makeSnapshot("https://example.com/pricing", "Acme CRM Pricing"),
      ],
    };
    const output = await step.execute(context as never);

    const report = output as {
      model: { pageCount: number };
      topicGraph: { topicCount: number };
      authority: { overall: number; diagnostic: boolean };
      summary: { pageCount: number };
    };
    expect(report.model.pageCount).toBe(2);
    expect(report.topicGraph.topicCount).toBeGreaterThan(0);
    expect(report.authority.diagnostic).toBe(true);
    expect(report.authority.overall).toBeGreaterThanOrEqual(0);
    expect(report.summary.pageCount).toBe(2);
  });

  it("throws when no snapshots are available", () => {
    const step = createSiteIntelligenceStep();
    expect(() => step.execute({} as never)).toThrow(/siteSnapshots|snapshot/i);
  });

  it("produces a runnable default pipeline", async () => {
    // The default pipeline reads one page and runs site intelligence on it.
    const pipeline = createSiteIntelligencePipeline("https://example.com");
    expect(pipeline.steps.map((step) => step.id)).toEqual(["website-reader", "site-intelligence"]);
  });

  it("executes through the pipeline engine with a pre-seeded snapshot", async () => {
    const pipeline = createSiteIntelligencePipeline("https://example.com");
    const context = {
      siteSnapshots: [makeSnapshot("https://example.com/", "Acme CRM")],
    };
    const result = await executePipeline(pipeline, context as never);
    expect(result.status).toBe("success");
    expect(result.stepsExecuted).toContain("site-intelligence");
    const report = result.outputs["site-intelligence"] as {
      summary: { pageCount: number };
    };
    expect(report.summary.pageCount).toBe(1);
  });
});
