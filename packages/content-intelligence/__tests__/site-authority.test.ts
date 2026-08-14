import { describe, it, expect } from "vitest";
import { analyzeSite, analyzeSiteFromPages } from "../src/index.js";
import { buildSitePageEntry } from "../src/site/model.js";
import { makeAcmeSite, makeSparseSite, BASE_URL, FIXED_ANALYZED_AT } from "./site-fixtures.js";

describe("scoreSiteAuthority", () => {
  it("returns normalized diagnostic scores (0-100) with a diagnostic marker", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const authority = report.authority;

    expect(authority.diagnostic).toBe(true);
    expect(authority.overall).toBeGreaterThanOrEqual(0);
    expect(authority.overall).toBeLessThanOrEqual(100);

    for (const key of [
      "topicalCoverage",
      "semanticDepth",
      "supportingContent",
      "internalLinking",
      "entityCoverage",
      "contentCompleteness",
      "freshness",
    ] as const) {
      expect(authority[key]).toBeGreaterThanOrEqual(0);
      expect(authority[key]).toBeLessThanOrEqual(100);
      expect(typeof authority.basis[key]).toBe("string");
    }
  });

  it("scores a sparse site lower on internal linking than the rich site", () => {
    const acme = analyzeSite(makeAcmeSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }).authority;
    const sparse = analyzeSite(makeSparseSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }).authority;
    // Sparse sites have fewer page-to-page links and less supporting content.
    expect(sparse.internalLinking).toBeLessThanOrEqual(acme.internalLinking);
  });

  it("applies knowledge when known entities are provided", () => {
    const snapshots = makeAcmeSite();
    const withKnowledge = analyzeSite(snapshots, {
      baseUrl: BASE_URL,
      analyzedAt: FIXED_ANALYZED_AT,
      knowledge: { brand: "Acme", products: ["Acme CRM", "Acme CRM Pro"] },
    });
    expect(withKnowledge.context.knowledgeApplied).toBe(true);
    expect(withKnowledge.authority.entityCoverage).toBeGreaterThanOrEqual(0);
  });

  it("scores freshness relative to the analysis timestamp", () => {
    const snapshots = makeAcmeSite();
    // Entries analyzed long ago (2020) score low on freshness regardless of run date.
    const oldEntries = snapshots.map((snapshot) =>
      buildSitePageEntry(snapshot, { baseUrl: BASE_URL, analyzedAt: "2020-01-01T00:00:00.000Z" }),
    );
    const oldReport = analyzeSiteFromPages(oldEntries, { analyzedAt: FIXED_ANALYZED_AT });
    const freshReport = analyzeSiteFromPages(
      snapshots.map((snapshot) =>
        buildSitePageEntry(snapshot, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }),
      ),
      { analyzedAt: FIXED_ANALYZED_AT },
    );
    expect(oldReport.authority.freshness).toBeLessThan(freshReport.authority.freshness);
    expect(oldReport.authority.freshness).toBeLessThan(100);
  });
});
