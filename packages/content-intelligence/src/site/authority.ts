// @forge/content-intelligence
// Site-level authority / coverage scoring (Sprint 24).
// Deterministic Forge diagnostic scores. These scores do NOT represent
// Google rankings or Google's actual internal scoring.

import type {
  SiteAuthorityScores,
  SiteContentModel,
  TopicCluster,
  TopicGraph,
  SiteAnalysisOptions,
} from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AuthorityOptions {
  readonly freshnessWindowDays?: number;
  readonly knowledge?: SiteAnalysisOptions["knowledge"];
}

/**
 * Score site-level topical authority and coverage.
 * Every dimension is normalized to 0-100 and is a Forge diagnostic only.
 */
export function scoreSiteAuthority(
  model: SiteContentModel,
  graph: TopicGraph,
  clusters: TopicCluster[],
  options: AuthorityOptions = {},
): SiteAuthorityScores {
  const freshnessWindowDays = options.freshnessWindowDays ?? 180;
  const now = Date.now();

  const topicalCoverage = scoreTopicalCoverage(clusters, model, graph);
  const semanticDepth = scoreSemanticDepth(model);
  const supportingContent = scoreSupportingContent(clusters, model);
  const internalLinking = scoreInternalLinking(model);
  const entityCoverage = scoreEntityCoverage(model, options.knowledge);
  const contentCompleteness = scoreContentCompleteness(model);
  const freshness = scoreFreshness(model, now, freshnessWindowDays);

  const overall = Math.round(
    (topicalCoverage + semanticDepth + supportingContent + internalLinking +
      entityCoverage + contentCompleteness + freshness) / 7,
  );

  return {
    topicalCoverage,
    semanticDepth,
    supportingContent,
    internalLinking,
    entityCoverage,
    contentCompleteness,
    freshness,
    overall,
    diagnostic: true,
    basis: {
      topicalCoverage: clusterCoverageBasis(clusters),
      semanticDepth: `avg content depth ${meanOf(model.pages.map((p) => p.quality.contentDepth.score)).toFixed(0)} + ${presentSectionRatio(model)} section coverage`,
      supportingContent: `supporting pages across ${clusters.length} clusters`,
      internalLinking: `avg ${averageOutboundLinks(model).toFixed(1)} page-to-page links/page, ${orphanCount(model)} orphan(s)`,
      entityCoverage: options.knowledge?.products?.length
        ? "coverage of known products/services across the site"
        : "entity density across pages",
      contentCompleteness: `avg quality ${model.qualitySummary.average} minus missing-section penalty`,
      freshness: `pages analyzed within ${freshnessWindowDays} days`,
    },
  };
}

function scoreTopicalCoverage(clusters: TopicCluster[], model: SiteContentModel, graph: TopicGraph): number {
  if (clusters.length > 0) {
    const avgCoverage = meanOf(clusters.map((cluster) => cluster.coverageScore));
    return Math.round(avgCoverage);
  }
  // No clusters: fall back to topic density.
  const density = model.pageCount > 0 ? graph.topicCount / model.pageCount : 0;
  return Math.min(100, Math.round(density * 25));
}

function scoreSemanticDepth(model: SiteContentModel): number {
  if (model.pageCount === 0) return 0;
  const avgDepth = meanOf(model.pages.map((page) => page.quality.contentDepth.score));
  const sectionRatio = presentSectionRatio(model);
  return Math.round(avgDepth * 0.7 + sectionRatio * 100 * 0.3);
}

function scoreSupportingContent(clusters: TopicCluster[], model: SiteContentModel): number {
  if (clusters.length === 0) return model.pageCount >= 2 ? 50 : 0;
  const totalSupporting = clusters.reduce((sum, cluster) => sum + cluster.supportingPages.length, 0);
  const expected = clusters.length * 2;
  const supportRatio = Math.min(1, totalSupporting / Math.max(1, expected));
  return Math.round(supportRatio * 100);
}

function scoreInternalLinking(model: SiteContentModel): number {
  if (model.pageCount <= 1) return model.pageCount === 1 ? 50 : 0;
  const avg = averageOutboundLinks(model);
  const orphans = orphanCount(model);
  const orphanPenalty = (orphans / model.pageCount) * 40;
  const linkScore = Math.min(100, avg * 12);
  return Math.max(0, Math.round(linkScore - orphanPenalty));
}

function scoreEntityCoverage(model: SiteContentModel, knowledge?: AuthorityOptions["knowledge"]): number {
  if (knowledge && (knowledge.products?.length || knowledge.services?.length)) {
    const known = [...(knowledge.products ?? []), ...(knowledge.services ?? [])]
      .map((item) => item.toLowerCase());
    if (known.length === 0) return 0;
    const siteValues = new Set(model.entities.map((entity) => entity.value.toLowerCase()));
    const covered = known.filter((item) =>
      [...siteValues].some((value) => value.includes(item) || item.includes(value)),
    ).length;
    return Math.round((covered / known.length) * 100);
  }
  if (model.pageCount === 0) return 0;
  const density = model.entities.length / model.pageCount;
  return Math.min(100, Math.round(density * 20));
}

function scoreContentCompleteness(model: SiteContentModel): number {
  if (model.pageCount === 0) return 0;
  const avgQuality = model.qualitySummary.average;
  const sectionCoverage = presentSectionRatio(model);
  return Math.round(avgQuality * 0.6 + sectionCoverage * 100 * 0.4);
}

function scoreFreshness(model: SiteContentModel, now: number, windowDays: number): number {
  if (model.pageCount === 0) return 0;
  const windowMs = windowDays * DAY_MS;
  const scores = model.pages.map((page) => {
    const analyzed = Date.parse(page.analyzedAt);
    if (Number.isNaN(analyzed)) return 50;
    const age = now - analyzed;
    if (age <= windowMs) return 100;
    return Math.max(0, Math.round(100 - ((age - windowMs) / windowMs) * 100));
  });
  return Math.round(meanOf(scores));
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function averageOutboundLinks(model: SiteContentModel): number {
  if (model.pageCount === 0) return 0;
  const total = model.pages.reduce((sum, page) => sum + (model.pageToPageLinks[page.url]?.length ?? 0), 0);
  return total / model.pageCount;
}

function orphanCount(model: SiteContentModel): number {
  return model.pages.filter((page) => {
    const isHomepage = pathIsHome(page.url);
    if (isHomepage) return false;
    return (model.inboundLinks[page.url] ?? 0) === 0;
  }).length;
}

function presentSectionRatio(model: SiteContentModel): number {
  if (model.pageCount === 0) return 0;
  const presentKinds = new Set<string>();
  for (const page of model.pages) {
    for (const section of page.sections) {
      presentKinds.add(section.kind);
    }
  }
  return Math.min(1, presentKinds.size / 15);
}

function clusterCoverageBasis(clusters: TopicCluster[]): string {
  if (clusters.length === 0) return "no clusters (topic density fallback)";
  return `avg cluster coverage ${Math.round(meanOf(clusters.map((c) => c.coverageScore)))} across ${clusters.length} clusters`;
}

function pathIsHome(url: string): boolean {
  try {
    return new URL(url).pathname === "/" || new URL(url).pathname === "";
  } catch {
    return false;
  }
}

function meanOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
