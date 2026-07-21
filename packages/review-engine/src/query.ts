// @forge/review-engine
// Deterministic filtering and sorting of review items.

import { severityRank } from "./policy.js";
import type {
  ReviewFilter,
  ReviewItem,
  ReviewSortDir,
  ReviewSortKey,
} from "./types.js";

/**
 * Filter review items by the provided criteria. All criteria are AND-combined.
 */
export function filterItems(items: ReviewItem[], filter: ReviewFilter): ReviewItem[] {
  return items.filter((item) => {
    if (filter.section !== undefined && item.section !== filter.section) return false;
    if (filter.severity !== undefined && item.severity !== filter.severity) return false;
    if (filter.confidenceMin !== undefined && item.confidence < filter.confidenceMin) return false;
    if (filter.status !== undefined && item.decision !== filter.status) return false;
    if (filter.provider !== undefined && item.patch.provider !== filter.provider) return false;
    if (filter.generator !== undefined && item.patch.generatedBy !== filter.generator) return false;
    if (filter.patchType !== undefined && item.patch.operation !== filter.patchType) return false;
    return true;
  });
}

function impactValue(item: ReviewItem): number {
  const match = item.estimatedImpact.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function compareBy(key: ReviewSortKey, a: ReviewItem, b: ReviewItem): number {
  switch (key) {
    case "confidence":
      return a.confidence - b.confidence;
    case "severity":
      return severityRank(a.severity) - severityRank(b.severity);
    case "impact":
      return impactValue(a) - impactValue(b);
    case "createdAt":
      return a.patch.createdAt.localeCompare(b.patch.createdAt);
    case "section":
      return a.section.localeCompare(b.section);
    default:
      return 0;
  }
}

/**
 * Sort review items by a key and direction (default descending).
 */
export function sortItems(
  items: ReviewItem[],
  by: ReviewSortKey,
  dir: ReviewSortDir = "desc",
): ReviewItem[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => factor * compareBy(by, a, b));
}
