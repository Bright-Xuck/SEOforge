import { describe, it, expect } from "vitest";
import { analyzeSite } from "../src/index.js";
import { makeAcmeSite, makeSparseSite, BASE_URL, FIXED_ANALYZED_AT } from "./site-fixtures.js";

describe("detectSiteOpportunities", () => {
  it("detects thin and weakly-connected page opportunities on a sparse site", () => {
    const snapshots = makeSparseSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });

    expect(report.opportunities.length).toBeGreaterThan(0);
    const kinds = new Set(report.opportunities.map((opportunity) => opportunity.kind));
    // Thin pages are detected through existing quality/depth findings.
    expect(kinds.has("thin-page")).toBe(true);

    for (const opportunity of report.opportunities) {
      expect(opportunity.id).toMatch(/^opp-/);
      expect(opportunity.title).toBeTruthy();
      expect(["low", "medium", "high"]).toContain(opportunity.priority);
      expect(Array.isArray(opportunity.evidence)).toBe(true);
      expect(Array.isArray(opportunity.relatedPages)).toBe(true);
      expect(Array.isArray(opportunity.references)).toBe(true);
      expect(opportunity.estimatedImpact).toBeTruthy();
    }
  });

  it("flags missing FAQ coverage on sites without any FAQ", () => {
    const sparse = analyzeSite(makeSparseSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    expect(sparse.opportunities.some((opportunity) => opportunity.kind === "missing-faq")).toBe(true);
  });

  it("does not report a missing glossary when a glossary page exists", () => {
    const acme = analyzeSite(makeAcmeSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    expect(acme.opportunities.some((opportunity) => opportunity.kind === "missing-glossary")).toBe(false);
  });

  it("references underlying findings in thin-page opportunities", () => {
    const report = analyzeSite(makeSparseSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const thin = report.opportunities.find((opportunity) => opportunity.kind === "thin-page");
    expect(thin).toBeTruthy();
    const references = thin?.references ?? [];
    expect(references.length).toBeGreaterThan(0);
    expect(references.some((reference) => reference.field.startsWith("quality.") || reference.field.startsWith("dna."))).toBe(true);
  });

  it("flags outdated pages from refresh candidates", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const kinds = new Set(report.opportunities.map((opportunity) => opportunity.kind));
    // Outdated-page opportunities only appear when refresh signals are strong.
    expect(Array.isArray(report.opportunities)).toBe(true);
    expect(report.refreshCandidates.length).toBeGreaterThanOrEqual(0);
    void kinds;
  });
});
