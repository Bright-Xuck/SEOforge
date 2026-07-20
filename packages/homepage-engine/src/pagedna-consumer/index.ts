// @forge/homepage-engine
// Additive Page DNA consumer: enriches homepage analysis with deterministic
// content intelligence. Does NOT replace existing homepage logic.
// NO AI. NO text generation.

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { WebsiteSnapshot } from "@forge/core";
import { buildPageDNA, detectSections } from "@forge/content-intelligence";

export interface PageDnaEnrichment {
  readonly pageType: string;
  readonly intent: string;
  readonly audience: string;
  readonly sectionCount: number;
  readonly topicCount: number;
  readonly entityCount: number;
  readonly readingLevel: string;
  readonly contentLength: number;
}

/**
 * Build a deterministic Page DNA enrichment from a homepage snapshot.
 * Pure/additive: returns structured understanding without mutating inputs.
 */
export function enrichWithPageDNA(snapshot: WebsiteSnapshot): PageDnaEnrichment {
  const $: CheerioAPI = cheerio.load(snapshot.rawHtml || "");
  const dna = buildPageDNA(snapshot, $);
  const sections = detectSections(snapshot, $);
  return {
    pageType: dna.pageType.kind,
    intent: dna.intent.primary,
    audience: dna.audience.level,
    sectionCount: sections.present.length,
    topicCount: dna.topics.length,
    entityCount: dna.entities.length,
    readingLevel: dna.readingLevel,
    contentLength: dna.contentLength,
  };
}
