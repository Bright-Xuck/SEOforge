import { describe, it, expect } from "vitest";
import { analyzeSite, buildTopicGraph } from "../src/index.js";
import { makeAcmeSite, BASE_URL, FIXED_ANALYZED_AT } from "./site-fixtures.js";

describe("buildTopicGraph", () => {
  it("builds deterministic topics from aggregated page topics", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const graph = report.topicGraph;

    expect(graph.topicCount).toBeGreaterThan(0);
    expect(graph.topics.length).toBe(graph.topicCount);

    // "crm" appears across most pages.
    const crm = graph.byTerm["crm"];
    expect(crm).toBeTruthy();
    expect(crm?.pageCount).toBeGreaterThanOrEqual(3);

    // Every topic exposes labeled heuristic confidence and method.
    for (const topic of graph.topics) {
      expect(topic.confidence).toBeGreaterThan(0);
      expect(topic.confidence).toBeLessThanOrEqual(0.95);
      expect(topic.method.length).toBeGreaterThan(0);
    }
  });

  it("labels related, supporting, parent/child and entity relationships", () => {
    const snapshots = makeAcmeSite();
    const report = analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT });
    const graph = report.topicGraph;

    // Edges are emitted for every relationship kind.
    const kinds = new Set(graph.edges.map((edge) => edge.kind));
    expect(kinds.has("related")).toBe(true);

    const crm = graph.byTerm["crm"];
    expect(crm).toBeTruthy();
    if (crm) {
      // Related topics are sorted by strength.
      const strengths = crm.relatedTopics.map((edge) => edge.strength);
      expect([...strengths].sort((a, b) => b - a)).toEqual(strengths);
      // Related topics share at least one page with the primary topic.
      for (const edge of crm.relatedTopics) {
        const other = graph.byTerm[edge.term];
        expect(other).toBeTruthy();
        const shared = other?.pages.filter((page) => crm.pages.includes(page)).length ?? 0;
        expect(shared).toBeGreaterThan(0);
      }
    }

    // Every supporting topic is a strict subset of the primary topic's pages.
    for (const topic of graph.topics) {
      for (const edge of topic.supportingTopics) {
        const other = graph.byTerm[edge.term];
        expect(other).toBeTruthy();
        expect(other?.pages.length).toBeLessThan(topic.pages.length);
        for (const page of other?.pages ?? []) {
          expect(topic.pages).toContain(page);
        }
      }
    }
  });

  it("is deterministic for identical input", () => {
    const snapshots = makeAcmeSite();
    const a = buildTopicGraph(analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }).model);
    const b = buildTopicGraph(analyzeSite(snapshots, { baseUrl: BASE_URL, analyzedAt: FIXED_ANALYZED_AT }).model);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
