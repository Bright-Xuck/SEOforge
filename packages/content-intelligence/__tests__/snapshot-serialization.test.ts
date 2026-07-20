// @forge/content-intelligence
// Tests for ContentSnapshot serialization (Hardening Pass).

import { describe, expect, it } from "vitest";
import { load as loadCheerio } from "cheerio";
import { buildPageDNA, buildContentGraph, serializeContentSnapshot } from "../src/index.js";
import { makeRichSnapshot } from "./fixtures.js";

describe("serializeContentSnapshot", () => {
  const snapshot = makeRichSnapshot();
  const $ = loadCheerio(snapshot.rawHtml);
  const dna = buildPageDNA(snapshot, $);
  const graph = buildContentGraph(snapshot, $);

  it("produces a deterministic snapshot id and fingerprint", () => {
    const a = serializeContentSnapshot(dna, graph);
    const b = serializeContentSnapshot(dna, graph);
    expect(a.id).toBe(b.id);
    expect(a.fingerprint.hash).toBe(b.fingerprint.hash);
    expect(a.id).toBe(`snap-${a.fingerprint.hash}`);
  });

  it("summarizes counts from dna and graph", () => {
    const result = serializeContentSnapshot(dna, graph);
    expect(result.summary.sectionCount).toBe(graph.byType.section);
    expect(result.summary.blockCount).toBe(graph.byType.block);
    expect(result.summary.paragraphCount).toBe(graph.byType.paragraph);
    expect(result.summary.sentenceCount).toBe(graph.byType.sentence);
    expect(result.summary.entityCount).toBe(dna.entities.length);
    expect(result.summary.topicCount).toBe(dna.topics.length);
  });

  it("records provenance metadata", () => {
    const result = serializeContentSnapshot(dna, graph, { source: "test" });
    expect(result.metadata.source).toBe("test");
    expect(result.metadata.url).toBe(dna.url);
    expect(result.metadata.generator).toBe("@forge/content-intelligence");
    expect(result.metadata.contentLength).toBe(dna.contentLength);
  });

  it("embeds the dna and graph", () => {
    const result = serializeContentSnapshot(dna, graph);
    expect(result.dna).toBe(dna);
    expect(result.graph).toBe(graph);
  });
});
