// @forge/content-intelligence
// Site Content Model (Sprint 24).
// Deterministic composition of existing PageDNA / ContentGraph / quality data
// into a site-level model. NO AI. NO HTML parsing — structural detail is
// consumed from the Universal Page Model when provided.

import { load } from "cheerio";
import type { Entity, Topic, WebsiteSnapshot } from "../types.js";
import { buildPageDNAFromSnapshot } from "../page-dna/builder.js";
import { buildContentGraph } from "../content-graph/builder.js";
import { scoreQuality } from "../quality/scorer.js";
import type {
  UniversalPageLike,
  SitePageEntry,
  SiteContentModel,
  SiteSectionCoverage,
} from "./types.js";

// ─── Universal Page Model structure extraction ─────────────────────────────

export interface UniversalPageStructure {
  readonly builder?: string;
  readonly sectionKinds: string[];
  readonly blockCount: number;
}

/**
 * Extract site-relevant structure from a Universal Page Model.
 * This CONSUMES the model produced by @forge/dom-engine; it never parses HTML.
 */
export function extractUniversalPageStructure(page: UniversalPageLike): UniversalPageStructure {
  const sectionKinds = new Set<string>();
  let blockCount = 0;
  for (const region of page.regions) {
    for (const section of region.sections) {
      if (section.kind && section.kind !== "unknown") {
        sectionKinds.add(section.kind);
      }
      blockCount += section.blocks?.length ?? 0;
    }
  }
  return {
    builder: page.builder?.builderType,
    sectionKinds: [...sectionKinds].sort(),
    blockCount,
  };
}

// ─── Page entry construction ───────────────────────────────────────────────

export interface BuildPageEntryOptions {
  readonly baseUrl: string;
  readonly analyzedAt?: string;
  readonly universalPage?: UniversalPageLike;
}

/**
 * Compose one page into a SitePageEntry from existing deterministic engines:
 * PageDNA (page type, intent, topics, entities, sections, metadata) +
 * ContentGraph + QualityScores. Uses the Universal Page Model for structural
 * detail (builder, blocks) when provided.
 */
export function buildSitePageEntry(snapshot: WebsiteSnapshot, options: BuildPageEntryOptions): SitePageEntry {
  const dna = buildPageDNAFromSnapshot(snapshot);
  const $ = load(snapshot.rawHtml || "");
  const graph = buildContentGraph(snapshot, $);
  const quality = scoreQuality(snapshot, $);
  const analyzedAt = options.analyzedAt ?? new Date().toISOString();
  const url = normalizeUrl(snapshot.finalUrl || snapshot.originalUrl, options.baseUrl);
  const internalLinks = extractInternalLinks(snapshot, options.baseUrl);

  let builder: string | undefined;
  let blockCount: number | undefined;
  if (options.universalPage) {
    const structure = extractUniversalPageStructure(options.universalPage);
    builder = structure.builder;
    blockCount = structure.blockCount;
  }

  return {
    url,
    title: snapshot.pageTitle,
    pageType: dna.pageType,
    intent: dna.intent,
    audience: dna.audience,
    contentLength: dna.contentLength,
    topics: dna.topics,
    entities: dna.entities,
    sections: dna.sectionInventory.sections.filter((section) => section.present),
    missingSections: dna.sectionInventory.missing,
    internalLinks,
    externalLinkCount: dna.links.external,
    quality,
    metadata: dna.metadata,
    graph,
    analyzedAt,
    builder,
    blockCount,
  };
}

// ─── Site Content Model composition ────────────────────────────────────────

/**
 * Build the deterministic SiteContentModel from composed page entries.
 * This references and composes existing PageDNA / ContentGraph data — it does
 * not duplicate PageDNA.
 */
export function buildSiteContentModel(pages: SitePageEntry[], baseUrl: string): SiteContentModel {
  const pageLookup: Record<string, SitePageEntry> = {};
  for (const page of pages) {
    pageLookup[page.url] = page;
  }

  const pageTypes: Record<string, number> = {};
  for (const page of pages) {
    pageTypes[page.pageType.kind] = (pageTypes[page.pageType.kind] ?? 0) + 1;
  }

  const topics = aggregateTopics(pages);
  const entities = aggregateEntities(pages);
  const sections = aggregateSections(pages);

  const pageToPageLinks: Record<string, string[]> = {};
  const inboundLinks: Record<string, number> = {};
  for (const page of pages) {
    const siteLinks = [...new Set(page.internalLinks.filter((href) => pageLookup[href]))].sort();
    pageToPageLinks[page.url] = siteLinks;
    for (const target of siteLinks) {
      inboundLinks[target] = (inboundLinks[target] ?? 0) + 1;
    }
  }

  const overallScores = pages.map((page) => page.quality.overall);
  const byPage: Record<string, number> = {};
  for (const page of pages) {
    byPage[page.url] = page.quality.overall;
  }
  const qualitySummary = {
    average: round(overallScores.length > 0 ? mean(overallScores) : 0),
    min: overallScores.length > 0 ? Math.min(...overallScores) : 0,
    max: overallScores.length > 0 ? Math.max(...overallScores) : 0,
    byPage,
  };

  const freshnessByPage: Record<string, string> = {};
  for (const page of pages) {
    freshnessByPage[page.url] = page.analyzedAt;
  }
  const analyzedTimes = pages.map((page) => page.analyzedAt).sort();
  const freshness = {
    oldestAnalyzedAt: analyzedTimes[0] ?? "",
    newestAnalyzedAt: analyzedTimes[analyzedTimes.length - 1] ?? "",
    byPage: freshnessByPage,
  };

  const distinctSections = new Set<string>();
  for (const page of pages) {
    for (const section of page.sections) {
      distinctSections.add(section.kind);
    }
  }

  return {
    baseUrl,
    pages,
    pageCount: pages.length,
    pageTypes,
    topics,
    entities,
    sections,
    pageToPageLinks,
    inboundLinks,
    pageLookup,
    qualitySummary,
    freshness,
    semanticCoverage: {
      coveredTopics: topics.length,
      coveredEntities: entities.length,
      distinctSections: distinctSections.size,
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function normalizeUrl(url: string, baseUrl: string): string {
  try {
    const resolved = new URL(url, baseUrl);
    resolved.hash = "";
    return resolved.href;
  } catch {
    return url;
  }
}

function extractInternalLinks(snapshot: WebsiteSnapshot, baseUrl: string): string[] {
  const links: string[] = [];
  for (const link of snapshot.links) {
    if (!link.isInternal) continue;
    // Resolve relative internal links against the site base URL.
    const href = /^https?:/i.test(link.href)
      ? link.href
      : new URL(link.href, baseUrl).href;
    links.push(normalizeUrl(href, baseUrl));
  }
  return [...new Set(links)].sort();
}

function aggregateTopics(pages: SitePageEntry[]): Topic[] {
  const counts = new Map<string, number>();
  for (const page of pages) {
    for (const topic of page.topics) {
      const key = topic.term.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + Math.max(1, Math.round(topic.occurrences)));
    }
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0) || 1;
  return [...counts.entries()]
    .map(([term, occurrences]) => ({
      term,
      occurrences,
      weight: Number((occurrences / total).toFixed(4)),
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 100);
}

function aggregateEntities(pages: SitePageEntry[]): Entity[] {
  const counts = new Map<string, Entity>();
  for (const page of pages) {
    for (const entity of page.entities) {
      const key = `${entity.kind}:${entity.value.toLowerCase()}`;
      const existing = counts.get(key);
      if (existing) {
        counts.set(key, {
          ...existing,
          occurrences: existing.occurrences + entity.occurrences,
        });
      } else {
        counts.set(key, { ...entity });
      }
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 100);
}

function aggregateSections(pages: SitePageEntry[]): Record<string, SiteSectionCoverage> {
  const coverage: Record<string, SiteSectionCoverage> = {};
  for (const page of pages) {
    for (const section of page.sections) {
      const key = section.kind;
      const entry = (coverage[key] ??= { present: 0, missing: 0, pages: [] });
      entry.present += 1;
      entry.pages.push(page.url);
    }
    for (const kind of page.missingSections) {
      const entry = (coverage[kind] ??= { present: 0, missing: 0, pages: [] });
      entry.missing += 1;
    }
  }
  return coverage;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
