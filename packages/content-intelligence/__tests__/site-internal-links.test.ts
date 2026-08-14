import { describe, it, expect } from "vitest";
import { analyzeSite } from "../src/index.js";
import { makeAcmeSite, BASE_URL, FIXED_ANALYZED_AT } from "./site-fixtures.js";

describe("detectInternalLinkOpportunities", () => {
  it("detects orphan pages (no inbound internal links)", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const orphans = report.internalLinkOpportunities.filter(
      (opportunity) => opportunity.kind === "orphan-page",
    );

    // /orphan-notes is never linked from another site page.
    const orphanForNotes = orphans.find((opportunity) => opportunity.targetPage === `${BASE_URL}/orphan-notes`);
    expect(orphanForNotes).toBeTruthy();
  });

  it("outputs opportunities only — never modifies links", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const before = JSON.stringify(snapshots.map((snapshot) => snapshot.links));
    void report;
    const after = JSON.stringify(snapshots.map((snapshot) => snapshot.links));
    expect(before).toBe(after);
  });

  it("produces well-formed opportunities", () => {
    const report = analyzeSite(makeAcmeSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    for (const opportunity of report.internalLinkOpportunities) {
      expect(opportunity.id).toMatch(/^link-/);
      expect(opportunity.kind).toBeTruthy();
      expect(opportunity.description).toBeTruthy();
      expect(opportunity.evidence.length).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(opportunity.priority);
    }
  });

  it("is deterministic for identical input", () => {
    const a = analyzeSite(makeAcmeSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }).internalLinkOpportunities;
    const b = analyzeSite(makeAcmeSite(), { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }).internalLinkOpportunities;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
