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
      const sections = detectSections(snapshot, $);
      context.sections = sections;

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