import { ContextBuildError } from "@forge/ai-engine";
import type { AIContext, ContextBuilderInput } from "./types.js";

function summarize(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => summarize(item)).filter(Boolean).join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export class ContextBuilder {
  build(input: ContextBuilderInput): AIContext {
    if (!input.project.trim()) {
      throw new ContextBuildError("Context requires a project identifier.");
    }

    return {
      project: input.project,
      currentTask: input.currentTask,
      knowledgeSummary: summarize(input.knowledge),
      memorySummary: summarize(input.memory),
      projectProfileSummary: summarize(input.projectProfile),
      findingsSummary: summarize(input.findings),
      recommendationsSummary: summarize(input.recommendations),
      executionPlanSummary: summarize(input.executionPlan),
      validationReportSummary: summarize(input.validationReport),
      metadata: input.metadata ?? {},
    };
  }
}
