// @forge/content-intelligence
// Content refresh detection (Sprint 24).
// Deterministic signals only — no replacement content is generated here.

import type {
  RefreshCandidate,
  RefreshReasonKind,
  SiteContentModel,
  SitePageEntry,
} from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RefreshOptions {
  readonly outdatedWindowDays?: number;
  readonly now?: string;
}

const DIMENSION_BY_REASON: Record<RefreshReasonKind, string> = {
  "outdated-content": "freshness",
  "weak-content-depth": "content-depth",
  "missing-entities": "entity-coverage",
  "missing-sections": "structure",
  "poor-internal-linking": "internal-linking",
  "low-quality-dimensions": "overall-quality",
  "stale-metadata": "metadata",
  "weak-topical-coverage": "topical-coverage",
};

/**
 * Identify pages that may require refreshing based on deterministic signals:
 * outdated content, weak depth, missing entities/sections, poor internal
 * linking, low quality dimensions, stale metadata and weak topical coverage.
 *
 * Returns RefreshCandidate only. Generation is out of scope here.
 */
export function detectRefreshCandidates(
  model: SiteContentModel,
  options: RefreshOptions = {},
): RefreshCandidate[] {
  const outdatedWindowDays = options.outdatedWindowDays ?? 180;
  const nowMs = Date.parse(options.now ?? new Date().toISOString());
  const siteEntityMedian = median(model.pages.map((page) => page.entities.length));

  const candidates: RefreshCandidate[] = [];
  for (const page of model.pages) {
    const reasons: RefreshReasonKind[] = [];
    const evidence: string[] = [];
    const dimensions = new Set<string>();

    const add = (reason: RefreshReasonKind, detail: string): void => {
      reasons.push(reason);
      evidence.push(detail);
      dimensions.add(DIMENSION_BY_REASON[reason]);
    };

    const analyzedMs = Date.parse(page.analyzedAt);
    if (!Number.isNaN(analyzedMs) && nowMs - analyzedMs > outdatedWindowDays * DAY_MS) {
      add("outdated-content", `analyzed ${Math.round((nowMs - analyzedMs) / DAY_MS)} days ago`);
    }

    if (page.quality.contentDepth.score < 50) {
      add("weak-content-depth", `content depth score=${page.quality.contentDepth.score}, words=${page.quality.contentDepth.wordCount}`);
    }

    const entityFloor = Math.max(1, Math.round(siteEntityMedian * 0.5));
    if (page.entities.length < entityFloor) {
      add("missing-entities", `entities=${page.entities.length} (site median ${siteEntityMedian})`);
    }

    if (page.missingSections.length >= 3) {
      add("missing-sections", `missing sections: ${page.missingSections.slice(0, 5).join(", ")}`);
    }

    const outbound = model.pageToPageLinks[page.url]?.length ?? page.internalLinks.length;
    if (outbound < 2) {
      add("poor-internal-linking", `internal page links=${outbound}`);
    }

    if (page.quality.overall < 50) {
      add("low-quality-dimensions", `overall quality=${page.quality.overall}`);
    }

    if (!page.metadata.hasMetaDescription || !page.metadata.hasTitle) {
      add("stale-metadata", `meta description=${page.metadata.hasMetaDescription}, title=${page.metadata.hasTitle}`);
    }

    if (page.topics.length < 3) {
      add("weak-topical-coverage", `topics=${page.topics.length}`);
    }

    if (reasons.length === 0) continue;

    candidates.push({
      pageUrl: page.url,
      reasons,
      affectedDimensions: [...dimensions],
      priority: priorityFor(reasons.length),
      estimatedImpact: estimatedImpact(page),
      evidence,
    });
  }

  return candidates.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));
}

function priorityFor(reasonCount: number): RefreshCandidate["priority"] {
  if (reasonCount >= 5) return "high";
  if (reasonCount >= 3) return "medium";
  return "low";
}

function estimatedImpact(page: SitePageEntry): string {
  const topicTerms = page.topics.slice(0, 3).map((topic) => topic.term).join(", ");
  const subject = topicTerms ? `topics: ${topicTerms}` : `page ${page.url}`;
  return `Refreshing "${page.title}" could improve organic visibility for ${subject}.`;
}

function priorityWeight(priority: RefreshCandidate["priority"]): number {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[middle - 1];
    const right = sorted[middle];
    if (left === undefined || right === undefined) return 0;
    return (left + right) / 2;
  }
  return sorted[middle] ?? 0;
}
