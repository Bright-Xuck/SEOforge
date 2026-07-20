// @forge/content-intelligence
// OutputBuilder: deterministic output formatting.
// NO AI. NO text generation.

import type {
  ContentAnalysisOutput,
  ContentGraphOutput,
  GapReportOutput,
  OutputBuilderContract,
  OutputFormat,
  PageDNAOutput,
  PipelineOutput,
  QualityReportOutput,
} from "./types.js";

export class OutputBuilder implements OutputBuilderContract {
  public format: OutputFormat;

  constructor(format: OutputFormat = "json") {
    this.format = format;
  }

  setFormat(format: OutputFormat): OutputBuilderContract {
    this.format = format;
    return this;
  }

  buildAnalysis(data: Omit<ContentAnalysisOutput, "format">): ContentAnalysisOutput {
    return { ...data, format: this.format };
  }

  buildGraph(data: Omit<ContentGraphOutput, "format">): ContentGraphOutput {
    return { ...data, format: this.format };
  }

  buildDNA(data: Omit<PageDNAOutput, "format">): PageDNAOutput {
    return { ...data, format: this.format };
  }

  buildGaps(data: Omit<GapReportOutput, "format">): GapReportOutput {
    return { ...data, format: this.format };
  }

  buildQuality(data: Omit<QualityReportOutput, "format">): QualityReportOutput {
    return { ...data, format: this.format };
  }

  buildPipeline(data: Omit<PipelineOutput, "format">): PipelineOutput {
    return { ...data, format: this.format };
  }
}
