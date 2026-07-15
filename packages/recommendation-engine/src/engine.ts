// @forge/recommendation-engine/engine
// Recommendation engine that transforms AnalysisReport into RecommendationReport.

import type { AnalysisReport, FindingId, Priority, Recommendation, RecommendationReport } from "@forge/core";
import { generateRecommendation } from "./generators/index.js";

/**
 * Generates recommendations from an analysis report.
 * Each finding maps to exactly one recommendation generator.
 * Deterministic - no AI, no templates.
 */
export function generateRecommendations(report: AnalysisReport): RecommendationReport {
  const recommendations: Recommendation[] = [];
  const counter = new Map<FindingId, number>();

  for (const finding of report.findings) {
    const rec = generateRecommendation(finding.id as FindingId);
    if (rec) {
      // Create unique ID with counter
      const count = counter.get(finding.id as FindingId) || 0;
      counter.set(finding.id as FindingId, count + 1);
      
      recommendations.push({
        ...rec,
        id: `rec_${finding.id}_${count + 1}`,
      });
    }
  }

  const priorityBreakdown = recommendations.reduce(
    (acc, rec) => {
      acc[rec.priority] = (acc[rec.priority] || 0) + 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 } as Record<Priority, number>,
  );

  const totalMinutes = recommendations.reduce((total, rec) => {
    const match = rec.estimatedTime.match(/(\d+)/);
    return total + (match && match[1] ? parseInt(match[1], 10) : 0);
  }, 0);

  const estimatedEffort = formatEstimatedEffort(totalMinutes);

  return {
    url: report.url,
    generatedAt: new Date().toISOString(),
    recommendations,
    summary: {
      total: recommendations.length,
      byPriority: priorityBreakdown,
    },
    estimatedEffort,
    priorityBreakdown,
  };
}

/**
 * Format estimated effort in human-readable form.
 */
function formatEstimatedEffort(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMinutes} minutes`;
}