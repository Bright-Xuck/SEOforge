import { describe, it, expect } from "vitest";
import { analyzeSiteFromPages } from "../src/site/analyzer.js";
import { buildSitePageEntry, buildSiteContentModel } from "../src/site/model.js";
import { makeAcmeSite, BASE_URL, FIXED_ANALYZED_AT } from "./site-fixtures.js";

describe("buildSiteContentModel", () => {
  it("composes pages, page types, topics, entities, links and quality into a site model", () => {
    const snapshots = makeAcmeSite();
    const entries = snapshots.map((snapshot) =>
      buildSitePageEntry(snapshot, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }),
    );
    const model = buildSiteContentModel(entries, BASE_URL);

    expect(model.pageCount).toBe(snapshots.length);
    expect(model.pageTypes).toBeTruthy();
    expect(model.pages).toHaveLength(snapshots.length);
    expect(model.pageLookup[`${BASE_URL}/`]).toBeTruthy();

    // Topics are aggregated and occurrence-weighted.
    expect(model.topics.length).toBeGreaterThan(0);
    const crm = model.topics.find((topic) => topic.term === "crm");
    expect(crm).toBeTruthy();
    expect(crm?.occurrences).toBeGreaterThan(0);

    // Entities are aggregated across pages.
    expect(model.entities.length).toBeGreaterThan(0);

    // Page-to-page links only include pages present in the model.
    const homepageLinks = model.pageToPageLinks[`${BASE_URL}/`] ?? [];
    expect(homepageLinks).toContain(`${BASE_URL}/features`);
    expect(homepageLinks).toContain(`${BASE_URL}/pricing`);
    expect(homepageLinks).not.toContain("https://partner.example.com");

    // Inbound link counts.
    expect(model.inboundLinks[`${BASE_URL}/features`] ?? 0).toBeGreaterThanOrEqual(1);

    // Quality summary.
    expect(model.qualitySummary.average).toBeGreaterThanOrEqual(0);
    expect(model.qualitySummary.byPage[`${BASE_URL}/`]).toBeTypeOf("number");

    // Freshness.
    expect(model.freshness.oldestAnalyzedAt).toBe(FIXED_ANALYZED_AT);
    expect(model.freshness.byPage[`${BASE_URL}/pricing`]).toBe(FIXED_ANALYZED_AT);

    // Semantic coverage.
    expect(model.semanticCoverage.coveredTopics).toBe(model.topics.length);
    expect(model.semanticCoverage.distinctSections).toBeGreaterThan(0);
  });

  it("aggregates section coverage across pages", () => {
    const snapshots = makeAcmeSite();
    const entries = snapshots.map((snapshot) =>
      buildSitePageEntry(snapshot, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }),
    );
    const model = buildSiteContentModel(entries, BASE_URL);
    const faq = model.sections["faq"];
    expect(faq).toBeTruthy();
    expect(faq?.present).toBeGreaterThanOrEqual(2);
    expect(faq?.pages.length).toBeGreaterThanOrEqual(2);
  });

  it("analyzeSiteFromPages produces the same model deterministically", () => {
    const snapshots = makeAcmeSite();
    const entries = snapshots.map((snapshot) =>
      buildSitePageEntry(snapshot, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }),
    );
    const reportA = analyzeSiteFromPages(entries, { analyzedAt: FIXED_ANALYZED_AT });
    const reportB = analyzeSiteFromPages(entries, { analyzedAt: FIXED_ANALYZED_AT });
    expect(JSON.stringify(reportA.model)).toBe(JSON.stringify(reportB.model));
    expect(reportA.context.pageLevelEngine).toBe("page-dna");
  });
});
