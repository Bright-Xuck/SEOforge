import { readWebsite } from "@forge/tools/website-reader";
import { analyzeHomepage } from "@forge/capabilities/homepage";
import { generateRecommendations } from "@forge/recommendation-engine";
import { generateExecutionPlan } from "@forge/action-engine";
import { validateExecutionPlan, createDefaultContext } from "@forge/preflight-validator";
import { execute, executeWithValidation } from "@forge/execution-engine";
import {
  createKnowledgeGraph,
  loadKnowledge,
  saveKnowledge,
  detectChanges,
  createProjectProfile,
} from "@forge/knowledge-engine";
import { loadMemory, saveMemory } from "@forge/memory-engine";
import type { WriteProvider } from "@forge/core";
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
      const report = generateRecommendations(context.findings as never);
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
      const plan = generateExecutionPlan(context.recommendations as never);
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
        ? await execute(context.executionPlan, context.provider as WriteProvider, { dryRun: true, stopOnBlocked: true })
        : (await executeWithValidation(context.executionPlan, context.provider as WriteProvider, context.validationReport)).execution;
      context.executionResult = result;
      return result;
    },
  };
}

export function createKnowledgeLoadStep(): PipelineStepDefinition {
  return {
    id: "knowledge-load",
    name: "Knowledge Load",
    version: "0.9.0",
    description: "Loads project knowledge from storage.",
    type: "website-reader",
    inputs: ["project", "rootDir"],
    outputs: ["knowledge"],
    dependencies: [],
    execute: async (context) => {
      const rootDir = context.rootDir ?? "projects";
      const project = context.project ?? "default";
      const knowledge = await loadKnowledge(rootDir, project);
      context.knowledge = knowledge;
      return knowledge;
    },
  };
}

export function createKnowledgeSaveStep(): PipelineStepDefinition {
  return {
    id: "knowledge-save",
    name: "Knowledge Save",
    version: "0.9.0",
    description: "Saves project knowledge to storage.",
    type: "website-reader",
    inputs: ["knowledge"],
    outputs: ["knowledge"],
    dependencies: ["knowledge-load"],
    execute: async (context) => {
      if (!context.knowledge) throw new Error("Pipeline context missing knowledge");
      const rootDir = context.rootDir ?? "projects";
      await saveKnowledge(rootDir, context.knowledge as ReturnType<typeof createKnowledgeGraph>);
      return context.knowledge;
    },
  };
}

export function createMemoryAppendStep(): PipelineStepDefinition {
  return {
    id: "memory-append",
    name: "Memory Append",
    version: "0.9.0",
    description: "Appends pipeline events to project memory.",
    type: "website-reader",
    inputs: ["project"],
    outputs: ["memory"],
    dependencies: ["knowledge-load"],
    execute: async (context) => {
      const rootDir = context.rootDir ?? "projects";
      const project = context.project ?? "default";
      const store = await loadMemory(rootDir, project);
      store.append({
        id: `memory-${Date.now()}`,
        type: "pipeline-execution",
        project,
        timestamp: new Date().toISOString(),
        payload: { pipeline: context.outputs ?? {} },
      });
      await saveMemory(rootDir, project, store);
      context.memory = { appended: true };
      return context.memory;
    },
  };
}

export function createChangeDetectionStep(): PipelineStepDefinition {
  return {
    id: "change-detection",
    name: "Change Detection",
    version: "0.9.0",
    description: "Detects changes between current and previous snapshots.",
    type: "website-reader",
    inputs: ["snapshot"],
    outputs: ["changes"],
    dependencies: ["website-reader", "knowledge-load"],
    execute: (context) => {
      if (!context.snapshot) throw new Error("Pipeline context missing snapshot");
      const previous = { pages: [] };
      const changes = detectChanges(
        { title: context.snapshot.pageTitle, metadata: { description: context.snapshot.metaDescription } },
        previous,
      );
      context.changes = changes;
      return changes;
    },
  };
}

export function createProjectProfileStep(): PipelineStepDefinition {
  return {
    id: "project-profile",
    name: "Project Profile",
    version: "0.9.0",
    description: "Combines knowledge with memory summary.",
    type: "website-reader",
    inputs: ["knowledge", "memory"],
    outputs: ["projectProfile"],
    dependencies: ["knowledge-load", "memory-append"],
    execute: async (context) => {
      if (!context.knowledge) throw new Error("Pipeline context missing knowledge");
      const rootDir = context.rootDir ?? "projects";
      const project = context.project ?? "default";
      const store = await loadMemory(rootDir, project);
      const profile = createProjectProfile(context.knowledge as ReturnType<typeof createKnowledgeGraph>, store.summarize(project));
      context.projectProfile = profile;
      return profile;
    },
  };
}

// Sprint 16: Content Intelligence steps (deterministic, no AI)
import { load as loadCheerio } from "cheerio";
import {
  buildPageDNA,
  buildContentGraph,
  detectGaps,
  scoreQuality,
  serializeContentSnapshot,
  OutputBuilder,
  type ContentSnapshot,
  type GapReportOutput,
  type PageDNAOutput,
  type ContentGraphOutput,
  type QualityReportOutput,
} from "@forge/content-intelligence";

export function createContentIntelligenceStep(): PipelineStepDefinition {
  return {
    id: "content-intelligence",
    name: "Content Intelligence",
    version: "0.16.0",
    description: "Builds deterministic Page DNA and content graph from a snapshot (no AI).",
    type: "website-reader",
    inputs: ["snapshot"],
    outputs: ["contentIntelligence"],
    dependencies: ["website-reader"],
    execute: (context) => {
      if (!context.snapshot) {
        throw new Error("Pipeline context missing snapshot");
      }
      const $ = loadCheerio(context.snapshot.rawHtml || "");
      const dna = buildPageDNA(context.snapshot, $);
      const graph = buildContentGraph(context.snapshot, $);
      const builder = new OutputBuilder();
      const dnaOutput: PageDNAOutput = builder.buildDNA({ dna });
      const graphOutput: ContentGraphOutput = builder.buildGraph({ graph });
      const snapshot: ContentSnapshot = serializeContentSnapshot(dna, graph, { source: "pipeline-engine" });
      const result = { dna: dnaOutput, graph: graphOutput, snapshot };
      context.contentIntelligence = result;
      return result;
    },
  };
}

export function createContentGapStep(): PipelineStepDefinition {
  return {
    id: "content-gap-detection",
    name: "Content Gap Detection",
    version: "0.16.0",
    description: "Detects content gaps deterministically (no AI).",
    type: "website-reader",
    inputs: ["snapshot"],
    outputs: ["contentGaps"],
    dependencies: ["website-reader"],
    execute: (context) => {
      if (!context.snapshot) {
        throw new Error("Pipeline context missing snapshot");
      }
      const $ = loadCheerio(context.snapshot.rawHtml || "");
      const gaps = detectGaps(context.snapshot, $);
      const builder = new OutputBuilder();
      const gapsOutput: GapReportOutput = builder.buildGaps({ gaps });
      context.outputs = { ...context.outputs, contentGaps: gapsOutput };
      return gapsOutput;
    },
  };
}

export function createContentQualityStep(): PipelineStepDefinition {
  return {
    id: "content-quality-scoring",
    name: "Content Quality Scoring",
    version: "0.16.0",
    description: "Scores content quality deterministically (no AI).",
    type: "website-reader",
    inputs: ["snapshot"],
    outputs: ["contentQuality"],
    dependencies: ["website-reader"],
    execute: (context) => {
      if (!context.snapshot) {
        throw new Error("Pipeline context missing snapshot");
      }
      const $ = loadCheerio(context.snapshot.rawHtml || "");
      const quality = scoreQuality(context.snapshot, $);
      const builder = new OutputBuilder();
      const qualityOutput: QualityReportOutput = builder.buildQuality({ scores: quality });
      context.outputs = { ...context.outputs, contentQuality: qualityOutput };
      return qualityOutput;
    },
  };
}
