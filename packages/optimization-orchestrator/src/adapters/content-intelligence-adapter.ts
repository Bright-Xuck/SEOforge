// @forge/optimization-orchestrator
// Adapter: wraps @forge/content-intelligence into the Engine interface

import type { Engine } from "../types.js";
import type { OptimizationContext } from "../context.js";
import {
  buildPageDNA,
  buildContentGraph,
  detectGaps,
  scoreQuality,
  detectSections,
} from "@forge/content-intelligence";
import type { SectionInfo, SectionKind } from "@forge/content-intelligence";
import { load } from "cheerio";

/**
 * Content Intelligence Engine adapter.
 *
 * Reads: websiteSnapshot from context
 * Writes: pageDNA, contentGraph, sections, gaps, qualityScores to context
 *
 * Deterministic — no AI, no providers, no side effects.
 */
export function createContentIntelligenceEngine(): Engine {
  return {
    type: "content-intelligence",
    async execute(ctx: Record<string, unknown>): Promise<Record<string, unknown>> {
      const context = ctx as OptimizationContext;
      const snapshot = context.websiteSnapshot as any;

      if (!snapshot) {
        // No snapshot — skip analysis, leave context unchanged
        return ctx;
      }

      // Load cheerio once for all deterministic functions
      const $ = load(snapshot.rawHtml || "");

      // Build Page DNA (deterministic)
      const pageDNA = buildPageDNA(snapshot, $);
      context.pageDNA = pageDNA;

      // Build Content Graph
      const contentGraph = buildContentGraph(snapshot, $);
      context.contentGraph = contentGraph;

      // Detect sections
      const detected = detectSections(snapshot, $);
      context.sections = detected;

      // Merge document-derived sections (real editable widgets) into the page
      // DNA inventory. These are authoritative for generation because they map
      // 1:1 to a writable field; heuristic sections remain available for gaps.
      const documentSections = (context.documentSections as SectionInfo[] | undefined) ?? [];
      if (documentSections.length > 0) {
        const presentKinds = new Set<SectionKind>([
          ...detected.present,
          ...documentSections.map((section) => section.kind),
        ]);
        const byId: Record<string, SectionInfo> = { ...detected.byId };
        for (const section of documentSections) byId[section.id] = section;
        context.pageDNA = {
          ...pageDNA,
          sectionInventory: {
            sections: [...documentSections, ...detected.sections.filter((s) => s.present)],
            present: [...presentKinds],
            missing: detected.missing.filter((kind) => !presentKinds.has(kind)),
            byId,
          },
        };
      }

      // Detect gaps
      const gaps = detectGaps(snapshot, $);
      context.gaps = gaps;

      // Score quality
      const qualityScores = scoreQuality(snapshot, $);
      context.qualityScores = qualityScores;

      return context;
    },
  };
}