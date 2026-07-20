// @forge/homepage-engine
// Additive Page DNA consumer: enriches homepage analysis with deterministic
// content intelligence. Does NOT replace existing homepage logic.
// NO AI. NO text generation.

import type { PageDNA } from "@forge/content-intelligence";

export interface PageDnaEnrichment {
  readonly pageType: string;
  readonly intent: string;
  readonly audience: string;
  readonly sectionCount: number;
  readonly topicCount: number;
  readonly entityCount: number;
  readonly readingLevel: string;
  readonly contentLength: number;
  /** Schema/dna version of the consumed Page DNA. */
  readonly dnaVersion: string;
  readonly generatorVersion: string;
}

/**
 * Consume a Page DNA produced upstream (e.g. by the content-intelligence
 * pipeline step) and derive an additive enrichment. Does NOT re-run detectors.
 * Pure/additive: returns structured understanding without mutating inputs.
 */
export function enrichWithPageDNA(dna: PageDNA): PageDnaEnrichment {
  return {
    pageType: dna.pageType.kind,
    intent: dna.intent.primary,
    audience: dna.audience.level,
    sectionCount: dna.sectionInventory.present.length,
    topicCount: dna.topics.length,
    entityCount: dna.entities.length,
    readingLevel: dna.readingLevel,
    contentLength: dna.contentLength,
    dnaVersion: dna.dnaVersion,
    generatorVersion: dna.generatorVersion,
  };
}
