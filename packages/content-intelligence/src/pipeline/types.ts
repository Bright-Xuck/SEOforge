// @forge/content-intelligence
// Pipeline output type definitions (Hardening Phase).
// NO AI.

import type { ContentGraph, PageDNA, ContentGap, QualityScores } from "../types.js";

export type OutputFormat = "json" | "markdown" | "html";

export interface ContentAnalysisOutput {
  readonly format: OutputFormat;
  readonly pageType: PageDNA["pageType"];
  readonly intent: PageDNA["intent"];
  readonly audience: PageDNA["audience"];
  readonly topics: PageDNA["topics"];
  readonly entities: PageDNA["entities"];
}

export interface ContentGraphOutput {
  readonly format: OutputFormat;
  readonly graph: ContentGraph;
}

export interface PageDNAOutput {
  readonly format: OutputFormat;
  readonly dna: PageDNA;
}

export interface GapReportOutput {
  readonly format: OutputFormat;
  readonly gaps: ContentGap[];
}

export interface QualityReportOutput {
  readonly format: OutputFormat;
  readonly scores: QualityScores;
}

export interface PipelineOutput {
  readonly format: OutputFormat;
  readonly analysis?: ContentAnalysisOutput;
  readonly graph?: ContentGraphOutput;
  readonly dna?: PageDNAOutput;
  readonly gaps?: GapReportOutput;
  readonly quality?: QualityReportOutput;
}

export interface OutputBuilderContract {
  readonly format: OutputFormat;
  setFormat(format: OutputFormat): OutputBuilderContract;
  buildAnalysis(data: Omit<ContentAnalysisOutput, "format">): ContentAnalysisOutput;
  buildGraph(data: Omit<ContentGraphOutput, "format">): ContentGraphOutput;
  buildDNA(data: Omit<PageDNAOutput, "format">): PageDNAOutput;
  buildGaps(data: Omit<GapReportOutput, "format">): GapReportOutput;
  buildQuality(data: Omit<QualityReportOutput, "format">): QualityReportOutput;
  buildPipeline(data: Omit<PipelineOutput, "format">): PipelineOutput;
}
