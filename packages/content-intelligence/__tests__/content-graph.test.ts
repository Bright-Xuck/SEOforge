import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { buildContentGraph } from "../src/content-graph/builder.js";
import { makeRichSnapshot } from "./fixtures.js";

describe("buildContentGraph", () => {
  it("produces a page node and nested structure", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const graph = buildContentGraph(snapshot, $);
    expect(graph.pageId).toMatch(/^page-/);
    expect(graph.nodeCount).toBeGreaterThan(0);
    expect(graph.byType.page).toBe(1);
    expect(graph.byType.section).toBeGreaterThan(0);
  });

  it("every node has a type and relationships", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const graph = buildContentGraph(snapshot, $);
    for (const node of graph.nodes) {
      expect(["page", "section", "block", "paragraph", "sentence"]).toContain(node.type);
      expect(Array.isArray(node.relationships)).toBe(true);
    }
  });

  it("counts node types correctly", () => {
    const snapshot = makeRichSnapshot();
    const $ = cheerio.load(snapshot.rawHtml);
    const graph = buildContentGraph(snapshot, $);
    const sum = Object.values(graph.byType).reduce((a, b) => a + b, 0);
    expect(sum).toBe(graph.nodeCount);
  });
});
