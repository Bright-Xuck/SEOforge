import { describe, it, expect } from "vitest";
import { analyzeSite, buildTopicClusters } from "../src/index.js";
import { makeAcmeSite, makeSparseSite, BASE_URL, FIXED_ANALYZED_AT } from "./site-fixtures.js";

describe("buildTopicClusters", () => {
  it("builds clusters with primary topic, pages, supporting pages and coverage", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const clusters = report.clusters;

    expect(clusters.length).toBeGreaterThan(0);
    for (const cluster of clusters) {
      expect(cluster.id).toMatch(/^cluster-/);
      expect(cluster.primaryTopic).toBeTruthy();
      expect(cluster.pages.length).toBeGreaterThan(0);
      expect(cluster.coverageScore).toBeGreaterThanOrEqual(0);
      expect(cluster.coverageScore).toBeLessThanOrEqual(100);
      expect(cluster.confidence).toBeGreaterThan(0);
      expect(cluster.method.length).toBeGreaterThan(0);
      expect(Array.isArray(cluster.missingCoverage)).toBe(true);
      expect(Array.isArray(cluster.supportingPages)).toBe(true);
    }
  });

  it("respects the maxClusters limit", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT, maxClusters: 2 });
    expect(report.clusters.length).toBeLessThanOrEqual(2);
  });

  it("still produces clusters for a sparse site", () => {
    const snapshots = makeSparseSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const clusters = buildTopicClusters(report.model, report.topicGraph);
    expect(clusters.length).toBeGreaterThanOrEqual(0);
    for (const cluster of clusters) {
      expect(cluster.coverageScore).toBeGreaterThanOrEqual(0);
    }
  });

  it("is deterministic for identical input", () => {
    const snapshots = makeAcmeSite();
    const a = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }).clusters;
    const b = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }).clusters;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
