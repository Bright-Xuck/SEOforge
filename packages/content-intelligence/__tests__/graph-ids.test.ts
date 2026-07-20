// @forge/content-intelligence
// Tests for stable block/paragraph/sentence IDs in the content graph.

import { describe, expect, it } from "vitest";
import { load as loadCheerio } from "cheerio";
import { buildContentGraph } from "../src/content-graph/builder.js";
import { generateBlockId, generateParagraphId, generateSentenceId } from "../src/page-dna/id-generator.js";
import { makeRichSnapshot } from "./fixtures.js";

describe("content graph stable ids", () => {
  const snapshot = makeRichSnapshot();
  const $ = loadCheerio(snapshot.rawHtml);
  const graph = buildContentGraph(snapshot, $);

  it("uses the deterministic id generators for blocks/paragraphs/sentences", () => {
    const block = graph.nodes.find((n) => n.type === "block");
    const paragraph = graph.nodes.find((n) => n.type === "paragraph");
    const sentence = graph.nodes.find((n) => n.type === "sentence");
    expect(block).toBeDefined();
    expect(paragraph).toBeDefined();
    expect(sentence).toBeDefined();
    if (block && paragraph && sentence) {
      expect(block.id).toBe(generateBlockId("hero", 0));
      expect(paragraph.id).toBe(generateParagraphId(block.id, 0));
      expect(sentence.id).toBe(generateSentenceId(paragraph.id, 0));
    }
  });

  it("is deterministic across runs", () => {
    const graph2 = buildContentGraph(snapshot, $);
    expect(graph2.nodes.map((n) => n.id)).toEqual(graph.nodes.map((n) => n.id));
  });
});
