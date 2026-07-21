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
import type { PipelineContext, PipelineStepDefinition } from "./types.js";

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

// Sprint 17: Section Content Generation steps (AI, section-scoped only).
import { AIEngine, ProviderFactory } from "@forge/ai-engine";
import { PromptRegistry } from "@forge/prompt-registry";
import { generateContent } from "@forge/content-generation";
import type { ContentGenerationResult } from "@forge/content-generation";

function getEngine(context: PipelineContext): AIEngine {
  const provider = context.variables?.["provider"] as string | undefined ?? "openai";
  const model = context.variables?.["model"] as string | undefined;
  return new AIEngine(ProviderFactory.create({ provider: provider as never, model }));
}

function getRegistry(context: PipelineContext): PromptRegistry {
  const registry = new PromptRegistry();
  // In a full wiring, prompts would be loaded from storage; for Sprint 17 the
  // registry is seeded by the skills layer (Part 13). We accept an injected one.
  if (context.variables?.["registry"]) {
    return context.variables["registry"] as PromptRegistry;
  }
  return registry;
}

export function createSectionGenerationStep(): PipelineStepDefinition {
  return {
    id: "section-generation",
    name: "Section Generation",
    version: "1.7.0-beta.1",
    description: "Generates candidate section improvements via AI (section-scoped only).",
    type: "website-reader",
    inputs: ["contentIntelligence", "knowledge", "memory"],
    outputs: ["generationResult"],
    dependencies: ["content-intelligence", "knowledge-load"],
    execute: async (context) => {
      if (!context.contentIntelligence || !context.knowledge) {
        throw new Error("Pipeline context missing content intelligence or knowledge");
      }
      const engine = getEngine(context);
      const registry = getRegistry(context);
      const result = await generateContent(
        {
          project: context.project ?? "default",
          pageDNA: context.contentIntelligence.dna as never,
          sections: (context.contentIntelligence.dna as never as { sectionInventory: { sections: never[] } }).sectionInventory.sections,
          projectContext: context.projectProfile as never,
          brand: (context.knowledge as { brand?: never }).brand as never,
          targetKeyword: (context.variables?.["targetKeyword"] as string) ?? "",
          intent: context.variables?.["intent"] as never,
          audience: context.variables?.["audience"] as never,
        },
        {
          engine,
          registry,
          knowledge: context.knowledge as never,
          memory: (context.memorySummary ?? { project: context.project ?? "default", total: 0, byType: {}, lastEventAt: undefined }) as never,
          profile: context.projectProfile as never,
          brand: (context.knowledge as { brand?: never }).brand as never,
        },
      );
      context.outputs = { ...context.outputs, generationResult: result };
      return result;
    },
  };
}

export function createDiffGenerationStep(): PipelineStepDefinition {
  return {
    id: "diff-generation",
    name: "Diff Generation",
    version: "1.7.0-beta.1",
    description: "Builds section diffs for review.",
    type: "website-reader",
    inputs: ["generationResult"],
    outputs: ["sectionDiffs"],
    dependencies: ["section-generation"],
    execute: (context) => {
      const result = context.outputs?.["generationResult"] as ContentGenerationResult | undefined;
      if (!result) throw new Error("Pipeline context missing generation result");
      context.outputs = { ...context.outputs, sectionDiffs: result.diffs };
      return result.diffs;
    },
  };
}

export function createOutputValidationStep(): PipelineStepDefinition {
  return {
    id: "output-validation",
    name: "Output Validation",
    version: "1.7.0-beta.1",
    description: "Validates generated section content before packaging.",
    type: "website-reader",
    inputs: ["generationResult"],
    outputs: ["validationReport"],
    dependencies: ["section-generation"],
    execute: (context) => {
      const result = context.outputs?.["generationResult"] as ContentGenerationResult | undefined;
      if (!result) throw new Error("Pipeline context missing generation result");
      context.outputs = { ...context.outputs, validationReport: result.validation };
      return result.validation;
    },
  };
}

export function createPatchCreationStep(): PipelineStepDefinition {
  return {
    id: "patch-creation",
    name: "Patch Creation",
    version: "1.7.0-beta.1",
    description: "Packages generated sections into self-contained ContentPatches.",
    type: "website-reader",
    inputs: ["generationResult"],
    outputs: ["patches"],
    dependencies: ["section-generation"],
    execute: (context) => {
      const result = context.outputs?.["generationResult"] as ContentGenerationResult | undefined;
      if (!result) throw new Error("Pipeline context missing generation result");
      context.outputs = { ...context.outputs, patches: result.patches };
      return result.patches;
    },
  };
}

export function createPatchPackagingStep(): PipelineStepDefinition {
  return {
    id: "patch-packaging",
    name: "Patch Packaging",
    version: "1.7.0-beta.1",
    description: "Finalizes the ContentGenerationResult for preview/approval (no execution).",
    type: "website-reader",
    inputs: ["generationResult", "patches", "sectionDiffs", "validationReport"],
    outputs: ["contentGenerationResult"],
    dependencies: ["patch-creation", "diff-generation", "output-validation"],
    execute: (context) => {
      const result = context.outputs?.["generationResult"] as ContentGenerationResult | undefined;
      if (!result) throw new Error("Pipeline context missing generation result");
      context.outputs = { ...context.outputs, contentGenerationResult: result };
      return result;
    },
  };
}

// Sprint 18: Review Engine steps (deterministic, provider-independent, no AI).
import {
  createReviewSession,
  applyPolicy,
  filterItems,
  sortItems,
  computeMetrics,
  generateReport,
  type ReviewFilter,
  type ReviewPolicy,
  type ReviewSession,
  type ReviewSortKey,
} from "@forge/review-engine";
import type { ContentPatch } from "@forge/content-generation";

function getPatches(context: PipelineContext): ContentPatch[] {
  const patches = context.outputs?.["patches"] as ContentPatch[] | undefined;
  if (!patches || patches.length === 0) {
    throw new Error("Pipeline context missing patches");
  }
  return patches;
}

export function createReviewCreateStep(): PipelineStepDefinition {
  return {
    id: "review-create",
    name: "Review Create",
    version: "0.18.0",
    description: "Creates a review session from content patches (deterministic, no AI).",
    type: "review",
    inputs: ["patches"],
    outputs: ["reviewSession"],
    dependencies: ["patch-creation"],
    execute: (context) => {
      const patches = getPatches(context);
      const policy = (context.variables?.["reviewPolicy"] as ReviewPolicy | undefined) ?? undefined;
      const session = createReviewSession({
        projectId: context.project ?? "default",
        createdBy: (context.variables?.["createdBy"] as string) ?? "pipeline",
        patches,
        policy,
      });
      context.outputs = { ...context.outputs, reviewSession: session };
      return session;
    },
  };
}

export function createReviewFilterStep(): PipelineStepDefinition {
  return {
    id: "review-filter",
    name: "Review Filter",
    version: "0.18.0",
    description: "Filters review items by criteria.",
    type: "review",
    inputs: ["reviewSession"],
    outputs: ["reviewSession"],
    dependencies: ["review-create"],
    execute: (context) => {
      const session = context.outputs?.["reviewSession"] as ReviewSession | undefined;
      if (!session) throw new Error("Pipeline context missing review session");
      const filter = (context.variables?.["reviewFilter"] as ReviewFilter | undefined) ?? {};
      const filtered = filterItems(session.items, filter);
      const next = { ...session, items: filtered };
      context.outputs = { ...context.outputs, reviewSession: next };
      return next;
    },
  };
}

export function createReviewSortStep(): PipelineStepDefinition {
  return {
    id: "review-sort",
    name: "Review Sort",
    version: "0.18.0",
    description: "Sorts review items by a key and direction.",
    type: "review",
    inputs: ["reviewSession"],
    outputs: ["reviewSession"],
    dependencies: ["review-create"],
    execute: (context) => {
      const session = context.outputs?.["reviewSession"] as ReviewSession | undefined;
      if (!session) throw new Error("Pipeline context missing review session");
      const by = (context.variables?.["reviewSortBy"] as ReviewSortKey | undefined) ?? "confidence";
      const dir = (context.variables?.["reviewSortDir"] as "asc" | "desc" | undefined) ?? "desc";
      const sorted = sortItems(session.items, by, dir);
      const next = { ...session, items: sorted };
      context.outputs = { ...context.outputs, reviewSession: next };
      return next;
    },
  };
}

export function createReviewApproveStep(): PipelineStepDefinition {
  return {
    id: "review-approve",
    name: "Review Approve",
    version: "0.18.0",
    description: "Applies the review policy to auto-approve eligible items.",
    type: "review",
    inputs: ["reviewSession"],
    outputs: ["reviewSession"],
    dependencies: ["review-create"],
    execute: (context) => {
      const session = context.outputs?.["reviewSession"] as ReviewSession | undefined;
      if (!session) throw new Error("Pipeline context missing review session");
      const next = applyPolicy(session);
      context.outputs = { ...context.outputs, reviewSession: next };
      return next;
    },
  };
}

export function createReviewExportStep(): PipelineStepDefinition {
  return {
    id: "review-export",
    name: "Review Export",
    version: "0.18.0",
    description: "Exports a review session as Markdown/JSON/HTML.",
    type: "review",
    inputs: ["reviewSession"],
    outputs: ["reviewReport"],
    dependencies: ["review-create"],
    execute: (context) => {
      const session = context.outputs?.["reviewSession"] as ReviewSession | undefined;
      if (!session) throw new Error("Pipeline context missing review session");
      const report = generateReport(session);
      context.outputs = { ...context.outputs, reviewReport: report };
      return report;
    },
  };
}

export function createReviewSummaryStep(): PipelineStepDefinition {
  return {
    id: "review-summary",
    name: "Review Summary",
    version: "0.18.0",
    description: "Computes the review session summary.",
    type: "review",
    inputs: ["reviewSession"],
    outputs: ["reviewSummary"],
    dependencies: ["review-create"],
    execute: (context) => {
      const session = context.outputs?.["reviewSession"] as ReviewSession | undefined;
      if (!session) throw new Error("Pipeline context missing review session");
      context.outputs = { ...context.outputs, reviewSummary: session.summary };
      return session.summary;
    },
  };
}

export function createReviewMetricsStep(): PipelineStepDefinition {
  return {
    id: "review-metrics",
    name: "Review Metrics",
    version: "0.18.0",
    description: "Computes deterministic review metrics.",
    type: "review",
    inputs: ["reviewSession"],
    outputs: ["reviewMetrics"],
    dependencies: ["review-create"],
    execute: (context) => {
      const session = context.outputs?.["reviewSession"] as ReviewSession | undefined;
      if (!session) throw new Error("Pipeline context missing review session");
      const metrics = computeMetrics(session);
      context.outputs = { ...context.outputs, reviewMetrics: metrics };
      return metrics;
    },
  };
}
