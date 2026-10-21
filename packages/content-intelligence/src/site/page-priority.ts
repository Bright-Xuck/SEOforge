// @forge/content-intelligence
// Page priorities (Sprint 28).
//
// Turns the site report into an ordered work queue. This is a ranking view over
// data the site analyzer already produced — it does NOT re-analyze pages, call
// AI, or write anything. The orchestrator uses it to choose which page to
// optimize and to explain that choice.

import type {
  RefreshCandidate,
  SiteContentModel,
  SitePageEntry,
  SiteIntelligenceReport,
} from "./types.js";
import type { PageTypeKind } from "../types.js";

export type PagePriorityBand = "critical" | "high" | "medium" | "low";

export interface PagePrioritySignals {
  /** Forge quality score (0-100); lower means more upside. */
  readonly qualityScore: number;
  readonly missingSectionCount: number;
  readonly contentLength: number;
  readonly inboundLinks: number;
  readonly refreshReasons: readonly string[];
  readonly hasTitle: boolean;
  readonly hasMetaDescription: boolean;
  readonly hasCanonical: boolean;
  readonly internalLinkOpportunityCount: number;
}

export interface PagePriority {
  readonly pageUrl: string;
  readonly title: string;
  readonly pageType: PageTypeKind;
  /** Deterministic priority score, 0-100 (higher = more urgent). */
  readonly score: number;
  readonly band: PagePriorityBand;
  readonly reasons: string[];
  readonly signals: PagePrioritySignals;
  readonly recommendedAction: string;
}

const COMMERCIAL_PAGE_TYPES = new Set<PageTypeKind>([
  "homepage",
  "landing-page",
  "service-page",
  "product-page",
  "category-page",
]);

/**
 * Rank pages by likely SEO upside. The score is an explainable sum of
 * deterministic signals; every point added is recorded in `reasons`.
 */
export function rankPagePriorities(report: SiteIntelligenceReport): PagePriority[] {
  const refreshByUrl = new Map(report.refreshCandidates.map((candidate) => [candidate.pageUrl, candidate]));
  const linkOpportunities = countLinkOpportunities(report);

  const priorities = report.model.pages.map((page) =>
    scorePage(page, report.model, refreshByUrl.get(page.url), linkOpportunities.get(page.url) ?? 0),
  );

  return priorities.sort((a, b) => b.score - a.score || a.pageUrl.localeCompare(b.pageUrl));
}

function scorePage(
  page: SitePageEntry,
  model: SiteContentModel,
  refresh: RefreshCandidate | undefined,
  linkOpportunityCount: number,
): PagePriority {
  const reasons: string[] = [];
  let score = 0;

  const qualityGap = Math.max(0, 100 - page.quality.overall);
  const qualityPoints = Math.round(qualityGap * 0.35);
  if (qualityPoints > 0) {
    score += qualityPoints;
    reasons.push(`Quality gap ${qualityGap}/100 (+${qualityPoints})`);
  }

  const missingPoints = Math.min(20, page.missingSections.length * 4);
  if (missingPoints > 0) {
    score += missingPoints;
    reasons.push(`Missing ${page.missingSections.length} expected section(s) (+${missingPoints})`);
  }

  if (page.contentLength < 300) {
    score += 15;
    reasons.push(`Thin content (${page.contentLength} words) (+15)`);
  } else if (page.contentLength < 600) {
    score += 7;
    reasons.push(`Short content (${page.contentLength} words) (+7)`);
  }

  const inbound = model.inboundLinks[page.url] ?? 0;
  if (inbound === 0) {
    score += 10;
    reasons.push("No inbound internal links (+10)");
  } else if (inbound === 1) {
    score += 5;
    reasons.push("Only one inbound internal link (+5)");
  }

  if (refresh) {
    const refreshPoints = refresh.priority === "high" ? 20 : refresh.priority === "medium" ? 12 : 6;
    score += refreshPoints;
    reasons.push(`Refresh candidate (${refresh.priority}) (+${refreshPoints})`);
  }

  if (!page.metadata.hasTitle) {
    score += 5;
    reasons.push("Missing SEO title (+5)");
  }
  if (!page.metadata.hasMetaDescription) {
    score += 5;
    reasons.push("Missing meta description (+5)");
  }
  if (!page.metadata.hasCanonical) {
    score += 2;
    reasons.push("Missing canonical URL (+2)");
  }

  if (COMMERCIAL_PAGE_TYPES.has(page.pageType.kind)) {
    score += 8;
    reasons.push(`Commercial page type "${page.pageType.kind}" (+8)`);
  }

  if (linkOpportunityCount > 0) {
    const points = Math.min(10, linkOpportunityCount * 3);
    score += points;
    reasons.push(`${linkOpportunityCount} internal-link opportunity(ies) (+${points})`);
  }

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return {
    pageUrl: page.url,
    title: page.title,
    pageType: page.pageType.kind,
    score: bounded,
    band: bandFor(bounded),
    reasons,
    signals: {
      qualityScore: page.quality.overall,
      missingSectionCount: page.missingSections.length,
      contentLength: page.contentLength,
      inboundLinks: inbound,
      refreshReasons: refresh?.reasons ?? [],
      hasTitle: page.metadata.hasTitle,
      hasMetaDescription: page.metadata.hasMetaDescription,
      hasCanonical: page.metadata.hasCanonical,
      internalLinkOpportunityCount: linkOpportunityCount,
    },
    recommendedAction: recommendedAction(page, bounded),
  };
}

function bandFor(score: number): PagePriorityBand {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function recommendedAction(page: SitePageEntry, score: number): string {
  if (page.contentLength < 300) return "Rewrite thin copy and add missing sections";
  if (page.missingSections.length > 0) return `Add missing sections: ${page.missingSections.slice(0, 3).join(", ")}`;
  if (!page.metadata.hasTitle || !page.metadata.hasMetaDescription) return "Improve metadata";
  if (score >= 50) return "Refresh content and internal links";
  return "Monitor; lower priority than other pages";
}

function countLinkOpportunities(report: SiteIntelligenceReport): Map<string, number> {
  const counts = new Map<string, number>();
  for (const opportunity of report.internalLinkOpportunities) {
    const key = opportunity.sourcePage ?? opportunity.targetPage;
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
