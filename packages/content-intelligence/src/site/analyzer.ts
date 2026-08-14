// @forge/content-intelligence
// Site Content Intelligence analyzer (Sprint 24).
// Composes the existing page-level engines (PageDNA, ContentGraph, quality)
// into a site-level understanding: model → topic graph → clusters → authority
// → opportunities → refresh → internal links.
// Deterministic. NO AI. NO network. NO persistence.

import type { WebsiteSnapshot } from "../types.js";
import type {
  SiteAnalysisOptions,
  SiteIntelligenceReport,
  SitePageEntry,
} from "./types.js";
import { buildSitePageEntry, buildSiteContentModel } from "./model.js";
import { buildTopicGraph } from "./topic-graph.js";
import { buildTopicClusters } from "./cluster-builder.js";
import { scoreSiteAuthority } from "./authority.js";
import { detectRefreshCandidates } from "./refresh.js";
import { detectInternalLinkOpportunities } from "./internal-links.js";
import { detectSiteOpportunities } from "./opportunities.js";

/**
 * Analyze a set of page snapshots as a complete content system.
 * Each snapshot is composed through the existing PageDNA + ContentGraph +
 * quality engines, then all site-level intelligence is derived deterministically.
 *
 * `options.universalPage` (per page) is consumed from @forge/dom-engine's
 * Universal Page Model when available.
 */
export function analyzeSite(
  snapshots: WebsiteSnapshot[],
  options: SiteAnalysisOptions = {},
): SiteIntelligenceReport {
  const baseUrl = options.baseUrl ?? snapshots[0]?.finalUrl ?? "";
  const analyzedAt = options.analyzedAt ?? new Date().toISOString();
  const entries: SitePageEntry[] = snapshots.map((snapshot) => {
    const url = snapshot.finalUrl || snapshot.originalUrl;
    const universalPage = options.universalPages?.find((page) => {
      if (!page.url) return false;
      return page.url === url || page.url.replace(/\/$/, "") === url.replace(/\/$/, "");
    });
    return buildSitePageEntry(snapshot, {
      baseUrl,
      analyzedAt,
      universalPage,
    });
  });
  return analyzeSiteFromPages(entries, options);
}

/**
 * Build the full site intelligence report from already-composed page entries.
 * Pure composition — the entry point for deterministic testing and for
 * consumers that already hold PageDNA / ContentGraph data.
 */
export function analyzeSiteFromPages(
  pages: SitePageEntry[],
  options: SiteAnalysisOptions = {},
): SiteIntelligenceReport {
  const baseUrl = options.baseUrl ?? pages[0]?.url ?? "";
  const analyzedAt = options.analyzedAt ?? new Date().toISOString();

  const model = buildSiteContentModel(pages, baseUrl);
  const topicGraph = buildTopicGraph(model, options.minTopicOccurrences ?? 2);
  const clusters = buildTopicClusters(model, topicGraph, { maxClusters: options.maxClusters ?? 10 });
  const authority = scoreSiteAuthority(model, topicGraph, clusters, {
    freshnessWindowDays: options.freshnessWindowDays ?? 180,
    knowledge: options.knowledge,
  });
  const refreshCandidates = detectRefreshCandidates(model, {
    outdatedWindowDays: options.outdatedWindowDays ?? 180,
    now: analyzedAt,
  });
  const internalLinkOpportunities = detectInternalLinkOpportunities(model, clusters);
  const opportunities = detectSiteOpportunities(
    model,
    clusters,
    authority,
    refreshCandidates,
    internalLinkOpportunities,
    { knowledge: options.knowledge },
  );

  const structureSource = pages.some((page) => page.builder || page.blockCount !== undefined)
    ? "universal-page-model"
    : "page-dna-detectors";

  return {
    analyzedAt,
    baseUrl,
    model,
    topicGraph,
    clusters,
    authority,
    opportunities,
    internalLinkOpportunities,
    refreshCandidates,
    summary: {
      pageCount: model.pageCount,
      topicCount: topicGraph.topicCount,
      clusterCount: clusters.length,
      opportunityCount: opportunities.length,
      internalLinkOpportunityCount: internalLinkOpportunities.length,
      refreshCandidateCount: refreshCandidates.length,
      highPriorityOpportunities: opportunities.filter((opportunity) => opportunity.priority === "high").length,
    },
    context: {
      structureSource,
      knowledgeApplied: Boolean(options.knowledge),
      memoryApplied: Boolean(options.memory),
      pageLevelEngine: "page-dna",
    },
  };
}
