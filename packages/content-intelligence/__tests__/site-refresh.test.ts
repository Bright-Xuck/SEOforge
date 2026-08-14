import { describe, it, expect } from "vitest";
import { analyzeSiteFromPages } from "../src/index.js";
import { buildSitePageEntry } from "../src/site/model.js";
import { makeAcmeSite, BASE_URL, FIXED_ANALYZED_AT } from "./site-fixtures.js";

describe("detectRefreshCandidates", () => {
  it("flags stale pages as outdated-content candidates", () => {
    const snapshots = makeAcmeSite();
    const entries = snapshots.map((snapshot) =>
      buildSitePageEntry(snapshot, {
        baseUrl: BASE_URL,
        analyzedAt: "2020-01-01T00:00:00.000Z",
      }),
    );
    const report = analyzeSiteFromPages(entries, { analyzedAt: FIXED_ANALYZED_AT });

    expect(report.refreshCandidates.length).toBeGreaterThan(0);
    for (const candidate of report.refreshCandidates) {
      expect(candidate.reasons).toContain("outdated-content");
      expect(candidate.affectedDimensions).toContain("freshness");
      expect(candidate.evidence.length).toBeGreaterThan(0);
      expect(candidate.estimatedImpact).toBeTruthy();
      expect(["low", "medium", "high"]).toContain(candidate.priority);
    }
  });

  it("does not generate replacement content", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSiteFromPages(
      snapshots.map((snapshot) =>
        buildSitePageEntry(snapshot, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }),
      ),
      { analyzedAt: FIXED_ANALYZED_AT },
    );
    for (const candidate of report.refreshCandidates) {
      expect(candidate).not.toHaveProperty("proposedContent");
      expect(candidate).not.toHaveProperty("replacement");
    }
  });

  it("produces deterministic candidates", () => {
    const snapshots = makeAcmeSite();
    const a = analyzeSiteFromPages(
      snapshots.map((snapshot) =>
        buildSitePageEntry(snapshot, { baseUrl: BASE_URL, analyzedAt: "2021-06-01T00:00:00.000Z" }),
      ),
      { analyzedAt: FIXED_ANALYZED_AT },
    );
    const b = analyzeSiteFromPages(
      snapshots.map((snapshot) =>
        buildSitePageEntry(snapshot, { baseUrl: BASE_URL, analyzedAt: "2021-06-01T00:00:00.000Z" }),
      ),
      { analyzedAt: FIXED_ANALYZED_AT },
    );
    expect(JSON.stringify(a.refreshCandidates)).toBe(JSON.stringify(b.refreshCandidates));
  });
});
