// @forge/content-intelligence
// Content Snapshot model (Hardening Pass).
// Serializes the complete PageDNA + ContentGraph into a single object.
// NO AI. NO persistence. NO history. In-memory only.

import type { ContentGraph, PageDNA } from "../types.js";

/**
 * Stable identifier for a content snapshot.
 * Format: `snap-<hash>`.
 */
export type SnapshotId = string;

/**
 * Provenance metadata describing how/when a snapshot was produced.
 */
export interface SnapshotMetadata {
  /** Where the source came from (e.g. "website-reader", "homepage-engine"). */
  readonly source: string;
  /** ISO timestamp when the snapshot was captured/serialized. */
  readonly capturedAt: string;
  /** Generator label (package name). */
  readonly generator: string;
  /** URL of the analyzed page. */
  readonly url: string;
  /** Word count of the analyzed page. */
  readonly contentLength: number;
}

/**
 * Deterministic fingerprint of the page content/structure.
 * Stable across analyses for the same input HTML.
 */
export interface ContentFingerprint {
  /** Short stable hash of the normalized structure. */
  readonly hash: string;
  /** Number of structural nodes contributing to the hash. */
  readonly nodeCount: number;
}

/**
 * Aggregate counts summarizing the snapshot.
 */
export interface SnapshotSummary {
  readonly sectionCount: number;
  readonly blockCount: number;
  readonly paragraphCount: number;
  readonly sentenceCount: number;
  readonly entityCount: number;
  readonly topicCount: number;
  readonly gapCount: number;
  readonly qualityOverall: number;
}

/**
 * A complete, serializable content snapshot.
 * Combines PageDNA + ContentGraph + derived metadata.
 */
export interface ContentSnapshot {
  readonly id: SnapshotId;
  readonly metadata: SnapshotMetadata;
  readonly fingerprint: ContentFingerprint;
  readonly dna: PageDNA;
  readonly graph: ContentGraph;
  readonly summary: SnapshotSummary;
}
