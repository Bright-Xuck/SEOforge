import { readWebsite } from "@forge/tools/website-reader";
import { analyzeHomepage } from "@forge/capabilities/homepage";
import { generateRecommendations } from "@forge/recommendation-engine";
import { generateExecutionPlan } from "@forge/action-engine";
import { validateExecutionPlan, createDefaultContext } from "@forge/preflight-validator";
import { execute, executeWithValidation } from "@forge/execution-engine";
import type { PipelineStepDefinition } from "./types.js";

export function createWebsiteReaderStep(url: string): PipelineStepDefinition {
  return {
    id: "website-reader",
    name: "Website Reader",
    version: "0.8.0",
    description: "Reads a website and produces a snapshot.",
    type: "website-reader",
    inputs: ["url"],
    outputs: ["snapshot"],
    dependencies: [],
    execute: async (context) => {
      const snapshot = await readWebsite(url);
      context.snapshot = snapshot;
      return snapshot;
    },
  };
}

export function createHomepageAnalysisStep(): PipelineStepDefinition {
  return {
    id: "homepage-analysis",
    name: "Homepage Analysis",
    version: "0.8.0",
    description: "Analyzes the homepage snapshot.",
    type: "homepage-analysis",
    inputs: ["snapshot"],
    outputs: ["analysisReport"],
    dependencies: ["website-reader"],
    execute: (context) => {
      if (!context.snapshot) {
        throw new Error("Pipeline context missing snapshot");
      }
      const report = analyzeHomepage(context.snapshot);
      context.findings = report;
      return report;
    },
  };
}

export function createRecommendationStep(): PipelineStepDefinition {
  return {
    id: "recommendation-engine",
    name: "Recommendation Engine",
    version: "0.8.0",
    description: "Generates recommendations from analysis findings.",
    type: "recommendation-engine",
    inputs: ["analysisReport"],
    outputs: ["recommendationReport"],
    dependencies: ["homepage-analysis"],
    execute: (context) => {
      if (!context.findings) {
        throw new Error("Pipeline context missing analysis report");
      }
      const report = generateRecommendations(context.findings);
      context.recommendations = report;
      return report;
    },
  };
}

export function createActionStep(): PipelineStepDefinition {
  return {
    id: "action-engine",
    name: "Action Engine",
    version: "0.8.0",
    description: "Creates an execution plan from recommendations.",
    type: "action-engine",
    inputs: ["recommendationReport"],
    outputs: ["executionPlan"],
    dependencies: ["recommendation-engine"],
    execute: (context) => {
      if (!context.recommendations) {
        throw new Error("Pipeline context missing recommendation report");
      }
      const plan = generateExecutionPlan(context.recommendations);
      context.executionPlan = plan;
      return plan;
    },
  };
}

export function createValidationStep(): PipelineStepDefinition {
  return {
    id: "preflight-validator",
    name: "Preflight Validator",
    version: "0.8.0",
    description: "Validates execution plans before execution.",
    type: "preflight-validator",
    inputs: ["executionPlan"],
    outputs: ["validationReport"],
    dependencies: ["action-engine"],
    execute: (context) => {
      if (!context.executionPlan) {
        throw new Error("Pipeline context missing execution plan");
      }
      const report = validateExecutionPlan(context.executionPlan, context.provider, createDefaultContext());
      context.validationReport = report;
      return report;
    },
  };
}

export function createExecutionStep(dryRun = true): PipelineStepDefinition {
  return {
    id: "execution-engine",
    name: "Execution Engine",
    version: "0.8.0",
    description: "Simulates or performs execution of an execution plan.",
    type: "execution-engine",
    inputs: ["executionPlan", "validationReport"],
    outputs: ["executionResult"],
    dependencies: ["preflight-validator"],
    execute: async (context) => {
      if (!context.executionPlan || !context.validationReport) {
        throw new Error("Pipeline context missing execution plan or validation report");
      }
      const result = dryRun
        ? await execute(context.executionPlan, context.provider, { dryRun: true, stopOnBlocked: true })
        : (await executeWithValidation(context.executionPlan, context.provider, context.validationReport)).execution;
      context.executionResult = result;
      return result;
    },
  };
}
