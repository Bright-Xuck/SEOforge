// @forge/content-intelligence
// Tests for the deterministic page-priority ranking.

import { describe, expect, it } from "vitest";
import { rankPagePriorities } from "../src/site/page-priority.js";
import type {
  SiteContentModel,
  SiteIntelligenceReport,
  SitePageEntry,
} from "../src/site/types.js";

function makePage(overrides: Partial<SitePageEntry> = {}): SitePageEntry {
  return {
    url: "https://example.com/page",
    title: "Example Page",
    pageType: { kind: "generic", confidence: 1, evidence: [] },
    intent: { primary: "informational", scores: {}, evidence: [] },
    audience: { level: "general", confidence: 1, signals: [] },
    contentLength: 1000,
    topics: [],
    entities: [],
    sections: [],
    missingSections: [],
    internalLinks: [],
    externalLinkCount: 0,
    quality: { overall: 90 } as never,
    metadata: {
      hasTitle: true,
      hasMetaDescription: true,
      hasCanonical: true,
    } as never,
    graph: {} as never,
    analyzedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeReport(
  pages: SitePageEntry[],
  inboundLinks: Record<string, number> = {},
  opportunities: Array<{ sourcePage?: string; targetPage?: string }> = [],
): SiteIntelligenceReport {
  return {
    refreshCandidates: [],
    model: { pages, inboundLinks } as unknown as SiteContentModel,
    internalLinkOpportunities: opportunities,
  } as unknown as SiteIntelligenceReport;
}

describe("rankPagePriorities", () => {
  it("ranks thin, under-linked pages ahead of healthy pages", () => {
    const healthy = makePage({
      url: "https://example.com/healthy",
      title: "Healthy",
      contentLength: 1200,
    });
    const thin = makePage({
      url: "https://example.com/thin",
      title: "Thin",
      contentLength: 120,
    });

    const priorities = rankPagePriorities(
      makeReport([healthy, thin], {
        "https://example.com/healthy": 4,
        "https://example.com/thin": 0,
      }),
    );

    expect(priorities.map((p) => p.pageUrl)).toEqual([
      "https://example.com/thin",
      "https://example.com/healthy",
    ]);
    expect(priorities[0].score).toBeGreaterThan(priorities[1].score);
    expect(priorities[0].reasons).toContain("Thin content (120 words) (+15)");
    expect(priorities[0].reasons).toContain("No inbound internal links (+10)");
  });

  it("adds a commercial page-type point and explains it", () => {
    const page = makePage({
      url: "https://example.com/services/seo",
      pageType: { kind: "service-page", confidence: 1, evidence: [] },
    });

    const [priority] = rankPagePriorities(makeReport([page]));
    expect(priority.pageType).toBe("service-page");
    expect(priority.reasons).toContain('Commercial page type "service-page" (+8)');
  });

  it("is deterministic and breaks ties by URL", () => {
    const a = makePage({ url: "https://example.com/b" });
    const b = makePage({ url: "https://example.com/a" });

    const first = rankPagePriorities(makeReport([a, b])).map((p) => p.pageUrl);
    const second = rankPagePriorities(makeReport([b, a])).map((p) => p.pageUrl);
    expect(first).toEqual(["https://example.com/a", "https://example.com/b"]);
    expect(second).toEqual(first);
  });

  it("counts internal-link opportunities per source page", () => {
    const page = makePage({ url: "https://example.com/blog/post" });
    const [priority] = rankPagePriorities(
      makeReport([page], {}, [
        { sourcePage: "https://example.com/blog/post" },
        { sourcePage: "https://example.com/blog/post" },
        { sourcePage: "https://example.com/blog/post" },
        { sourcePage: "https://example.com/blog/post" },
      ]),
    );

    expect(priority.signals.internalLinkOpportunityCount).toBe(4);
    expect(priority.reasons.some((reason) => reason.startsWith("4 internal-link opportunity"))).toBe(
      true,
    );
  });
});
