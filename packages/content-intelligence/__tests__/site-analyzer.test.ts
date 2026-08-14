import { describe, it, expect } from "vitest";
import {
  analyzeSite,
  analyzeSiteFromPages,
  buildSitePageEntry,
  buildContentGraph,
  buildPageDNAFromSnapshot,
  createSiteAnalysisMemoryEvent,
  type WebsiteSnapshot,
  type UniversalPageLike,
  type SiteAnalysisEvent,
} from "../src/index.js";
import { load } from "cheerio";
import { makeAcmeSite, BASE_URL, FIXED_ANALYZED_AT } from "./site-fixtures.js";

function makeUniversalPage(url: string, title: string, sectionKinds: string[]): UniversalPageLike {
  return {
    url,
    title,
    builder: { builderType: "gutenberg", confidence: 0.9 },
    regions: [
      {
        kind: "main",
        sections: sectionKinds.map((kind) => ({
          kind,
          blocks: [{ kind: "paragraph-block" }, { kind: "heading-block" }],
        })),
      },
    ],
  };
}

describe("analyzeSite integration", () => {
  it("composes existing PageDNA and ContentGraph per page", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });

    // PageDNA is built per page through the existing engine.
    const home = report.model.pageLookup[`${BASE_URL}/`];
    expect(home).toBeTruthy();
    expect(home?.pageType.kind).toBeTruthy();
    expect(home?.topics.length).toBeGreaterThan(0);
    expect(home?.sections.length).toBeGreaterThan(0);

    // ContentGraph is composed per page.
    const graph = home?.graph;
    expect(graph).toBeTruthy();
    expect(graph?.nodeCount).toBeGreaterThan(0);
    expect(graph?.byType.page).toBe(1);

    // Deterministic: identical input produces identical output.
    const again = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    expect(JSON.stringify(report)).toBe(JSON.stringify(again));
  });

  it("consumes the Universal Page Model as the canonical structural source", () => {
    const snapshots = makeAcmeSite();
    const universalPages = snapshots.map((snapshot, index) =>
      makeUniversalPage(
        snapshot.finalUrl,
        snapshot.pageTitle,
        index === 0 ? ["hero", "features", "pricing", "faq"] : ["hero", "faq"],
      ),
    );
    const report = analyzeSite(snapshots, {
      baseUrl: BASE_URL,
      analyzedAt: FIXED_ANALYZED_AT,
      universalPages,
    });

    expect(report.context.structureSource).toBe("universal-page-model");
    const home = report.model.pageLookup[`${BASE_URL}/`];
    expect(home?.builder).toBe("gutenberg");
    expect(home?.blockCount).toBe(8); // 4 sections × 2 blocks
  });

  it("falls back to PageDNA detectors when no Universal Page is provided", () => {
    const report = analyzeSite(makeAcmeSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    expect(report.context.structureSource).toBe("page-dna-detectors");
  });

  it("applies knowledge and memory context", () => {
    const report = analyzeSite(makeAcmeSite(), {
      baseUrl: BASE_URL,
      analyzedAt: FIXED_ANALYZED_AT,
      knowledge: { brand: "Acme", products: ["Acme CRM"] },
      memory: { previousAnalysisCount: 3, lastAnalysisAt: "2026-07-01T00:00:00.000Z" },
    });
    expect(report.context.knowledgeApplied).toBe(true);
    expect(report.context.memoryApplied).toBe(true);
  });

  it("records site-level analysis events through the existing memory shape", () => {
    const report = analyzeSite(makeAcmeSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const event = createSiteAnalysisMemoryEvent("acme", report, {
      id: "site-analysis-test",
      timestamp: FIXED_ANALYZED_AT,
    });
    expect(event.type).toBe("site-analysis");
    expect(event.project).toBe("acme");
    expect(event.payload).toHaveProperty("summary");
    expect(event.payload).toHaveProperty("authority");
    expect((event.payload as Record<string, unknown>)["baseUrl"]).toBe(BASE_URL);

    // The event matches the MemoryEvent shape used by @forge/memory-engine.
    const typed: SiteAnalysisEvent = event;
    expect(typed.timestamp).toBe(FIXED_ANALYZED_AT);
  });

  it("exposes the full report surface", () => {
    const report = analyzeSite(makeAcmeSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    expect(report.model.pageCount).toBeGreaterThan(0);
    expect(report.topicGraph.topicCount).toBeGreaterThan(0);
    expect(report.clusters.length).toBeGreaterThan(0);
    expect(report.authority.overall).toBeGreaterThanOrEqual(0);
    expect(report.opportunities.length).toBeGreaterThanOrEqual(0);
    expect(report.internalLinkOpportunities.length).toBeGreaterThanOrEqual(0);
    expect(report.refreshCandidates.length).toBeGreaterThanOrEqual(0);
    expect(report.summary.pageCount).toBe(report.model.pageCount);
  });

  it("analyzeSiteFromPages accepts entries built by buildSitePageEntry", () => {
    const snapshots = makeAcmeSite();
    const entries = snapshots.map((snapshot) =>
      buildSitePageEntry(snapshot, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }),
    );
    const report = analyzeSiteFromPages(entries, { analyzedAt: FIXED_ANALYZED_AT });
    expect(report.context.pageLevelEngine).toBe("page-dna");
    expect(report.model.pageCount).toBe(snapshots.length);
  });

  it("uses the same deterministic page-level engines directly", () => {
    const first = makeAcmeSite()[0];
    expect(first).toBeTruthy();
    if (!first) throw new Error("missing fixture snapshot");
    const snapshot: WebsiteSnapshot = first;
    const $ = load(snapshot.rawHtml || "");
    const dna = buildPageDNAFromSnapshot(snapshot);
    const graph = buildContentGraph(snapshot, $);
    expect(dna.url).toBe(snapshot.finalUrl);
    expect(graph.nodeCount).toBeGreaterThan(0);
  });
});
