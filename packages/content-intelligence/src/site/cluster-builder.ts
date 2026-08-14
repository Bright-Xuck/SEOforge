// @forge/content-intelligence
// Deterministic topic clusters (Sprint 24).
// Built from extracted topics, entities, sections, page types, URL structure
// and internal links. This is heuristic grouping — NOT semantic AI
// understanding. Confidence is labeled as such.

import type { SiteContentModel, TopicCluster, TopicGraph } from "./types.js";

const EXPECTED_SECTIONS = ["faq", "comparison", "buying-guide", "related-content"] as const;

export interface ClusterBuildOptions {
  readonly maxClusters?: number;
  readonly minClusterPages?: number;
}

/**
 * Build deterministic topic clusters from the topic graph.
 *
 * Clustering signals (all deterministic):
 * - topic weight × page count (seeding)
 * - shared pages (co-occurrence)
 * - supporting topics (subset pages)
 * - URL structure (path segments used by parent/child edges)
 *
 * Each cluster exposes its primary topic, related topics, pages, supporting
 * pages, missing coverage and a diagnostic coverage score.
 */
export function buildTopicClusters(
  model: SiteContentModel,
  graph: TopicGraph,
  options: ClusterBuildOptions = {},
): TopicCluster[] {
  const maxClusters = options.maxClusters ?? 10;
  const minClusterPages = options.minClusterPages ?? 1;

  const ranked = [...graph.topics]
    .sort((a, b) => b.weight * b.pageCount - a.weight * a.pageCount)
    .slice(0, maxClusters * 2);

  const claimedTopics = new Set<string>();
  const clusters: TopicCluster[] = [];

  for (const topic of ranked) {
    if (claimedTopics.has(topic.term)) continue;
    if (topic.pageCount < minClusterPages) continue;

    const clusterPages = [...topic.pages];
    const related = topic.relatedTopics
      .filter((edge) => edge.strength >= 0.5)
      .slice(0, 8);

    // Merge strongly-related topics whose pages heavily overlap.
    const mergedTopics: string[] = [topic.term];
    for (const edge of related) {
      const relatedTopic = graph.byTerm[edge.term];
      if (!relatedTopic || claimedTopics.has(edge.term)) continue;
      const overlap = clusterPages.filter((page) => relatedTopic.pages.includes(page)).length;
      if (overlap / Math.max(1, Math.min(clusterPages.length, relatedTopic.pages.length)) >= 0.5) {
        mergedTopics.push(edge.term);
        claimedTopics.add(edge.term);
        for (const page of relatedTopic.pages) {
          if (!clusterPages.includes(page)) clusterPages.push(page);
        }
      }
    }
    claimedTopics.add(topic.term);

    // Supporting pages: pages whose topics are supporting topics of the primary.
    const supportingPages: string[] = [];
    for (const edge of topic.supportingTopics) {
      const supportingTopic = graph.byTerm[edge.term];
      if (!supportingTopic) continue;
      for (const page of supportingTopic.pages) {
        if (!clusterPages.includes(page) && !supportingPages.includes(page)) {
          supportingPages.push(page);
        }
      }
    }

    const pillarPage = findPillarPage(model, clusterPages, topic.term);
    const missingCoverage = findMissingCoverage(model, clusterPages);
    const coverageScore = scoreCoverage(missingCoverage, pillarPage, supportingPages);

    clusters.push({
      id: `cluster-${hash(topic.term)}`,
      primaryTopic: topic.term,
      relatedTopics: mergedTopics,
      pages: clusterPages,
      supportingPages,
      pillarPage,
      missingCoverage,
      coverageScore,
      confidence: topic.confidence,
      method: topic.method,
    });
  }

  // Assign any unclustered pages to the cluster with the most topic overlap.
  const clusteredPages = new Set(clusters.flatMap((cluster) => cluster.pages));
  for (const page of model.pages) {
    if (clusteredPages.has(page.url)) continue;
    let best: TopicCluster | undefined;
    let bestOverlap = 0;
    for (const cluster of clusters) {
      const overlap = page.topics.filter((topic) => {
        const siteTopic = graph.byTerm[topic.term];
        return siteTopic ? cluster.relatedTopics.includes(topic.term) || cluster.primaryTopic === topic.term : false;
      }).length;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = cluster;
      }
    }
    if (best && bestOverlap > 0) {
      best.pages.push(page.url);
      best.pages.sort();
    }
  }

  return clusters;
}

function findPillarPage(model: SiteContentModel, pages: string[], primaryTopic: string): string | undefined {
  // Homepage is the natural pillar when it participates in the cluster.
  const homepage = pages.find((url) => new URL(url).pathname === "/" || url.endsWith("/"));
  if (homepage && pages.length >= 2) return homepage;

  // Otherwise the highest-quality page whose topics include the primary topic.
  let best: string | undefined;
  let bestScore = -1;
  for (const page of pages) {
    const entry = model.pageLookup[page];
    if (!entry) continue;
    const isPrimary = entry.topics.some((topic) => topic.term === primaryTopic);
    const score = entry.quality.overall + (isPrimary ? 20 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = page;
    }
  }
  return best;
}

function findMissingCoverage(model: SiteContentModel, pages: string[]): string[] {
  const present = new Set<string>();
  for (const pageUrl of pages) {
    const page = model.pageLookup[pageUrl];
    if (!page) continue;
    for (const section of page.sections) {
      present.add(section.kind);
    }
  }
  return EXPECTED_SECTIONS.filter((section) => !present.has(section));
}

function scoreCoverage(
  missingCoverage: string[],
  pillarPage: string | undefined,
  supportingPages: string[],
): number {
  let score = 100;
  score -= missingCoverage.length * 15;
  if (!pillarPage) score -= 10;
  if (supportingPages.length === 0) score -= 10;
  return Math.max(0, Math.min(100, score));
}

export function hash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

