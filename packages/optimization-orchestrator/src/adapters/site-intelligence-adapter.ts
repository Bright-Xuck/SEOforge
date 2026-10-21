// @forge/optimization-orchestrator
// Adapter: wraps site-level Content Intelligence (Sprint 24) into the Engine interface.
// Exposes site-level opportunities to the orchestrator workflow. It NEVER executes
// anything — no link modification, no content generation, no provider writes.

import type { Engine } from "../types.js";
import type { OptimizationContext } from "../context.js";
import { analyzeSite, rankPagePriorities } from "@forge/content-intelligence";
import type { SiteIntelligenceReport } from "@forge/content-intelligence";

/**
 * Site Intelligence Engine adapter.
 *
 * Reads:  websiteSnapshots (+ optional knowledge/memory/universalPages) from context
 * Writes: siteIntelligence, siteOpportunities, refreshCandidates,
 *         internalLinkOpportunities, topicCoverageGaps, pagePriorities to context
 *
 * Deterministic — no AI, no providers, no side effects. The orchestrator can
 * consume these opportunities and pass them into the existing workflow.
 */
export function createSiteIntelligenceEngine(): Engine {
  return {
    type: "site-intelligence",
    async execute(ctx: Record<string, unknown>): Promise<Record<string, unknown>> {
      const context = ctx as OptimizationContext;
      const snapshots = (context.websiteSnapshots ?? (context.websiteSnapshot ? [context.websiteSnapshot] : [])) as unknown[];

      if (snapshots.length === 0) {
        // No site snapshots — leave context unchanged (optional step).
        return ctx;
      }

      const report: SiteIntelligenceReport = analyzeSite(snapshots as never, {
        universalPages: context.universalPages as never,
        knowledge: context.knowledge as never,
        memory: context.memory as never,
      });

      context.siteIntelligence = report;
      context.siteOpportunities = report.opportunities;
      context.refreshCandidates = report.refreshCandidates;
      context.internalLinkOpportunities = report.internalLinkOpportunities;
      context.pagePriorities = rankPagePriorities(report);
      context.topicCoverageGaps = report.clusters
        .filter((cluster) => cluster.missingCoverage.length > 0)
        .map((cluster) => ({
          clusterId: cluster.id,
          primaryTopic: cluster.primaryTopic,
          missingCoverage: cluster.missingCoverage,
          coverageScore: cluster.coverageScore,
          pages: cluster.pages,
        }));

      return context;
    },
  };
}
