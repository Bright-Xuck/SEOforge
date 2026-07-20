// @forge/content-intelligence
// Content Snapshot serialization (Hardening Pass).
// Pure, deterministic. No persistence, no history.
// NO AI.

import type { ContentGraph, PageDNA } from "../types.js";
import type {
  ContentFingerprint,
  ContentSnapshot,
  SnapshotId,
  SnapshotMetadata,
  SnapshotSummary,
} from "./types.js";

const GENERATOR = "@forge/content-intelligence";

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function buildFingerprint(graph: ContentGraph): ContentFingerprint {
  const structural = graph.nodes
    .map((node) => `${node.type}:${node.position}`)
    .sort()
    .join("|");
  return {
    hash: hashString(structural),
    nodeCount: graph.nodes.length,
  };
}

function buildSummary(dna: PageDNA, graph: ContentGraph, gapCount: number): SnapshotSummary {
  const byType = graph.byType;
  return {
    sectionCount: byType.section,
    blockCount: byType.block,
    paragraphCount: byType.paragraph,
    sentenceCount: byType.sentence,
    entityCount: dna.entities.length,
    topicCount: dna.topics.length,
    gapCount,
    qualityOverall: 0, // real quality supplied by caller
  };
}

/**
 * Serialize a PageDNA + ContentGraph into a ContentSnapshot.
 * Deterministic: same inputs always produce the same snapshot id/fingerprint.
 *
 * @param dna    The Page DNA produced by buildPageDNA.
 * @param graph  The Content Graph produced by buildContentGraph.
 * @param options.source        Provenance label (default "content-intelligence").
 * @param options.gapCount      Number of detected content gaps (default 0).
 * @param options.qualityOverall Overall quality score 0-100 (default 0).
 */
export function serializeContentSnapshot(
  dna: PageDNA,
  graph: ContentGraph,
  options: { source?: string; gapCount?: number; qualityOverall?: number } = {},
): ContentSnapshot {
  const source = options.source ?? "content-intelligence";
  const gapCount = options.gapCount ?? 0;
  const qualityOverall = options.qualityOverall ?? 0;
  const capturedAt = new Date().toISOString();

  const fingerprint = buildFingerprint(graph);
  const id: SnapshotId = `snap-${fingerprint.hash}`;
  const metadata: SnapshotMetadata = {
    source,
    capturedAt,
    generator: GENERATOR,
    url: dna.url,
    contentLength: dna.contentLength,
  };
  const summary: SnapshotSummary = {
    ...buildSummary(dna, graph, gapCount),
    qualityOverall,
  };

  return { id, metadata, fingerprint, dna, graph, summary };
}
