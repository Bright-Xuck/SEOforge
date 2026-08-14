// @forge/content-intelligence
// Site analysis memory events (Sprint 24).
// Records meaningful site-level analysis events through the EXISTING memory
// system. This extends the existing memory event types (`site-analysis`);
// it does not invent a new event architecture.

import type { SiteAnalysisEvent, SiteIntelligenceReport } from "./types.js";

export interface SiteAnalysisEventOptions {
  readonly id?: string;
  readonly timestamp?: string;
}

/**
 * Build a memory event describing a site-level analysis run.
 * The shape matches @forge/memory-engine's MemoryEvent (type "site-analysis"),
 * so consumers append it through the existing MemoryStore.
 */
export function createSiteAnalysisMemoryEvent(
  project: string,
  report: SiteIntelligenceReport,
  options: SiteAnalysisEventOptions = {},
): SiteAnalysisEvent {
  return {
    id: options.id ?? `site-analysis-${Date.now()}`,
    type: "site-analysis",
    project,
    timestamp: options.timestamp ?? report.analyzedAt,
    payload: {
      baseUrl: report.baseUrl,
      analyzedAt: report.analyzedAt,
      summary: report.summary,
      authority: {
        overall: report.authority.overall,
        topicalCoverage: report.authority.topicalCoverage,
        internalLinking: report.authority.internalLinking,
        freshness: report.authority.freshness,
      },
      topOpportunities: report.opportunities.slice(0, 10).map((opportunity) => ({
        kind: opportunity.kind,
        title: opportunity.title,
        priority: opportunity.priority,
      })),
      refreshCandidates: report.refreshCandidates.map((candidate) => candidate.pageUrl),
    },
  };
}
