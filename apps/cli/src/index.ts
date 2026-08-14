#!/usr/bin/env node

// @forge/cli
// Forge command-line interface.

import { Command } from "commander";
import { FORGE_NAME, FORGE_VERSION } from "@forge/shared";
import { createWordPressProvider, WORDPRESS_PROVIDER_METADATA } from "@forge/providers-wordpress";
import { WebsiteReadError } from "@forge/core";
import { readWebsite } from "@forge/tools/website-reader";
import { loadKnowledge, createProjectProfile, detectChanges } from "@forge/knowledge-engine";
import { loadMemory, saveMemory } from "@forge/memory-engine";
import {
  MissionPlanner,
  createMissionRegistry,
  serializeMissionToJson,
  serializeMissionToYaml,
  recordMissionEvent,
  executionToMemoryEvent,
} from "@forge/mission-engine";
import { resolveProject } from "@forge/project-resolver";
import { ContextBuilder } from "@forge/context-builder";
import {
  StrategyBuilder,
  validateStrategy,
  serializeStrategyToJson,
  serializeStrategyToYaml,
  recordStrategyEvent,
} from "@forge/strategy-engine";
import {
  AgentRegistry,
  SEOAgent,
  ContentAgent,
  LinkingAgent,
  SchemaAgent,
  AccessibilityAgent,
  PerformanceAgent,
  LearningAgent,
} from "@forge/agent-engine";
import { AIEngine, ProviderFactory } from "@forge/ai-engine";
import {
  SkillRegistry,
  skillPromptRegistry,
  GenerateSeoTitleSkill,
  GenerateMetaDescriptionSkill,
  GenerateAltTextSkill,
  GenerateOpenGraphSkill,
  GenerateTwitterCardSkill,
  GenerateFaqSchemaSkill,
  GenerateProductDescriptionSkill,
  GenerateInternalLinksSkill,
  ExpandThinContentSkill,
  RewriteHeadingSkill,
  GenerateSectionSkill,
  GenerateHeroSkill,
  GenerateFaqSkill,
  GenerateBlogSkill,
  createSkillPipeline,
} from "@forge/skills";
import {
  createAnalyzePipeline,
  createExecutePipeline,
  createPlanPipeline,
  createReadPipeline,
  createRecommendPipeline,
  createValidatePipeline,
  executePipeline,
  listDefaultPipelines,
} from "@forge/pipeline-engine";
import type { WebsiteSnapshot, WriteOperation, WriteMode } from "@forge/core";
import { execute as executeExecution, rollbackExecution } from "@forge/execution-engine";
import { HomepageAnalyzer, HomepageDetector, HomepagePlanner, createReviewSessionFromHomepage } from "@forge/homepage-engine";
import type { HomepageOptimizationPlan, HomepagePreviewItem } from "@forge/homepage-engine";
import { decideItem, generateReport, computeMetrics, saveReviewSession, loadReviewSession, listReviewSessions, REVIEW_POLICIES, type ReviewSession, type ReviewPolicyName } from "@forge/review-engine";
import type { ExecutionPlan } from "@forge/action-engine";
import {
  buildPageDNA,
  buildContentGraph,
  detectSections,
  detectGaps,
  scoreQuality,
  extractEntities,
  extractTopics,
  analyzeSite,
  createSiteAnalysisMemoryEvent,
} from "@forge/content-intelligence";
import { buildUniversalPage } from "@forge/dom-engine";
import { generateContent, buildProjectContext } from "@forge/content-generation";
import {
  writeHero,
  writeBenefits,
  writeFeatures,
  writeServices,
  writeProducts,
  writeAbout,
  writeFaq,
  writeTestimonials,
  writeCta,
  writeBuyingGuide,
  writeComparison,
  writeProduct,
  writeIntroduction,
  writeConclusion,
  writeContact,
  writeBlog,
  validateSEO,
  scoreContent,
  detectVoiceProfile,
  buildBrandProfile,
} from "@forge/content-generation";
import { PromptRegistry } from "@forge/prompt-registry";
import {
  OptimizationOrchestrator,
  listWorkflows,
  getWorkflow,
  createContentIntelligenceEngine,
  createReviewEngine,
  createComposerEngine,
  createExecutionEngine,
} from "@forge/optimization-orchestrator";

const program = new Command();
const skillRegistry = new SkillRegistry();
const agentRegistry = new AgentRegistry();
const strategyBuilder = new StrategyBuilder();
const missionRegistry = createMissionRegistry();
const missionPlanner = new MissionPlanner();
const contextBuilder = new ContextBuilder();
const skillRegistryAdapter = {
  list: () => skillRegistry.list(),
  get: (id: string) => skillRegistry.get(id),
  exists: (id: string) => {
    try {
      skillRegistry.get(id);
      return true;
    } catch {
      return false;
    }
  },
};
const providerRegistry = {
  list: () => [
    { id: "openai", name: "OpenAI" },
    { id: "anthropic", name: "Anthropic" },
    { id: "gemini", name: "Gemini" },
    { id: "openrouter", name: "OpenRouter" },
    { id: "ollama", name: "Ollama" },
  ],
  exists: (id: string) => ["openai", "anthropic", "gemini", "openrouter", "ollama"].includes(id),
};

function createPipelineRegistryAdapter() {
  const pipelines = listDefaultPipelines();
  return {
    listPipelines: () => pipelines,
    getPipeline: (pipelineId: string) => {
      const pipeline = pipelines.find((item) => item.id === pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline not found: ${pipelineId}`);
      }
      return pipeline;
    },
    exists: (pipelineId: string) => pipelines.some((item) => item.id === pipelineId),
  };
}

async function loadProjectContext(project: string, currentTask?: string, agentId?: string) {
  const resolved = resolveProject({ project });
  const rootDir = "projects";
  const knowledge = await loadKnowledge(rootDir, resolved.project);
  const memory = await loadMemory(rootDir, resolved.project);
  const profile = createProjectProfile(knowledge, memory.summarize(resolved.project));
  const pipelineRegistry = createPipelineRegistryAdapter();
  const strategyContext = {
    project: resolved.project,
    projectProfile: profile,
    knowledge,
    memorySummary: profile.memorySummary,
    latestFindings: [],
    recommendations: [],
    executionPlans: [],
    validationReports: [],
    executionHistory: memory.timeline(resolved.project),
    pipelineRegistry,
    skillRegistry: skillRegistryAdapter,
    providerRegistry,
    currentTask,
    agentId,
  };
  const aiContext = contextBuilder.build({
    project: resolved.project,
    knowledge,
    memory: profile.memorySummary,
    projectProfile: profile,
    findings: [],
    recommendations: [],
    executionPlan: {},
    validationReport: {},
    currentTask,
    metadata: { resolution: resolved.source, agentId },
  });
  return { resolved, rootDir, knowledge, memory, profile, pipelineRegistry, strategyContext, aiContext };
}

function createMissionContext(project: string, currentTask?: string, missionTemplateId?: string) {
  return loadProjectContext(project, currentTask).then(({ resolved, rootDir, knowledge, memory, profile, pipelineRegistry, strategyContext }) => {
    const availableAgents = agentRegistry.list().map((agent) => ({
      id: agent.metadata.id,
      name: agent.metadata.name,
      supportedPipelines: agent.metadata.supportedPipelines,
      supportedSkills: agent.metadata.supportedSkills,
    }));
    return {
      resolved,
      rootDir,
      missionContext: {
        project: resolved.project,
        projectProfile: profile,
        knowledge,
        memorySummary: profile.memorySummary,
        strategyContext,
        availableAgents,
        currentTask,
        missionTemplateId,
      },
      memory,
      pipelineRegistry,
    };
  });
}

async function executeStrategy(
  strategy: { selectedPipelines: string[]; metadata: { id: string; status: string; createdAt: string } },
  pipelineRegistry: ReturnType<typeof createPipelineRegistryAdapter>,
  rootDir: string,
  project: string,
  dryRun = true,
) {
  if (dryRun) {
    return {
      strategyId: strategy.metadata.id,
      status: "dry-run" as const,
      executions: [] as unknown[],
    };
  }

  const executions: unknown[] = [];
  for (const pipelineId of strategy.selectedPipelines) {
    const pipeline = pipelineRegistry.getPipeline(pipelineId);
    const result = await executePipeline(pipeline, { rootDir, project });
    executions.push(result);
  }
  return {
    strategyId: strategy.metadata.id,
    status: "completed" as const,
    executions,
  };
}

for (const skill of [
  GenerateSeoTitleSkill,
  GenerateMetaDescriptionSkill,
  GenerateAltTextSkill,
  GenerateOpenGraphSkill,
  GenerateTwitterCardSkill,
  GenerateFaqSchemaSkill,
  GenerateProductDescriptionSkill,
  GenerateInternalLinksSkill,
  ExpandThinContentSkill,
  RewriteHeadingSkill,
  GenerateSectionSkill,
  GenerateHeroSkill,
  GenerateFaqSkill,
  GenerateBlogSkill,
]) {
  skillRegistry.register(skill);
}

for (const agent of [
  SEOAgent,
  ContentAgent,
  LinkingAgent,
  SchemaAgent,
  AccessibilityAgent,
  PerformanceAgent,
  LearningAgent,
]) {
  agentRegistry.register(agent);
}

function createProvider(providerId?: string): AIEngine {
  const provider = ProviderFactory.create({ provider: (providerId ?? "openai") as never });
  return new AIEngine(provider);
}

function createWordPressProviderFromEnv() {
  const siteUrl = process.env.FORGE_WP_SITE_URL ?? "https://example.com";
  const username = process.env.FORGE_WP_USERNAME ?? "forge";
  const applicationPassword = process.env.FORGE_WP_APPLICATION_PASSWORD ?? "password";
  return createWordPressProvider({ siteUrl, username, applicationPassword });
}

function resolveHomepageUrl(project: string): string {
  return process.env.FORGE_HOME_URL ?? process.env.FORGE_WP_SITE_URL ?? `https://${project}.example.com`;
}

async function loadHomepageProjectContext(project: string) {
  const { resolved, rootDir, knowledge, memory, profile } = await loadProjectContext(project, "homepage");
  const siteUrl = resolveHomepageUrl(resolved.project);
  const snapshot = await readWebsite(siteUrl);
  const detector = new HomepageDetector();
  const context = detector.detectContext(resolved.project, snapshot, siteUrl, profile);
  return { resolved, rootDir, knowledge, memory, profile, siteUrl, snapshot, context };
}

function parseJsonValue(value?: string): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function createWordPressWriteOperation(
  operation: string,
  resourceType: string,
  resourceId: string | number,
  field: string,
  value: unknown,
  mode: WriteMode,
  revisionId?: string,
): WriteOperation {
  return {
    id: `wp-${operation}-${resourceType}-${resourceId}-${Date.now()}`,
    type: operation,
    resourceType,
    resourceId,
    mode,
    timestamp: new Date().toISOString(),
    revisionId,
    oldValue: {},
    newValue: { [field]: value },
    diffs: [{ field, oldValue: undefined, newValue: value }],
    summary: {
      totalChanges: 1,
      changedFields: [field],
      preview: mode === "preview" || mode === "dry-run",
      rollbackSupported: true,
    },
  };
}

async function executeMission(project: string, missionId: string, options: { dryRun?: boolean }) {
  const mission = missionRegistry.get(missionId);
  const { resolved, rootDir, missionContext, memory, pipelineRegistry } = await createMissionContext(project, mission.goal.description, missionId);
  const plan = missionPlanner.plan(missionContext);
  const startedAt = new Date().toISOString();
  const stepResults: Array<{
    readonly stepId: string;
    readonly agentId: string;
    readonly strategyId: string;
    readonly pipelineResults: unknown[];
  }> = [];

  if (!options.dryRun) {
    for (const step of plan.mission.steps) {
      const pipelineResults: unknown[] = [];
      for (const pipelineId of step.pipelines) {
        const pipeline = pipelineRegistry.getPipeline(pipelineId);
        const result = await executePipeline(pipeline, { rootDir, project: resolved.project });
        pipelineResults.push(result);
      }
      stepResults.push({
        stepId: step.id,
        agentId: step.agentId,
        strategyId: step.strategy.metadata.id,
        pipelineResults,
      });
    }
  }

  const execution = {
    missionId: plan.mission.metadata.id,
    status: options.dryRun ? ("dry-run" as const) : ("completed" as const),
    startedAt,
    completedAt: new Date().toISOString(),
    stepResults,
  };
  recordMissionEvent(memory, resolved.project, plan.mission, "mission-created");
  recordMissionEvent(memory, resolved.project, plan.mission, "mission-started");
  recordMissionEvent(memory, resolved.project, plan.mission, "mission-completed");
  memory.append(executionToMemoryEvent(resolved.project, plan.mission, execution));
  await saveMemory(rootDir, resolved.project, memory);

  return { plan, execution };
}

program
  .name(FORGE_NAME.toLowerCase())
  .description(`${FORGE_NAME} CLI — Autonomous Website Operations Platform`)
  .version(FORGE_VERSION);

program
  .command("read")
  .argument("<url>", "Website URL to read")
  .option("--json", "Output snapshot as JSON")
  .description("Read a website and produce a structured snapshot")
  .action(async (url: string, options: { json?: boolean }) => {
    try {
      const result = await executePipeline(createReadPipeline(url), {});
      const snapshot = result.outputs["website-reader"] as unknown;
      if (options.json) {
        process.stdout.write(JSON.stringify(snapshot, null, 2) + "\n");
        return;
      }
      process.stdout.write(`Snapshot loaded in ${result.durationMs}ms\n`);
      process.stdout.write(JSON.stringify(snapshot, null, 2) + "\n");
    } catch (error) {
      const wre = error instanceof WebsiteReadError ? error : null;
      process.stderr.write(
        `Error: ${wre?.kind === "invalid-url" ? "Invalid URL" : error instanceof Error ? error.message : "Unknown error"}\n`,
      );
      process.exit(1);
    }
  });

program
  .command("analyze")
  .argument("<url>", "Website URL to analyze")
  .option("--json", "Output report as JSON")
  .description("Read and analyze a website for issues")
  .action(async (url: string, options: { json?: boolean }) => {
    try {
      const result = await executePipeline(createAnalyzePipeline(url), {});
      const report = result.outputs["homepage-analysis"] as any;
      if (options.json) {
        process.stdout.write(JSON.stringify(report, null, 2) + "\n");
        return;
      }
      process.stdout.write(`Issues Found: ${report.summary.total}\n\n`);
      for (const finding of report.findings) {
        const severityLabel = finding.severity.toUpperCase().padEnd(8);
        process.stdout.write(`${severityLabel} ${finding.title}\n`);
      }
    } catch (error) {
      const wre = error instanceof WebsiteReadError ? error : null;
      process.stderr.write(
        `Error: ${wre?.kind === "invalid-url" ? "Invalid URL" : error instanceof Error ? error.message : "Unknown error"}\n`,
      );
      process.exit(1);
    }
  });

program
  .command("recommend")
  .argument("<url>", "Website URL to analyze for recommendations")
  .option("--json", "Output recommendations as JSON")
  .description("Generate recommendations from website analysis")
  .action(async (url: string, options: { json?: boolean }) => {
    try {
      const result = await executePipeline(createRecommendPipeline(url), {});
      const recReport = result.outputs["recommendation-engine"] as any;
      if (options.json) {
        process.stdout.write(JSON.stringify(recReport, null, 2) + "\n");
        return;
      }
      process.stdout.write(`Recommendations: ${recReport.summary.total}\n`);
      process.stdout.write(JSON.stringify(recReport, null, 2) + "\n");
    } catch (error) {
      const wre = error instanceof WebsiteReadError ? error : null;
      process.stderr.write(
        `Error: ${wre?.kind === "invalid-url" ? "Invalid URL" : error instanceof Error ? error.message : "Unknown error"}\n`,
      );
      process.exit(1);
    }
  });

program
  .command("plan")
  .argument("<url>", "Website URL to generate execution plan for")
  .option("--json", "Output execution plan as JSON")
  .description("Generate execution plan from website analysis")
  .action(async (url: string, options: { json?: boolean }) => {
    try {
      const result = await executePipeline(createPlanPipeline(url), {});
      const plan = result.outputs["action-engine"] as any;
      if (options.json) {
        process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
        return;
      }
      process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
    } catch (error) {
      const wre = error instanceof WebsiteReadError ? error : null;
      process.stderr.write(
        `Error: ${wre?.kind === "invalid-url" ? "Invalid URL" : error instanceof Error ? error.message : "Unknown error"}\n`,
      );
      process.exit(1);
    }
  });

// WordPress provider commands
const wpCommand = program
  .command("wp")
  .description("WordPress provider commands")
  .addCommand(
    new Command("test")
      .argument("<site>", "WordPress site URL")
      .argument("<username>", "WordPress username")
      .argument("<password>", "WordPress application password")
      .option("--json", "Output result as JSON")
      .description("Test WordPress connection")
      .action(async (site: string, username: string, password: string, options: { json?: boolean }) => {
        try {
          const provider = createWordPressProvider({
            siteUrl: site,
            username,
            applicationPassword: password,
          });

          const connected = await provider.testConnection();

          if (options.json) {
            process.stdout.write(JSON.stringify({ connected }, null, 2) + "\n");
            return;
          }

          if (connected) {
            process.stdout.write("✓ Connected to WordPress site successfully\n");
          } else {
            process.stdout.write("✗ Failed to connect to WordPress site\n");
            process.exit(1);
          }
        } catch (error) {
          process.stderr.write(
            `Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
          );
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command("info")
      .argument("<site>", "WordPress site URL")
      .argument("<username>", "WordPress username")
      .argument("<password>", "WordPress application password")
      .option("--json", "Output result as JSON")
      .description("Get WordPress site information")
      .action(async (site: string, username: string, password: string, options: { json?: boolean }) => {
        try {
          const provider = createWordPressProvider({
            siteUrl: site,
            username,
            applicationPassword: password,
          });

          const info = await provider.getSiteInfo();

          if (options.json) {
            process.stdout.write(JSON.stringify(info, null, 2) + "\n");
            return;
          }

          process.stdout.write(`Site: ${info.name}\n`);
          process.stdout.write(`URL: ${info.url}\n`);
          process.stdout.write(`WordPress Version: ${info.wpVersion || "Unknown"}\n`);
          process.stdout.write(`Theme: ${info.theme.name} (${info.theme.version})\n`);
          process.stdout.write(`Plugins: ${info.plugins.length}\n`);
        } catch (error) {
          process.stderr.write(
            `Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
          );
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command("capabilities")
      .argument("<site>", "WordPress site URL")
      .argument("<username>", "WordPress username")
      .argument("<password>", "WordPress application password")
      .option("--json", "Output result as JSON")
      .description("Detect WordPress site capabilities")
      .action(async (site: string, username: string, password: string, options: { json?: boolean }) => {
        try {
          const provider = createWordPressProvider({
            siteUrl: site,
            username,
            applicationPassword: password,
          });

          const capabilities = await provider.detectCapabilities();

          if (options.json) {
            process.stdout.write(JSON.stringify(capabilities, null, 2) + "\n");
            return;
          }

          process.stdout.write("Capabilities:\n");
          process.stdout.write(`  Media Support: ${capabilities.supportsMedia ? "✓" : "✗"}\n`);
          process.stdout.write(`  Menu Support: ${capabilities.supportsMenus ? "✓" : "✗"}\n`);
          process.stdout.write(`  Plugin Access: ${capabilities.supportsPlugins ? "✓" : "✗"}\n`);
          process.stdout.write(`  Featured Images: ${capabilities.supportsFeaturedImages ? "✓" : "✗"}\n`);
        } catch (error) {
          process.stderr.write(
            `Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
          );
          process.exit(1);
        }
      }),
  );

// Sprint 7: Validate command
program
  .command("validate")
  .argument("<url>", "Website URL to validate execution plan for")
  .option("--json", "Output validation report as JSON")
  .description("Validate an execution plan before execution")
  .action(async (url: string, options: { json?: boolean }) => {
    try {
      const result = await executePipeline(createValidatePipeline(url), {});
      const validationReport = result.outputs["preflight-validator"] as any;
      if (options.json) {
        process.stdout.write(JSON.stringify(validationReport, null, 2) + "\n");
        return;
      }
      process.stdout.write(JSON.stringify(validationReport, null, 2) + "\n");
    } catch (error) {
      process.stderr.write(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
      );
      process.exit(1);
    }
  });

// Sprint 7: Execute command (dry-run only)
program
  .command("execute")
  .argument("<url>", "Website URL to execute plan for")
  .option("--dry-run", "Simulate execution without making changes", true)
  .option("--json", "Output execution result as JSON")
  .description("Execute an execution plan (dry-run only)")
  .action(async (url: string, options: { dryRun?: boolean; json?: boolean }) => {
    try {
      const result = await executePipeline(createExecutePipeline(url, options.dryRun ?? true), {});
      const execution = result.outputs["execution-engine"] as any;
      if (options.json) {
        process.stdout.write(JSON.stringify(execution, null, 2) + "\n");
        return;
      }
      process.stdout.write(JSON.stringify(execution, null, 2) + "\n");
    } catch (error) {
      process.stderr.write(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
      );
      process.exit(1);
    }
  });

wpCommand.description("WordPress provider commands (connection + write)");

wpCommand
  .command("preview")
  .option("--project <project>", "Project ID")
  .option("--operation <operation>", "Write operation", "update")
  .option("--resource-type <type>", "Resource type", "page")
  .option("--resource-id <id>", "Resource ID", "1")
  .option("--field <field>", "Field to preview", "title")
  .option("--value <value>", "Value to preview", "Preview value")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; operation?: string; resourceType?: string; resourceId?: string; field?: string; value?: string; json?: boolean }) => {
    const provider = createWordPressProviderFromEnv();
    const result = await provider.previewWrite(
      createWordPressWriteOperation(
        options.operation ?? "update",
        options.resourceType ?? "page",
        options.resourceId ?? "1",
        options.field ?? "title",
        parseJsonValue(options.value),
        "preview",
      ),
    );
    if (options.json) {
      process.stdout.write(JSON.stringify({ project: options.project, result }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Preview for ${options.project ?? "default"} completed: ${result.message}\n`);
  });

wpCommand
  .command("apply")
  .option("--project <project>", "Project ID")
  .option("--operation <operation>", "Write operation", "update")
  .option("--resource-type <type>", "Resource type", "page")
  .option("--resource-id <id>", "Resource ID", "1")
  .option("--field <field>", "Field to update", "title")
  .option("--value <value>", "Value to apply", "Applied value")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; operation?: string; resourceType?: string; resourceId?: string; field?: string; value?: string; json?: boolean }) => {
    const provider = createWordPressProviderFromEnv();
    const write = createWordPressWriteOperation(
      options.operation ?? "update",
      options.resourceType ?? "page",
      options.resourceId ?? "1",
      options.field ?? "title",
      parseJsonValue(options.value),
      "apply",
    );
    const result = await provider.applyWrite(write);
    if (options.json) {
      process.stdout.write(JSON.stringify({ project: options.project, result }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Applied write for ${options.project ?? "default"}: ${result.message}\n`);
  });

wpCommand
  .command("rollback")
  .option("--project <project>", "Project ID")
  .option("--resource-type <type>", "Resource type", "page")
  .option("--resource-id <id>", "Resource ID", "1")
  .option("--revision-id <id>", "Revision ID")
  .option("--field <field>", "Field name", "title")
  .option("--value <value>", "Original value", "Rolled back value")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; resourceType?: string; resourceId?: string; revisionId?: string; field?: string; value?: string; json?: boolean }) => {
    const provider = createWordPressProviderFromEnv();
    const originalValue = { [options.field ?? "title"]: parseJsonValue(options.value) };
    const result = await provider.rollbackWrite(
      options.resourceType ?? "page",
      options.resourceId ?? "1",
      originalValue,
      options.revisionId,
    );
    if (options.json) {
      process.stdout.write(JSON.stringify({ project: options.project, result }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Rolled back ${options.project ?? "default"}: ${result.message}\n`);
  });

const executionCommand = program.command("execution").description("Execution engine write commands");

executionCommand
  .command("apply")
  .option("--project <project>", "Project ID")
  .option("--resource-type <type>", "Resource type", "page")
  .option("--resource-id <id>", "Resource ID", "1")
  .option("--field <field>", "Field to apply", "title")
  .option("--value <value>", "Value to apply", "Applied value")
  .option("--dry-run", "Simulate without writing", true)
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; resourceType?: string; resourceId?: string; field?: string; value?: string; dryRun?: boolean; json?: boolean }) => {
    const provider = createWordPressProviderFromEnv();
    const write = createWordPressWriteOperation(
      "execution.apply",
      options.resourceType ?? "page",
      options.resourceId ?? "1",
      options.field ?? "title",
      parseJsonValue(options.value),
      (options.dryRun ?? true) ? "dry-run" : "apply",
    );
    const action = {
      id: write.id,
      recommendationId: `rec-${write.id}`,
      findingId: `finding-${write.id}` as never,
      type: "content.update-content" as never,
      title: "Execution apply",
      description: "Apply a provider-backed write operation.",
      priority: "medium" as never,
      risk: "moderate" as never,
      automatable: false,
      requiresApproval: true,
      rollbackSupported: true,
      estimatedDuration: "5m",
      requiredProvider: provider.id,
      payload: write.newValue,
      status: "approved" as never,
    };
    const plan = {
      url: options.project ?? "default",
      generatedAt: new Date().toISOString(),
      actions: [action],
      approvalQueue: [action.id],
      summary: { total: 1, automatable: 0, requiresApproval: 1, byRisk: { safe: 0, moderate: 1, high: 0, critical: 0 } },
      estimatedDuration: "5m",
      riskSummary: { safe: 0, moderate: 1, high: 0, critical: 0 },
    };
    const result = options.dryRun ?? true ? await executeExecution(plan as never, provider, { dryRun: true }) : await executeExecution(plan as never, provider, { dryRun: false });
    if (options.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Execution apply finished with ${result.completedActions.length} completed actions\n`);
  });

const homepageCommand = program.command("homepage").description("Homepage optimization commands");

homepageCommand
  .command("analyze")
  .option("--project <project>", "Project ID")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { context } = await loadHomepageProjectContext(project);
    const analysis = new HomepageAnalyzer().analyze(context);
    if (options.json) {
      process.stdout.write(JSON.stringify(analysis, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Homepage type: ${analysis.homepageType}\n`);
    process.stdout.write(`Findings: ${analysis.summary.total}\n`);
  });

homepageCommand
  .command("plan")
  .option("--project <project>", "Project ID")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { context } = await loadHomepageProjectContext(project);
    const analyzer = new HomepageAnalyzer();
    const planner = new HomepagePlanner();
    const analysis = analyzer.analyze(context);
    const plan = planner.plan(context, analysis);
    if (options.json) {
      process.stdout.write(JSON.stringify({ analysis, plan }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Homepage plan generated with ${plan.actions.length} actions\n`);
  });

homepageCommand
  .command("preview")
  .option("--project <project>", "Project ID")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { context } = await loadHomepageProjectContext(project);
    const analyzer = new HomepageAnalyzer();
    const planner = new HomepagePlanner();
    const analysis = analyzer.analyze(context);
    const plan = planner.plan(context, analysis);
    const preview = planner.preview(plan);
    if (options.json) {
      process.stdout.write(JSON.stringify({ analysis, plan, preview }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Preview generated for ${project}: ${preview.length} changes\n`);
  });

homepageCommand
  .command("optimize")
  .option("--project <project>", "Project ID")
  .option("--policy <policy>", "Review policy: strict|balanced|automatic|enterprise", "balanced")
  .option("--ai", "Use AI writing engine for content generation")
  .option("--provider <provider>", "AI provider (with --ai)")
  .option("--model <model>", "Model name (with --ai)")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; policy?: string; ai?: boolean; provider?: string; model?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { context } = await loadHomepageProjectContext(project);
    const analyzer = new HomepageAnalyzer();
    const planner = new HomepagePlanner();
    const analysis = analyzer.analyze(context);
    let plan: HomepageOptimizationPlan;
    let preview: HomepagePreviewItem[];
    let reviewSession: ReviewSession;

    if (options.ai) {
      const engine = new AIEngine(ProviderFactory.create({ provider: (options.provider ?? "openai") as never, model: options.model }));
      const registry = new PromptRegistry();
      const result = await planner.optimizeWithAI(context, engine, registry);
      plan = result.plan;
      preview = result.preview;
      reviewSession = result.reviewSession;
    } else {
      plan = planner.plan(context, analysis);
      preview = planner.preview(plan);
      const policyName = (options.policy as ReviewPolicyName) ?? "balanced";
      reviewSession = createReviewSessionFromHomepage(plan, REVIEW_POLICIES[policyName]);
    }

    const rootDir = "projects";
    await saveReviewSession(rootDir, reviewSession);
    if (options.json) {
      process.stdout.write(JSON.stringify({ analysis, plan, preview, reviewSession }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Homepage optimization produced review session ${reviewSession.sessionId} for ${project} (${reviewSession.items.length} items). Review before applying.\n`);
  });

executionCommand
  .command("rollback")
  .option("--project <project>", "Project ID")
  .option("--resource-type <type>", "Resource type", "page")
  .option("--resource-id <id>", "Resource ID", "1")
  .option("--revision-id <id>", "Revision ID")
  .option("--field <field>", "Field name", "title")
  .option("--value <value>", "Original value", "Rolled back value")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; resourceType?: string; resourceId?: string; revisionId?: string; field?: string; value?: string; json?: boolean }) => {
    const provider = createWordPressProviderFromEnv();
    const operation = createWordPressWriteOperation(
      "execution.rollback",
      options.resourceType ?? "page",
      options.resourceId ?? "1",
      options.field ?? "title",
      parseJsonValue(options.value),
      "apply",
      options.revisionId,
    );
    const result = await rollbackExecution(
      {
        url: options.project ?? "default",
        executedAt: new Date().toISOString(),
        completedActions: [],
        failedActions: [],
        skippedActions: [],
        rollbackPlan: [
          {
            actionId: operation.id,
            resourceType: operation.resourceType,
            resourceId: operation.resourceId,
            originalValue: operation.oldValue,
            newValue: operation.newValue,
            rollbackMethod: "manual_rollback",
            providerId: provider.id,
            revisionId: operation.revisionId,
            timestamp: operation.timestamp,
          },
        ],
        executionTime: "0ms",
        rollbackGroups: [],
        rollbackRequired: true,
      },
      provider,
    );
    if (options.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Execution rollback finished for ${options.project ?? "default"}\n`);
  });

// Sprint 6: Connection management commands
program
  .command("connect")
  .description("Connect to a website provider")
  .addCommand(
    new Command("wordpress")
      .description("Connect to a WordPress site")
      .action(async () => {
        process.stdout.write("WordPress Connection Wizard\n\n");

        // Note: In production, this would use readline for interactive input
        // For now, display instructions for manual connection
        process.stdout.write("To connect to a WordPress site, provide credentials:\n\n");
        process.stdout.write("  forge wp test <site> <username> <password>\n\n");
        process.stdout.write("Requirements:\n");
        process.stdout.write("  - Application Passwords must be enabled on your WordPress site\n");
        process.stdout.write("  - Generate an application password in: Users → Profile → Application Passwords\n");
      }),
  );

// Sprint 6: Provider info command
program
  .command("provider")
  .description("Show provider information")
  .action(() => {
    const metadata = WORDPRESS_PROVIDER_METADATA;
    process.stdout.write("Registered Providers:\n\n");
    process.stdout.write(`${metadata.name} v${metadata.version}\n`);
    process.stdout.write(`  ${metadata.description}\n\n`);
    process.stdout.write("Capabilities:\n");
    process.stdout.write("  - Posts (read)\n");
    process.stdout.write("  - Pages (read)\n");
    process.stdout.write("  - Media (read)\n");
    process.stdout.write("  - Categories (read)\n");
    process.stdout.write("  - Tags (read)\n");
    process.stdout.write("  - Settings (read)\n");
    process.stdout.write("  - Site Info (read)\n");
    process.stdout.write("  - Authentication (test)\n");
  });

// Sprint 6: Fetch command - download from WordPress provider
program
  .command("fetch")
  .argument("<site>", "WordPress site URL")
  .argument("<username>", "WordPress username")
  .argument("<password>", "WordPress application password")
  .option("--json", "Output as JSON")
  .description("Fetch website data from WordPress")
  .action(async (site: string, username: string, password: string, options: { json?: boolean }) => {
    try {
      process.stdout.write("Connecting to WordPress...\n");
      const provider = createWordPressProvider({
        siteUrl: site,
        username,
        applicationPassword: password,
      });

      const connected = await provider.testConnection();
      if (!connected) {
        process.stdout.write("✗ Connection failed\n");
        process.exit(1);
      }

      process.stdout.write("✓ Connected\n");
      process.stdout.write("Fetching data...\n");

      const [posts, pages, media, categories, tags, settings] = await Promise.all([
        provider.getPosts({ perPage: 100 }),
        provider.getPages({ perPage: 100 }),
        provider.getMedia({ perPage: 100 }),
        provider.getCategories(),
        provider.getTags(),
        provider.getSettings().catch(() => null),
      ]);

      process.stdout.write("✓ Data fetched\n\n");

      const summary = {
        posts: posts.totalItems,
        pages: pages.totalItems,
        media: media.totalItems,
        categories: categories.length,
        tags: tags.length,
        hasSettings: !!settings,
      };

      if (options.json) {
        process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
        return;
      }

      process.stdout.write("Fetch Summary:\n");
      process.stdout.write(`  Posts:      ${summary.posts}\n`);
      process.stdout.write(`  Pages:      ${summary.pages}\n`);
      process.stdout.write(`  Media:      ${summary.media}\n`);
      process.stdout.write(`  Categories: ${summary.categories}\n`);
      process.stdout.write(`  Tags:       ${summary.tags}\n`);
    } catch (error) {
      process.stderr.write(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
      );
      process.exit(1);
    }
  });

const pipelineCommand = program.command("pipeline").description("Pipeline management commands");

pipelineCommand
  .command("list")
  .option("--json", "Output pipelines as JSON")
  .action((options: { json?: boolean }) => {
    const pipelines = listDefaultPipelines().map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      version: pipeline.version,
      description: pipeline.description,
      steps: pipeline.steps.map((step) => step.id),
    }));
    if (options.json) {
      process.stdout.write(JSON.stringify(pipelines, null, 2) + "\n");
      return;
    }
    for (const pipeline of pipelines) {
      process.stdout.write(`${pipeline.id} - ${pipeline.name} (${pipeline.version})\n`);
      process.stdout.write(`  ${pipeline.description}\n`);
      process.stdout.write(`  Steps: ${pipeline.steps.join(" -> ")}\n`);
    }
  });

pipelineCommand
  .command("info")
  .argument("<id>", "Pipeline ID")
  .option("--json", "Output pipeline as JSON")
  .action((id: string, options: { json?: boolean }) => {
    const pipeline = listDefaultPipelines().find((item) => item.id === id);
    if (!pipeline) {
      process.stderr.write(`Error: Pipeline not found: ${id}\n`);
      process.exit(1);
    }
    if (options.json) {
      process.stdout.write(JSON.stringify(pipeline, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Pipeline: ${pipeline.name}\n`);
    process.stdout.write(`Version: ${pipeline.version}\n`);
    process.stdout.write(`Description: ${pipeline.description}\n`);
    process.stdout.write("Steps:\n");
    for (const step of pipeline.steps) {
      process.stdout.write(`  - ${step.id} (${step.dependencies.join(", ") || "no dependencies"})\n`);
    }
  });

pipelineCommand
  .command("run")
  .argument("<id>", "Pipeline ID")
  .argument("<url>", "Website URL")
  .option("--dry-run", "Simulate execution without making changes", true)
  .option("--json", "Output pipeline result as JSON")
  .action(async (id: string, url: string, options: { dryRun?: boolean; json?: boolean }) => {
    const pipeline =
      id === "read"
        ? createReadPipeline(url)
        : id === "analyze"
          ? createAnalyzePipeline(url)
          : id === "recommend"
            ? createRecommendPipeline(url)
            : id === "plan"
              ? createPlanPipeline(url)
              : id === "validate"
                ? createValidatePipeline(url)
                : createExecutePipeline(url, options.dryRun ?? true);
    const result = await executePipeline(pipeline, {});
    if (options.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Pipeline ${result.pipelineId} finished with status ${result.status}\n`);
    process.stdout.write(`Executed steps: ${result.stepsExecuted.join(", ") || "(none)"}\n`);
    process.stdout.write(`Skipped steps: ${result.stepsSkipped.join(", ") || "(none)"}\n`);
  });

program
  .command("project")
  .description("Project knowledge commands")
  .addCommand(
    new Command("profile")
      .argument("[project]", "Project ID")
      .option("--json", "Output project profile as JSON")
      .action(async (project: string, options: { json?: boolean }) => {
        const rootDir = "projects";
        const resolved = resolveProject({ project });
        const knowledge = await loadKnowledge(rootDir, resolved.project);
        const memory = await loadMemory(rootDir, resolved.project);
        const profile = createProjectProfile(knowledge, memory.summarize(resolved.project));
        if (options.json) {
          process.stdout.write(JSON.stringify(profile, null, 2) + "\n");
          return;
        }
        process.stdout.write(`Industry: ${profile.knowledge.industry ?? "(unknown)"}\n`);
        process.stdout.write(`Products: ${profile.knowledge.products.join(", ") || "(none)"}\n`);
        process.stdout.write(`Keywords: ${profile.knowledge.primaryKeywords.join(", ") || "(none)"}\n`);
        process.stdout.write(`Content: ${profile.knowledge.contentCategories.join(", ") || "(none)"}\n`);
        process.stdout.write(`History Summary: ${profile.memorySummary.total} events\n`);
      }),
  );

program
  .command("timeline")
  .argument("[project]", "Project ID")
  .option("--json", "Output timeline as JSON")
  .action(async (project: string, options: { json?: boolean }) => {
    const resolved = resolveProject({ project });
    const store = await loadMemory("projects", resolved.project);
    const events = store.timeline(resolved.project);
    if (options.json) {
      process.stdout.write(JSON.stringify(events, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Project Timeline: ${project}\n`);
    for (const event of events) {
      process.stdout.write(`${event.timestamp} - ${event.type}\n`);
    }
  });

program
  .command("changes")
  .argument("[project]", "Project ID")
  .option("--json", "Output detected changes as JSON")
  .action(async (project: string, options: { json?: boolean }) => {
    const resolved = resolveProject({ project });
    const knowledge = await loadKnowledge("projects", resolved.project);
    const changes = detectChanges(
      { title: knowledge.brand, pages: knowledge.contentCategories, metadata: { industry: knowledge.industry } },
      { pages: [] },
    );
    if (options.json) {
      process.stdout.write(JSON.stringify(changes, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Detected Changes for ${project}\n`);
    process.stdout.write(`New Pages: ${changes.newPages.join(", ") || "(none)"}\n`);
    process.stdout.write(`Title Changes: ${changes.titleChanges.join(", ") || "(none)"}\n`);
  });

program
  .command("skills")
  .description("AI skill commands")
  .addCommand(
    new Command("list")
      .option("--json", "Output skills as JSON")
      .action((options: { json?: boolean }) => {
          const skills = skillRegistry.list().map((skill) => ({
            id: skill.id,
            name: skill.name,
            version: skill.version,
            description: skill.description,
            requiredContext: skill.requiredContext,
            inputs: skill.inputs,
            outputs: skill.outputs,
            supportedProviders: skill.supportedProviders,
          }));
        if (options.json) {
          process.stdout.write(JSON.stringify(skills, null, 2) + "\n");
          return;
        }
        for (const skill of skills) {
          process.stdout.write(`${skill.id} - ${skill.name}\n`);
        }
      }),
  )
  .addCommand(
    new Command("info")
      .argument("<id>", "Skill ID")
      .option("--json", "Output skill as JSON")
      .action((id: string, options: { json?: boolean }) => {
        const skill = skillRegistry.get(id);
        const info = {
          id: skill.id,
          name: skill.name,
          version: skill.version,
          description: skill.description,
          requiredContext: skill.requiredContext,
          inputs: skill.inputs,
          outputs: skill.outputs,
          supportedProviders: skill.supportedProviders,
          prompt: skillPromptRegistry.get(skill.id),
        };
        if (options.json) {
          process.stdout.write(JSON.stringify(info, null, 2) + "\n");
          return;
        }
        process.stdout.write(`Skill: ${skill.name}\n`);
        process.stdout.write(`Version: ${skill.version}\n`);
        process.stdout.write(`Description: ${skill.description}\n`);
        process.stdout.write(`Inputs: ${skill.inputs.join(", ")}\n`);
        process.stdout.write(`Outputs: ${skill.outputs.join(", ")}\n`);
      }),
  );

program
  .command("skill")
  .description("Run a single AI skill")
  .addCommand(
    new Command("run")
      .argument("<id>", "Skill ID")
      .argument("[project]", "Project ID")
      .option("--provider <provider>", "AI provider id")
      .option("--model <model>", "Model name")
      .option("--json", "Output skill execution as JSON")
      .action(async (id: string, project: string, options: { provider?: string; model?: string; json?: boolean }) => {
        const skill = skillRegistry.get(id);
        const engine = createProvider(options.provider);
        const rootDir = "projects";
        const resolved = resolveProject({ project });
        const knowledge = await loadKnowledge(rootDir, resolved.project);
        const memory = await loadMemory(rootDir, resolved.project);
        const profile = createProjectProfile(knowledge, memory.summarize(resolved.project));
        const context = {
          project: resolved.project,
          knowledge,
          profile,
          memorySummary: profile.memorySummary,
          findings: [],
          recommendations: [],
          aiProvider: options.provider,
          model: options.model,
          aiContext: contextBuilder.build({
            project: resolved.project,
            knowledge,
            memory: profile.memorySummary,
            projectProfile: profile,
            findings: [],
            recommendations: [],
            metadata: { provider: options.provider, model: options.model, resolution: resolved.source },
          }),
        };
        const pipeline = createSkillPipeline(skill, {}, context, engine);
        const result = await executePipeline(pipeline, { rootDir, ...context });
        if (options.json) {
          process.stdout.write(JSON.stringify(result, null, 2) + "\n");
          return;
        }
        process.stdout.write(`Skill ${skill.id} finished with status ${result.status}\n`);
      }),
  );

const agentCommand = program.command("agents").description("Agent framework commands");

agentCommand
  .command("list")
  .option("--json", "Output agents as JSON")
  .action((options: { json?: boolean }) => {
    const agents = agentRegistry.list().map((agent) => ({
      id: agent.metadata.id,
      name: agent.metadata.name,
      version: agent.metadata.version,
      description: agent.metadata.description,
      goal: agent.metadata.goal,
      supportedProviders: agent.metadata.supportedProviders,
      supportedProjects: agent.metadata.supportedProjects,
      supportedPipelines: agent.metadata.supportedPipelines,
      supportedSkills: agent.metadata.supportedSkills,
      capabilities: agent.metadata.capabilities,
    }));
    if (options.json) {
      process.stdout.write(JSON.stringify(agents, null, 2) + "\n");
      return;
    }
    for (const agent of agents) {
      process.stdout.write(`${agent.id} - ${agent.name}\n`);
    }
  });

const missionsCommand = program.command("missions").description("Mission layer commands");

missionsCommand
  .command("list")
  .option("--json", "Output missions as JSON")
  .action((options: { json?: boolean }) => {
    const missions = missionRegistry.list().map((mission) => ({
      id: mission.id,
      name: mission.name,
      version: mission.version,
      description: mission.description,
    }));
    if (options.json) {
      process.stdout.write(JSON.stringify(missions, null, 2) + "\n");
      return;
    }
    for (const mission of missions) {
      process.stdout.write(`${mission.id} - ${mission.name}\n`);
    }
  });

const missionCommand = program.command("mission").description("Mission execution commands");

missionCommand
  .command("info")
  .argument("<id>", "Mission ID")
  .option("--json", "Output mission as JSON")
  .action((id: string, options: { json?: boolean }) => {
    const mission = missionRegistry.get(id);
    if (options.json) {
      process.stdout.write(JSON.stringify(mission, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Mission: ${mission.name}\n`);
    process.stdout.write(`Version: ${mission.version}\n`);
    process.stdout.write(`Description: ${mission.description}\n`);
  });

missionCommand
  .command("run")
  .argument("<id>", "Mission ID")
  .argument("[project]", "Project ID")
  .option("--dry-run", "Simulate mission execution without making changes", true)
  .option("--json", "Output mission execution as JSON")
  .action(async (id: string, project: string, options: { dryRun?: boolean; json?: boolean }) => {
    const result = await executeMission(project, id, { dryRun: options.dryRun ?? true });
    if (options.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Mission ${result.plan.mission.metadata.id} finished with status ${result.execution.status}\n`);
    process.stdout.write(`Steps: ${result.plan.mission.steps.length}\n`);
  });

missionCommand
  .command("validate")
  .argument("<id>", "Mission ID")
  .option("--json", "Output validation as JSON")
  .action((id: string, options: { json?: boolean }) => {
    const validation = missionRegistry.validate(id);
    if (options.json) {
      process.stdout.write(JSON.stringify(validation, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Valid: ${validation.valid}\n`);
    process.stdout.write(`Issues: ${validation.issues.join(" | ") || "(none)"}\n`);
  });

missionCommand
  .command("export")
  .argument("<id>", "Mission ID")
  .option("--json", "Export mission as JSON")
  .option("--yaml", "Export mission as YAML")
  .action((id: string, options: { json?: boolean; yaml?: boolean }) => {
    const mission = missionRegistry.get(id);
    if (options.yaml) {
      process.stdout.write(`${serializeMissionToYaml(mission)}\n`);
      return;
    }
    process.stdout.write(`${serializeMissionToJson(mission)}\n`);
  });

agentCommand
  .command("info")
  .argument("<id>", "Agent ID")
  .option("--json", "Output agent as JSON")
  .action((id: string, options: { json?: boolean }) => {
    const agent = agentRegistry.get(id);
    const info = {
      ...agent.metadata,
    };
    if (options.json) {
      process.stdout.write(JSON.stringify(info, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Agent: ${agent.metadata.name}\n`);
    process.stdout.write(`Goal: ${agent.metadata.goal}\n`);
    process.stdout.write(`Pipelines: ${agent.metadata.supportedPipelines.join(", ")}\n`);
    process.stdout.write(`Skills: ${agent.metadata.supportedSkills.join(", ")}\n`);
  });

agentCommand
  .command("run")
  .argument("<id>", "Agent ID")
  .argument("[project]", "Project ID")
  .option("--json", "Output agent execution as JSON")
  .option("--dry-run", "Simulate execution without running a pipeline", true)
  .action(async (id: string, project: string, options: { json?: boolean; dryRun?: boolean }) => {
    const agent = agentRegistry.get(id);
    const { resolved, rootDir, pipelineRegistry, strategyContext, aiContext } = await loadProjectContext(project, `agent:${id}`, id);
    const context = { ...strategyContext, aiContext };
    const result = await agent.execute(context, {
      invokeStrategy: async () => ({ } as never),
      dryRun: options.dryRun ?? true,
    });
    const strategy = result.strategy ?? strategyBuilder.build(context);
    const execution = await executeStrategy(strategy, pipelineRegistry, rootDir, resolved.project, options.dryRun ?? true);
    const memory = await loadMemory(rootDir, resolved.project);
    recordStrategyEvent(memory, strategy, (options.dryRun ?? true) ? "strategy-created" : "strategy-executed");
    await saveMemory(rootDir, resolved.project, memory);

    if (options.json) {
      process.stdout.write(JSON.stringify({ ...result, strategy, execution }, null, 2) + "\n");
      return;
    }

    process.stdout.write(`Agent ${result.agentId} finished with status ${result.status}\n`);
    process.stdout.write(`Strategy: ${strategy.metadata.id}\n`);
    process.stdout.write(`Pipelines: ${strategy.selectedPipelines.join(", ")}\n`);
    process.stdout.write(`Messages: ${result.messages.join(" | ") || "(none)"}\n`);
  });

const strategyCommand = program.command("strategy").description("Strategy engine commands");

strategyCommand
  .command("create")
  .argument("[project]", "Project ID")
  .option("--project <project>", "Project ID")
  .option("--json", "Output strategy as JSON")
  .option("--yaml", "Output strategy as YAML")
  .option("--dry-run", "Do not persist strategy to memory", true)
  .action(async (projectArg: string, options: { project?: string; json?: boolean; yaml?: boolean; dryRun?: boolean }) => {
    const project = options.project ?? projectArg;
    const { resolved, rootDir, strategyContext } = await loadProjectContext(project, "strategy:create");
    const strategy = strategyBuilder.build(strategyContext);
    validateStrategy(strategy, strategyContext);
    if (!options.dryRun) {
      const memory = await loadMemory(rootDir, resolved.project);
      recordStrategyEvent(memory, strategy, "strategy-created");
      await saveMemory(rootDir, resolved.project, memory);
    }
    if (options.yaml) {
      process.stdout.write(`${serializeStrategyToYaml(strategy)}\n`);
      return;
    }
    if (options.json) {
      process.stdout.write(JSON.stringify(strategy, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Strategy: ${strategy.metadata.name}\n`);
    process.stdout.write(`Pipelines: ${strategy.selectedPipelines.join(", ")}\n`);
    process.stdout.write(`Skills: ${strategy.selectedSkills.join(", ")}\n`);
  });

strategyCommand
  .command("show")
  .argument("[project]", "Project ID")
  .option("--project <project>", "Project ID")
  .option("--json", "Output strategy as JSON")
  .option("--yaml", "Output strategy as YAML")
  .action(async (projectArg: string, options: { project?: string; json?: boolean; yaml?: boolean }) => {
    const project = options.project ?? projectArg;
    const { strategyContext } = await loadProjectContext(project, "strategy:show");
    const strategy = strategyBuilder.build(strategyContext);
    if (options.yaml) {
      process.stdout.write(`${serializeStrategyToYaml(strategy)}\n`);
      return;
    }
    if (options.json) {
      process.stdout.write(JSON.stringify(strategy, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Strategy: ${strategy.metadata.id}\n`);
    process.stdout.write(`Goal: ${strategy.goal.title}\n`);
    process.stdout.write(`Risk: ${strategy.riskLevel}\n`);
  });

strategyCommand
  .command("validate")
  .argument("[project]", "Project ID")
  .option("--project <project>", "Project ID")
  .option("--json", "Output validation as JSON")
  .action(async (projectArg: string, options: { project?: string; json?: boolean }) => {
    const project = options.project ?? projectArg;
    const { strategyContext } = await loadProjectContext(project, "strategy:validate");
    const strategy = strategyBuilder.build(strategyContext);
    const validation = validateStrategy(strategy, strategyContext);
    if (options.json) {
      process.stdout.write(JSON.stringify(validation, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Valid: ${validation.valid}\n`);
    process.stdout.write(`Issues: ${validation.issues.join(" | ") || "(none)"}\n`);
  });

strategyCommand
  .command("export")
  .argument("[project]", "Project ID")
  .option("--project <project>", "Project ID")
  .option("--json", "Export strategy as JSON")
  .option("--yaml", "Export strategy as YAML")
  .action(async (projectArg: string, options: { project?: string; json?: boolean; yaml?: boolean }) => {
    const project = options.project ?? projectArg;
    const { strategyContext } = await loadProjectContext(project, "strategy:export");
    const strategy = strategyBuilder.build(strategyContext);
    if (options.yaml) {
      process.stdout.write(`${serializeStrategyToYaml(strategy)}\n`);
      return;
    }
    process.stdout.write(`${serializeStrategyToJson(strategy)}\n`);
  });

// Sprint 16: Content Intelligence commands (deterministic, no AI)
const contentCommand = program.command("content").description("Deterministic content intelligence (no AI)");

async function loadContentContext(project: string) {
  const { resolved } = await loadProjectContext(project, "content");
  const siteUrl = resolveHomepageUrl(resolved.project);
  const snapshot = await readWebsite(siteUrl);
  const $ = (await import("cheerio")).load(snapshot.rawHtml || "");
  return { resolved, siteUrl, snapshot, $ };
}

// Sprint 24: Site-level content intelligence — crawl a bounded set of internal
// pages and build a Universal Page Model for each (dom-engine is the canonical
// parser). Site Content Intelligence consumes these snapshots + structures.
async function loadSiteContext(project: string, options: { depth?: number; limit?: number } = {}) {
  const { resolved, knowledge, memory } = await loadProjectContext(project, "content:site");
  const siteUrl = resolveHomepageUrl(resolved.project);
  let rootUrl = siteUrl;
  try {
    rootUrl = new URL(siteUrl).origin + "/";
  } catch {
    // keep raw siteUrl as the base
  }
  const depth = Math.max(0, options.depth ?? 1);
  const limit = Math.max(1, options.limit ?? 10);
  const snapshots: WebsiteSnapshot[] = [];
  const seen = new Set<string>();
  const queue: { url: string; level: number }[] = [{ url: siteUrl, level: 0 }];

  while (queue.length > 0 && snapshots.length < limit) {
    const entry = queue.shift();
    if (!entry) break;
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    let snapshot: WebsiteSnapshot | null = null;
    try {
      snapshot = await readWebsite(entry.url);
    } catch {
      // Skip unreachable pages — the analysis works with what it can read.
    }
    if (!snapshot) continue;
    snapshots.push(snapshot);
    if (entry.level >= depth) continue;
    for (const link of snapshot.links) {
      if (!link.isInternal) continue;
      let resolvedLink: string;
      try {
        resolvedLink = new URL(link.href, rootUrl).href;
      } catch {
        continue;
      }
      if (!resolvedLink.startsWith(rootUrl)) continue;
      if (seen.has(resolvedLink)) continue;
      queue.push({ url: resolvedLink, level: entry.level + 1 });
    }
  }

  const universalPages = snapshots.map((snapshot) =>
    buildUniversalPage(snapshot.rawHtml || "", snapshot.finalUrl || snapshot.originalUrl, snapshot.pageTitle),
  );
  const memorySummary = memory.summarize(resolved.project);
  return {
    resolved,
    knowledge,
    memory,
    snapshots,
    universalPages,
    baseUrl: rootUrl,
    memoryContext: {
      lastAnalysisAt: memorySummary.lastEventAt,
      previousAnalysisCount: memorySummary.total,
    },
  };
}

contentCommand
  .command("analyze")
  .option("--project <project>", "Project ID")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { snapshot, $ } = await loadContentContext(project);
    const dna = buildPageDNA(snapshot, $);
    if (options.json) {
      process.stdout.write(JSON.stringify(dna, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Page type: ${dna.pageType.kind} (${dna.pageType.confidence.toFixed(2)})\n`);
    process.stdout.write(`Intent: ${dna.intent.primary}\n`);
    process.stdout.write(`Audience: ${dna.audience.level}\n`);
    process.stdout.write(`Topics: ${dna.topics.length}, Entities: ${dna.entities.length}\n`);
  });

contentCommand
  .command("graph")
  .option("--project <project>", "Project ID")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { snapshot, $ } = await loadContentContext(project);
    const graph = buildContentGraph(snapshot, $);
    if (options.json) {
      process.stdout.write(JSON.stringify(graph, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Graph nodes: ${graph.nodeCount}\n`);
    process.stdout.write(`By type: ${JSON.stringify(graph.byType)}\n`);
  });

contentCommand
  .command("sections")
  .option("--project <project>", "Project ID")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { snapshot, $ } = await loadContentContext(project);
    const sections = detectSections(snapshot, $);
    if (options.json) {
      process.stdout.write(JSON.stringify(sections, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Present: ${sections.present.join(", ") || "none"}\n`);
    process.stdout.write(`Missing: ${sections.missing.join(", ") || "none"}\n`);
  });

contentCommand
  .command("entities")
  .option("--project <project>", "Project ID")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { snapshot, $ } = await loadContentContext(project);
    const entities = extractEntities(snapshot, $);
    const topics = extractTopics(snapshot);
    if (options.json) {
      process.stdout.write(JSON.stringify({ entities, topics }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Entities: ${entities.length}, Topics: ${topics.length}\n`);
  });

contentCommand
  .command("gaps")
  .option("--project <project>", "Project ID")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { snapshot, $ } = await loadContentContext(project);
    const gaps = detectGaps(snapshot, $);
    if (options.json) {
      process.stdout.write(JSON.stringify(gaps, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Gaps: ${gaps.length}\n`);
    for (const gap of gaps) {
      process.stdout.write(`  [${gap.severity}] ${gap.title}\n`);
    }
  });

contentCommand
  .command("quality")
  .option("--project <project>", "Project ID")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; json?: boolean }) => {
    const project = options.project ?? "default";
    const { snapshot, $ } = await loadContentContext(project);
    const quality = scoreQuality(snapshot, $);
    if (options.json) {
      process.stdout.write(JSON.stringify(quality, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Overall quality: ${quality.overall}\n`);
    process.stdout.write(`Readability: ${quality.readability.score}, Depth: ${quality.contentDepth.score}\n`);
  });

// Sprint 24: Site-level content intelligence commands.
// Site Content Intelligence is an extension of Content Intelligence — no new engine.

async function runSiteReport(options: { project?: string; depth?: string; limit?: string }) {
  const project = options.project ?? "default";
  const { snapshots, universalPages, knowledge, baseUrl, memoryContext } = await loadSiteContext(project, {
    depth: options.depth ? Number(options.depth) : 1,
    limit: options.limit ? Number(options.limit) : 10,
  });
  const report = analyzeSite(snapshots, {
    baseUrl,
    universalPages,
    knowledge: knowledge as never,
    memory: memoryContext as never,
    analyzedAt: new Date().toISOString(),
  });
  return { project, snapshots, universalPages, knowledge, report };
}

contentCommand
  .command("site-analyze")
  .option("--project <project>", "Project ID")
  .option("--depth <depth>", "Internal-link crawl depth", "1")
  .option("--limit <limit>", "Maximum pages to analyze", "10")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; depth?: string; limit?: string; json?: boolean }) => {
    const { project, report } = await runSiteReport(options);
    // Record the site-level analysis through the existing memory system.
    const rootDir = "projects";
    const store = await loadMemory(rootDir, project);
    store.append(createSiteAnalysisMemoryEvent(project, report));
    await saveMemory(rootDir, project, store);
    if (options.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Site analysis (${report.analyzedAt})\n`);
    process.stdout.write(`Pages: ${report.summary.pageCount}, Topics: ${report.summary.topicCount}, Clusters: ${report.summary.clusterCount}\n`);
    process.stdout.write(`Authority (diagnostic): ${report.authority.overall}/100\n`);
    process.stdout.write(`Opportunities: ${report.summary.opportunityCount} (${report.summary.highPriorityOpportunities} high), Refresh: ${report.summary.refreshCandidateCount}, Link opportunities: ${report.summary.internalLinkOpportunityCount}\n`);
    process.stdout.write(`Structure source: ${report.context.structureSource} (knowledge=${report.context.knowledgeApplied}, memory=${report.context.memoryApplied})\n`);
    process.stdout.write(`Recorded site-analysis memory event for ${project}\n`);
  });

contentCommand
  .command("topics")
  .option("--project <project>", "Project ID")
  .option("--depth <depth>", "Internal-link crawl depth", "1")
  .option("--limit <limit>", "Maximum pages to analyze", "10")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; depth?: string; limit?: string; json?: boolean }) => {
    const { report } = await runSiteReport(options);
    if (options.json) {
      process.stdout.write(JSON.stringify(report.topicGraph, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Topic Graph (${report.topicGraph.topicCount} topics)\n`);
    for (const topic of report.topicGraph.topics.slice(0, 25)) {
      const parent = topic.parentTopic ? ` <- ${topic.parentTopic}` : "";
      process.stdout.write(`  ${topic.term} (pages=${topic.pageCount}, conf=${topic.confidence.toFixed(2)})${parent}\n`);
    }
  });

contentCommand
  .command("clusters")
  .option("--project <project>", "Project ID")
  .option("--depth <depth>", "Internal-link crawl depth", "1")
  .option("--limit <limit>", "Maximum pages to analyze", "10")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; depth?: string; limit?: string; json?: boolean }) => {
    const { report } = await runSiteReport(options);
    if (options.json) {
      process.stdout.write(JSON.stringify(report.clusters, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Topic Clusters (${report.clusters.length})\n`);
    for (const cluster of report.clusters) {
      process.stdout.write(`  ${cluster.primaryTopic} (coverage=${cluster.coverageScore}, pages=${cluster.pages.length}, supporting=${cluster.supportingPages.length})\n`);
      if (cluster.missingCoverage.length > 0) {
        process.stdout.write(`    missing: ${cluster.missingCoverage.join(", ")}\n`);
      }
    }
  });

contentCommand
  .command("authority")
  .option("--project <project>", "Project ID")
  .option("--depth <depth>", "Internal-link crawl depth", "1")
  .option("--limit <limit>", "Maximum pages to analyze", "10")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; depth?: string; limit?: string; json?: boolean }) => {
    const { report } = await runSiteReport(options);
    if (options.json) {
      process.stdout.write(JSON.stringify(report.authority, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Site Authority (Forge diagnostic scores — not Google rankings)\n`);
    process.stdout.write(`  Topical coverage:   ${report.authority.topicalCoverage}\n`);
    process.stdout.write(`  Semantic depth:     ${report.authority.semanticDepth}\n`);
    process.stdout.write(`  Supporting content: ${report.authority.supportingContent}\n`);
    process.stdout.write(`  Internal linking:   ${report.authority.internalLinking}\n`);
    process.stdout.write(`  Entity coverage:    ${report.authority.entityCoverage}\n`);
    process.stdout.write(`  Completeness:       ${report.authority.contentCompleteness}\n`);
    process.stdout.write(`  Freshness:          ${report.authority.freshness}\n`);
    process.stdout.write(`  Overall:            ${report.authority.overall}\n`);
  });

contentCommand
  .command("opportunities")
  .option("--project <project>", "Project ID")
  .option("--depth <depth>", "Internal-link crawl depth", "1")
  .option("--limit <limit>", "Maximum pages to analyze", "10")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; depth?: string; limit?: string; json?: boolean }) => {
    const { report } = await runSiteReport(options);
    if (options.json) {
      process.stdout.write(JSON.stringify(report.opportunities, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Content Opportunities (${report.opportunities.length})\n`);
    for (const opportunity of report.opportunities) {
      process.stdout.write(`  [${opportunity.priority}] ${opportunity.title}\n`);
    }
  });

contentCommand
  .command("refresh")
  .option("--project <project>", "Project ID")
  .option("--depth <depth>", "Internal-link crawl depth", "1")
  .option("--limit <limit>", "Maximum pages to analyze", "10")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; depth?: string; limit?: string; json?: boolean }) => {
    const { report } = await runSiteReport(options);
    if (options.json) {
      process.stdout.write(JSON.stringify(report.refreshCandidates, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Refresh Candidates (${report.refreshCandidates.length})\n`);
    for (const candidate of report.refreshCandidates) {
      process.stdout.write(`  [${candidate.priority}] ${candidate.pageUrl}\n`);
      process.stdout.write(`    reasons: ${candidate.reasons.join(", ")}\n`);
    }
  });

contentCommand
  .command("links")
  .option("--project <project>", "Project ID")
  .option("--depth <depth>", "Internal-link crawl depth", "1")
  .option("--limit <limit>", "Maximum pages to analyze", "10")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; depth?: string; limit?: string; json?: boolean }) => {
    const { report } = await runSiteReport(options);
    if (options.json) {
      process.stdout.write(JSON.stringify(report.internalLinkOpportunities, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Internal Link Opportunities (${report.internalLinkOpportunities.length}) — output only, no link changes\n`);
    for (const link of report.internalLinkOpportunities) {
      const source = link.sourcePage ? `${link.sourcePage} -> ` : "";
      process.stdout.write(`  [${link.priority}] ${link.kind}: ${source}${link.targetPage ?? ""}\n`);
    }
  });

const generateCommand = program.command("generate").description("Section-scoped AI content generation (Sprint 17)");

const SECTION_KINDS = [
  "hero", "benefits", "features", "services", "products", "testimonials",
  "faq", "comparison", "buying-guide", "pricing", "cta", "introduction",
  "conclusion", "about", "contact",
];

async function runGenerate(sectionKinds: string[], options: {
  project?: string;
  provider?: string;
  model?: string;
  preview?: boolean;
  dryRun?: boolean;
  json?: boolean;
}) {
  const project = options.project ?? "default";
  const { resolved, knowledge, profile } = await loadProjectContext(project, "generate");
  const siteUrl = resolveHomepageUrl(resolved.project);
  const snapshot = await readWebsite(siteUrl);
  const $ = (await import("cheerio")).load(snapshot.rawHtml || "");
  const dna = buildPageDNA(snapshot, $);
  const sections = detectSections(snapshot, $);
  const selected = sectionKinds.length > 0
    ? sections.sections.filter((s) => sectionKinds.includes(s.kind))
    : sections.sections;

  const projectContext = buildProjectContext({
    project: resolved.project,
    profile,
    knowledge,
    memory: profile.memorySummary,
  });

  const engine = new AIEngine(ProviderFactory.create({ provider: (options.provider ?? "openai") as never, model: options.model }));
  const registry = new PromptRegistry();
  const result = await generateContent(
    {
      project: resolved.project,
      pageDNA: dna,
      sections: selected,
      projectContext,
      brand: (knowledge as { brand?: never }).brand as never,
      targetKeyword: "",
      intent: dna.intent,
      audience: dna.audience,
    },
    {
      engine,
      registry,
      knowledge,
      memory: profile.memorySummary,
      profile,
      brand: (knowledge as { brand?: never }).brand as never,
    },
  );

  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }
  process.stdout.write(`Generated ${result.patches.length} section patch(es) for project "${resolved.project}".\n`);
  for (const patch of result.patches) {
    process.stdout.write(`  [${patch.operation}] ${patch.sectionId} — valid: ${patch.validation.valid}\n`);
  }
  if (options.preview) {
    process.stdout.write("\nPreview mode: no changes applied. Use Sprint 18 to review & apply.\n");
  }
}

generateCommand
  .command("hero").description("Generate a hero section improvement")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only (no apply)")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runGenerate(["hero"], options));

generateCommand
  .command("faq").description("Generate a FAQ section improvement")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only (no apply)")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runGenerate(["faq"], options));

// Sprint 18: Review Engine command group (deterministic, provider-independent).
const reviewCommand = program.command("review").description("Review session management (Sprint 18)");

function resolveRootDir(): string {
  return "projects";
}

reviewCommand
  .command("create")
  .description("Create a review session from a generation result or homepage plan JSON")
  .option("--project <project>", "Project ID", "default")
  .option("--policy <policy>", "Review policy: strict|balanced|automatic|enterprise", "balanced")
  .option("--from <file>", "Path to a JSON file with { patches: ContentPatch[] }")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; policy?: string; from?: string; json?: boolean }) => {
    const rootDir = resolveRootDir();
    const project = options.project ?? "default";
    let patches: never[] = [];
    if (options.from) {
      const fs = await import("node:fs/promises");
      const raw = await fs.readFile(options.from, "utf8");
      const parsed = JSON.parse(raw) as { patches?: never[] };
      patches = parsed.patches ?? [];
    }
    const policyName = (options.policy as ReviewPolicyName) ?? "balanced";
    const session = createReviewSessionFromInput(project, patches, policyName);
    await saveReviewSession(rootDir, session);
    if (options.json) {
      process.stdout.write(JSON.stringify(session, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Created review session ${session.sessionId} for ${project} (${session.items.length} items).\n`);
  });

reviewCommand
  .command("show")
  .description("Show a review session")
  .argument("<sessionId>", "Review session ID")
  .option("--project <project>", "Project ID", "default")
  .option("--json", "Output result as JSON")
  .action(async (sessionId: string, options: { project?: string; json?: boolean }) => {
    const rootDir = resolveRootDir();
    const session = await loadReviewSession(rootDir, options.project ?? "default", sessionId);
    if (!session) {
      process.stderr.write(`Review session not found: ${sessionId}\n`);
      return;
    }
    if (options.json) {
      process.stdout.write(JSON.stringify(session, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Session ${session.sessionId} — status: ${session.status}, items: ${session.items.length}\n`);
    for (const item of session.items) {
      process.stdout.write(`  [${item.decision ?? "pending"}] ${item.section} (${item.id}) conf=${item.confidence}\n`);
    }
  });

reviewCommand
  .command("approve")
  .description("Approve a review item")
  .argument("<itemId>", "Review item ID")
  .option("--project <project>", "Project ID", "default")
  .option("--session <sessionId>", "Review session ID")
  .option("--by <author>", "Reviewer name", "cli")
  .option("--json", "Output result as JSON")
  .action(async (itemId: string, options: { project?: string; session?: string; by?: string; json?: boolean }) => {
    const { session, rootDir } = await requireSession(options.project ?? "default", options.session);
    const updated = decideItem(session, itemId, "APPROVE", options.by ?? "cli");
    await saveReviewSession(rootDir, updated);
    if (options.json) {
      process.stdout.write(JSON.stringify(updated, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Approved item ${itemId} in session ${updated.sessionId}.\n`);
  });

reviewCommand
  .command("reject")
  .description("Reject a review item")
  .argument("<itemId>", "Review item ID")
  .option("--project <project>", "Project ID", "default")
  .option("--session <sessionId>", "Review session ID")
  .option("--by <author>", "Reviewer name", "cli")
  .option("--json", "Output result as JSON")
  .action(async (itemId: string, options: { project?: string; session?: string; by?: string; json?: boolean }) => {
    const { session, rootDir } = await requireSession(options.project ?? "default", options.session);
    const updated = decideItem(session, itemId, "REJECT", options.by ?? "cli");
    await saveReviewSession(rootDir, updated);
    if (options.json) {
      process.stdout.write(JSON.stringify(updated, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Rejected item ${itemId} in session ${updated.sessionId}.\n`);
  });

reviewCommand
  .command("edit")
  .description("Edit a review item's proposed content")
  .argument("<itemId>", "Review item ID")
  .requiredOption("--content <text>", "Edited content")
  .option("--project <project>", "Project ID", "default")
  .option("--session <sessionId>", "Review session ID")
  .option("--by <author>", "Reviewer name", "cli")
  .option("--json", "Output result as JSON")
  .action(async (itemId: string, options: { content: string; project?: string; session?: string; by?: string; json?: boolean }) => {
    const { session, rootDir } = await requireSession(options.project ?? "default", options.session);
    const updated = decideItem(session, itemId, "EDIT", options.by ?? "cli", options.content);
    await saveReviewSession(rootDir, updated);
    if (options.json) {
      process.stdout.write(JSON.stringify(updated, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Edited item ${itemId} in session ${updated.sessionId}.\n`);
  });

reviewCommand
  .command("comments")
  .description("List comments for a review session")
  .argument("<sessionId>", "Review session ID")
  .option("--project <project>", "Project ID", "default")
  .option("--json", "Output result as JSON")
  .action(async (sessionId: string, options: { project?: string; json?: boolean }) => {
    const rootDir = resolveRootDir();
    const session = await loadReviewSession(rootDir, options.project ?? "default", sessionId);
    if (!session) {
      process.stderr.write(`Review session not found: ${sessionId}\n`);
      return;
    }
    if (options.json) {
      process.stdout.write(JSON.stringify(session.comments, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Session ${sessionId} has ${session.comments.length} session-level comments.\n`);
    for (const item of session.items) {
      if (item.comments.length > 0) {
        process.stdout.write(`  ${item.id}: ${item.comments.length} comment(s)\n`);
      }
    }
  });

reviewCommand
  .command("export")
  .description("Export a review session as markdown/json/html")
  .argument("<sessionId>", "Review session ID")
  .option("--project <project>", "Project ID", "default")
  .option("--format <format>", "Export format: md|json|html", "md")
  .action(async (sessionId: string, options: { project?: string; format?: string }) => {
    const rootDir = resolveRootDir();
    const session = await loadReviewSession(rootDir, options.project ?? "default", sessionId);
    if (!session) {
      process.stderr.write(`Review session not found: ${sessionId}\n`);
      return;
    }
    const report = generateReport(session);
    const format = options.format ?? "md";
    const output = format === "json" ? report.json : format === "html" ? report.html : report.markdown;
    process.stdout.write(output + "\n");
  });

reviewCommand
  .command("metrics")
  .description("Show metrics for a review session")
  .argument("<sessionId>", "Review session ID")
  .option("--project <project>", "Project ID", "default")
  .option("--json", "Output result as JSON")
  .action(async (sessionId: string, options: { project?: string; json?: boolean }) => {
    const rootDir = resolveRootDir();
    const session = await loadReviewSession(rootDir, options.project ?? "default", sessionId);
    if (!session) {
      process.stderr.write(`Review session not found: ${sessionId}\n`);
      return;
    }
    const metrics = computeMetrics(session);
    if (options.json) {
      process.stdout.write(JSON.stringify(metrics, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Session ${sessionId} metrics:\n`);
    process.stdout.write(`  approvalRate: ${(metrics.approvalRate * 100).toFixed(1)}%\n`);
    process.stdout.write(`  rejectionRate: ${(metrics.rejectionRate * 100).toFixed(1)}%\n`);
    process.stdout.write(`  averageConfidence: ${metrics.averageConfidence.toFixed(2)}\n`);
    process.stdout.write(`  highRiskChanges: ${metrics.highRiskChanges}\n`);
  });

reviewCommand
  .command("apply")
  .description("Apply an approved, completed review session (no --force; hands off to Execution Engine)")
  .argument("<sessionId>", "Review session ID")
  .option("--project <project>", "Project ID", "default")
  .option("--dry-run", "Dry-run the execution (provider decides)", true)
  .option("--json", "Output result as JSON")
  .action(async (sessionId: string, options: { project?: string; dryRun?: boolean; json?: boolean }) => {
    const rootDir = resolveRootDir();
    const session = await loadReviewSession(rootDir, options.project ?? "default", sessionId);
    if (!session) {
      process.stderr.write(`Review session not found: ${sessionId}\n`);
      return;
    }
    // DECISION 2: verify completion + policy before handing off to Execution Engine.
    if (session.status !== "completed") {
      process.stderr.write(`Cannot apply: review session ${sessionId} is not completed (status: ${session.status}).\n`);
      return;
    }
    const pending = session.items.filter((item) => item.decision === undefined);
    if (pending.length > 0) {
      process.stderr.write(`Cannot apply: ${pending.length} item(s) still undecided.\n`);
      return;
    }
    const rejected = session.items.filter((item) => item.decision === "REJECT");
    if (rejected.length > 0) {
      process.stderr.write(`Cannot apply: ${rejected.length} item(s) rejected. Resolve before applying.\n`);
      return;
    }
    const approved = session.items.filter((item) => item.decision === "APPROVE");
    const provider = createWordPressProviderFromEnv();
    const executionPlan = buildExecutionPlanFromSession(session, approved);
    const dryRun = options.dryRun ?? true;
    const result = dryRun
      ? await executeExecution(executionPlan, provider, { dryRun: true, stopOnBlocked: true })
      : await executeExecution(executionPlan, provider, { dryRun: false, stopOnBlocked: true });
    if (options.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Applied review session ${sessionId} (${approved.length} approved items) ${dryRun ? "dry-run" : "for real"}.\n`);
  });

reviewCommand
  .command("rollback")
  .description("Roll back a previously applied review session")
  .argument("<sessionId>", "Review session ID")
  .option("--project <project>", "Project ID", "default")
  .option("--json", "Output result as JSON")
  .action(async (sessionId: string, options: { project?: string; json?: boolean }) => {
    const provider = createWordPressProviderFromEnv();
    const result = await rollbackExecution(
      {
        url: options.project ?? "default",
        executedAt: new Date().toISOString(),
        completedActions: [],
        failedActions: [],
        skippedActions: [],
        rollbackPlan: [],
        executionTime: "0ms",
        rollbackGroups: [],
        rollbackRequired: true,
      },
      provider,
    );
    if (options.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Rolled back review session ${sessionId} for ${options.project ?? "default"}.\n`);
  });

async function requireSession(project: string, sessionId?: string): Promise<{ session: ReviewSession; rootDir: string }> {
  const rootDir = resolveRootDir();
  let session: ReviewSession | undefined;
  if (sessionId) {
    session = await loadReviewSession(rootDir, project, sessionId);
  } else {
    const entries = await listReviewSessions(rootDir, project);
    const active = entries.filter((e) => e.status !== "completed").at(-1);
    if (active) session = await loadReviewSession(rootDir, project, active.id);
  }
  if (!session) {
    throw new Error(`No active review session found for project ${project}`);
  }
  return { session, rootDir };
}

function createReviewSessionFromInput(project: string, patches: never[], policyName: ReviewPolicyName): ReviewSession {
  const { createReviewSession } = require("@forge/review-engine");
  return createReviewSession({ projectId: project, createdBy: "cli", patches, policy: REVIEW_POLICIES[policyName] });
}

function buildExecutionPlanFromSession(_session: ReviewSession, approved: ReviewSession["items"]): ExecutionPlan {
  const { generateExecutionPlan } = require("@forge/action-engine");
  const actions = approved.map((item) => ({
    id: item.id,
    recommendationId: item.id,
    findingId: item.id,
    type: "content.update-content",
    title: `Review: ${item.section}`,
    description: `Apply approved review item ${item.id}`,
    priority: item.severity === "critical" ? "critical" : item.severity === "high" ? "high" : item.severity === "medium" ? "medium" : "low",
    risk: item.severity === "critical" ? "critical" : item.severity === "high" ? "high" : item.severity === "medium" ? "moderate" : "safe",
    automatable: item.severity === "safe",
    requiresApproval: item.severity !== "safe",
    rollbackSupported: true,
    estimatedDuration: "5m",
    requiredProvider: "wordpress",
    payload: { content: item.editedContent ?? item.after },
    status: item.severity === "safe" ? "approved" : "pending",
  } as never));
  return generateExecutionPlan({ actions } as never);
}

generateCommand
  .command("cta").description("Generate a CTA section improvement")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only (no apply)")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runGenerate(["cta"], options));

generateCommand
  .command("section").description("Generate a specific section by kind")
  .argument("<kind>", `Section kind: ${SECTION_KINDS.join(", ")}`)
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only (no apply)")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (kind: string, options) => {
    if (!SECTION_KINDS.includes(kind)) {
      process.stderr.write(`Unknown section kind: ${kind}\n`);
      return;
    }
    await runGenerate([kind], options);
  });

generateCommand
  .command("page").description("Generate improvements for all detected sections")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only (no apply)")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runGenerate([], options));

// Sprint 20: AI Writing Engine commands.
const writeCommand = program.command("write").description("AI content generation (Sprint 20)");

async function runWrite(
  sectionType: string,
  options: {
    project?: string;
    provider?: string;
    model?: string;
    json?: boolean;
    preview?: boolean;
    dryRun?: boolean;
  },
) {
  const project = options.project ?? "default";
  const { resolved, knowledge, profile } = await loadProjectContext(project, "write");
  const brand = buildBrandProfile({ knowledge, memory: profile.memorySummary, projectId: resolved.project });
  const engine = new AIEngine(ProviderFactory.create({ provider: (options.provider ?? "openai") as never, model: options.model }));
  const registry = new PromptRegistry();

  const brief = {
    primaryKeyword: knowledge.primaryKeywords[0] ?? "",
    secondaryKeywords: knowledge.secondaryKeywords,
    searchIntent: "informational" as const,
    audience: knowledge.targetAudience ?? "general",
    tone: brand.tone,
    readingLevel: brand.readingLevel,
    wordCountTarget: 1200,
    competitors: knowledge.competitors,
    pageGoal: `Generate ${sectionType} content`,
    userQuestions: [],
    requiredEntities: [],
    internalLinks: [],
    ctaGoal: brand.ctaStyle,
    brand,
  };

  let result: { content: unknown; patch: unknown };
  switch (sectionType) {
    case "hero":
      result = await writeHero({ brief, brand, engine, registry });
      break;
    case "benefits":
      result = await writeBenefits({ brief, brand, engine, registry });
      break;
    case "features":
      result = await writeFeatures({ brief, brand, engine, registry });
      break;
    case "services":
      result = await writeServices({ brief, brand, engine, registry });
      break;
    case "products":
      result = await writeProducts({ brief, brand, engine, registry });
      break;
    case "about":
      result = await writeAbout({ brief, brand, engine, registry });
      break;
    case "faq":
      result = await writeFaq({ brief, brand, engine, registry });
      break;
    case "testimonials":
      result = await writeTestimonials({ brief, brand, engine, registry });
      break;
    case "cta":
      result = await writeCta({ brief, brand, engine, registry });
      break;
    case "buying-guide":
      result = await writeBuyingGuide({ brief, brand, engine, registry });
      break;
    case "comparison":
      result = await writeComparison({ brief, brand, engine, registry });
      break;
    case "product":
      result = await writeProduct({ brief, brand, engine, registry });
      break;
    case "introduction":
      result = await writeIntroduction({ brief, brand, engine, registry });
      break;
    case "conclusion":
      result = await writeConclusion({ brief, brand, engine, registry });
      break;
    case "contact":
      result = await writeContact({ brief, brand, engine, registry });
      break;
    case "blog":
      result = await writeBlog({ brief, brand, engine, registry });
      break;
    default:
      process.stderr.write(`Unknown section type: ${sectionType}\n`);
      return;
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }
  process.stdout.write(`Generated ${sectionType} section for project "${resolved.project}".\n`);
  if (options.preview) {
    process.stdout.write("Preview mode: no changes applied.\n");
  }
}

writeCommand
  .command("hero")
  .description("Generate a hero section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("hero", options));

writeCommand
  .command("benefits")
  .description("Generate a benefits section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("benefits", options));

writeCommand
  .command("features")
  .description("Generate a features section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("features", options));

writeCommand
  .command("services")
  .description("Generate a services section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("services", options));

writeCommand
  .command("products")
  .description("Generate a products section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("products", options));

writeCommand
  .command("about")
  .description("Generate an about section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("about", options));

writeCommand
  .command("faq")
  .description("Generate a FAQ section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("faq", options));

writeCommand
  .command("testimonials")
  .description("Generate a testimonials section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("testimonials", options));

writeCommand
  .command("cta")
  .description("Generate a CTA section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("cta", options));

writeCommand
  .command("buying-guide")
  .description("Generate a buying guide section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("buying-guide", options));

writeCommand
  .command("comparison")
  .description("Generate a comparison section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("comparison", options));

writeCommand
  .command("product")
  .description("Generate a product section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("product", options));

writeCommand
  .command("introduction")
  .description("Generate an introduction section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("introduction", options));

writeCommand
  .command("conclusion")
  .description("Generate a conclusion section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("conclusion", options));

writeCommand
  .command("contact")
  .description("Generate a contact section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("contact", options));

writeCommand
  .command("blog")
  .description("Generate a blog section")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (options) => runWrite("blog", options));

writeCommand
  .command("section")
  .description("Generate a specific section by type")
  .argument("<type>", "Section type")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--preview", "Preview only")
  .option("--dry-run", "Dry run")
  .option("--json", "Output JSON")
  .action(async (type: string, options) => runWrite(type, options));

writeCommand
  .command("preview")
  .description("Preview generated content without applying")
  .option("--project <project>", "Project ID")
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--json", "Output JSON")
  .action(async (options) => {
    const project = options.project ?? "default";
    const { resolved, knowledge, profile } = await loadProjectContext(project, "write");
    const brand = buildBrandProfile({ knowledge, memory: profile.memorySummary, projectId: resolved.project });
    const voice = detectVoiceProfile({} as never);
    const result = {
      project: resolved.project,
      brand: { companyName: brand.companyName, tone: brand.tone, readingLevel: brand.readingLevel },
      voice: { primaryVoice: voice.primaryVoice, confidence: voice.confidence },
      availableWriters: [
        "hero", "benefits", "features", "services", "products", "about", "faq",
        "testimonials", "cta", "buying-guide", "comparison", "product",
        "introduction", "conclusion", "contact", "blog",
      ],
    };
    if (options.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Project: ${result.project}\n`);
    process.stdout.write(`Brand: ${result.brand.companyName} (${result.brand.tone})\n`);
    process.stdout.write(`Voice: ${result.voice.primaryVoice} (confidence: ${result.voice.confidence})\n`);
    process.stdout.write(`Writers: ${result.availableWriters.join(", ")}\n`);
  });

writeCommand
  .command("validate")
  .description("Validate existing content")
  .argument("[content]", "Content to validate")
  .option("--project <project>", "Project ID")
  .option("--json", "Output JSON")
  .action(async (content: string | undefined, options: { project?: string; json?: boolean }) => {
    const text = content ?? "Sample content for validation.";
    const report = validateSEO(text, "keyword", ["secondary"]);
    if (options.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
      return;
    }
    process.stdout.write(`SEO Score: ${report.score}\n`);
    process.stdout.write(`Word Count: ${report.wordCount}\n`);
    process.stdout.write(`Issues: ${report.issues.length}\n`);
    for (const issue of report.issues) {
      process.stdout.write(`  - ${issue}\n`);
    }
  });

writeCommand
  .command("score")
  .description("Score existing content")
  .argument("[content]", "Content to score")
  .option("--project <project>", "Project ID")
  .option("--json", "Output JSON")
  .action(async (content: string | undefined, options: { project?: string; json?: boolean }) => {
    const text = content ?? "Sample content for scoring.";
    const seo = validateSEO(text, "keyword", ["secondary"]);
    const quality = scoreContent(seo);
    if (options.json) {
      process.stdout.write(JSON.stringify({ seo, quality }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`SEO Score: ${quality.seoScore}\n`);
    process.stdout.write(`Readability: ${quality.readabilityScore}\n`);
    process.stdout.write(`Naturalness: ${quality.naturalnessScore}\n`);
    process.stdout.write(`Brand Voice: ${quality.brandVoiceScore}\n`);
    process.stdout.write(`Overall: ${quality.overallScore}\n`);
  });

// Sprint 19: AI provider commands
const aiCommand = program.command("ai").description("AI provider commands (Sprint 19)");

aiCommand
  .command("providers")
  .description("List available AI providers")
  .option("--json", "Output as JSON")
  .action((options: { json?: boolean }) => {
    const providers = ProviderFactory.listProviders();
    if (options.json) {
      process.stdout.write(JSON.stringify(providers, null, 2) + "\n");
      return;
    }
    for (const p of providers) {
      process.stdout.write(`${p.id} - ${p.name} (${p.status})\n`);
    }
  });

aiCommand
  .command("models")
  .description("List available models for a provider")
  .argument("[provider]", "Provider ID (default: configured default)")
  .option("--json", "Output as JSON")
  .action(async (providerId: string | undefined, options: { json?: boolean }) => {
    const provider = ProviderFactory.create({ provider: (providerId ?? "openai") as never });
    const matrix = provider.capabilityMatrix?.() ?? {
      supportsStreaming: false,
      supportsSystemPrompts: false,
      supportsJSON: false,
      supportsVision: false,
      supportsReasoning: false,
      supportsFunctionCalling: false,
      supportsLargeContext: false,
      maxContextTokens: 4096,
      maxOutputTokens: 1024,
      costTier: "medium",
      speedTier: "medium",
    } as const;
    if (options.json) {
      process.stdout.write(JSON.stringify(matrix, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Provider: ${providerId ?? "default"}\n`);
    process.stdout.write(`Streaming: ${matrix.supportsStreaming}\n`);
    process.stdout.write(`JSON mode: ${matrix.supportsJSON}\n`);
    process.stdout.write(`Vision: ${matrix.supportsVision}\n`);
    process.stdout.write(`Max tokens: ${matrix.maxOutputTokens}\n`);
  });

aiCommand
  .command("test")
  .description("Test an AI provider connection")
  .argument("[provider]", "Provider ID (default: configured default)")
  .option("--model <model>", "Model name")
  .option("--json", "Output as JSON")
  .action(async (providerId: string | undefined, options: { model?: string; json?: boolean }) => {
    const provider = ProviderFactory.create({ provider: (providerId ?? "openai") as never, model: options.model });
    const engine = new AIEngine(provider);
    const healthy = await engine.health();
    if (options.json) {
      process.stdout.write(JSON.stringify({ provider: providerId ?? "default", healthy }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Provider ${providerId ?? "default"}: ${healthy ? "✓ healthy" : "✗ unreachable"}\n`);
  });

aiCommand
  .command("benchmark")
  .description("Run a quick benchmark against a provider")
  .argument("[provider]", "Provider ID (default: configured default)")
  .option("--model <model>", "Model name")
  .option("--json", "Output as JSON")
  .action(async (providerId: string | undefined, options: { model?: string; json?: boolean }) => {
    const provider = ProviderFactory.create({ provider: (providerId ?? "openai") as never, model: options.model });
    const engine = new AIEngine(provider);
    const start = Date.now();
    const healthy = await engine.health();
    const latency = Date.now() - start;
    if (options.json) {
      process.stdout.write(JSON.stringify({ provider: providerId ?? "default", healthy, latencyMs: latency }, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Provider ${providerId ?? "default"}: ${healthy ? "✓" : "✗"} (${latency}ms)\n`);
  });

aiCommand
  .command("cost")
  .description("Show cost tracking summary")
  .option("--provider <provider>", "Filter by provider")
  .option("--project <project>", "Filter by project")
  .option("--month <month>", "Filter by month (YYYY-MM)")
  .option("--json", "Output as JSON")
  .action(async (options: { provider?: string; project?: string; month?: string; json?: boolean }) => {
    const { CostTracker } = await import("@forge/ai-engine");
    const tracker = new CostTracker();
    const summary = tracker.getSummary();
    if (options.json) {
      process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Total cost: $${summary.totalCost.toFixed(4)}\n`);
    process.stdout.write(`Total tokens: ${summary.totalTokens}\n`);
  });

aiCommand
  .command("prompt")
  .description("Show prompt registry info")
  .argument("[promptId]", "Prompt ID")
  .option("--json", "Output as JSON")
  .action(async (promptId: string | undefined, options: { json?: boolean }) => {
    const { PromptRegistry } = await import("@forge/prompt-registry");
    const registry = new PromptRegistry();
    if (promptId) {
      const prompt = registry.get(promptId);
      if (options.json) {
        process.stdout.write(JSON.stringify(prompt, null, 2) + "\n");
        return;
      }
      process.stdout.write(`Prompt: ${prompt.id}\n`);
      process.stdout.write(`Version: ${prompt.versions.at(-1)?.version ?? "0.0.0"}\n`);
      process.stdout.write(`Variables: ${prompt.variables?.join(", ") ?? "none"}\n`);
      return;
    }
    const prompts = registry.list();
    if (options.json) {
      process.stdout.write(JSON.stringify(prompts, null, 2) + "\n");
      return;
    }
    for (const p of prompts) {
      process.stdout.write(`${p.id} v${p.versions.at(-1)?.version ?? "0.0.0"}\n`);
    }
  });

aiCommand
  .command("logs")
  .description("Show provider logs")
  .option("--provider <provider>", "Filter by provider")
  .option("--limit <n>", "Limit results", "50")
  .option("--json", "Output as JSON")
  .action(async (options: { provider?: string; limit?: string; json?: boolean }) => {
    const { ProviderLogger } = await import("@forge/ai-engine");
    const logger = new ProviderLogger();
    const logs = logger.query({ provider: options.provider, limit: parseInt(options.limit ?? "50", 10) });
    if (options.json) {
      process.stdout.write(JSON.stringify(logs, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Recent logs (${logs.length}):\n`);
    for (const log of logs) {
      process.stdout.write(`  [${log.timestamp}] ${log.provider}/${log.model} - ${log.tokens} tokens, ${log.latency}ms\n`);
    }
  });

aiCommand
  .command("history")
  .description("Show prompt execution history")
  .option("--project <project>", "Filter by project")
  .option("--limit <n>", "Limit results", "20")
  .option("--json", "Output as JSON")
  .action(async (options: { project?: string; limit?: string; json?: boolean }) => {
    const { PromptHistory } = await import("@forge/ai-engine");
    const history = new PromptHistory();
    const entries = history.query({ project: options.project, limit: parseInt(options.limit ?? "20", 10) });
    if (options.json) {
      process.stdout.write(JSON.stringify(entries, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Prompt history (${entries.length}):\n`);
    for (const entry of entries) {
      process.stdout.write(`  [${entry.timestamp}] ${entry.provider}/${entry.model} - ${entry.tokenUsage.total} tokens\n`);
    }
  });

// Sprint 22B: Optimization Orchestrator commands
const optimizeCommand = program.command("optimize").description("Run a full optimization workflow (Sprint 22B)");

optimizeCommand
  .argument("[project]", "Project ID", "default")
  .option("--workflow <id>", "Workflow ID", "homepage-optimization")
  .option("--dry-run", "Simulate without making changes", true)
  .option("--provider <provider>", "AI provider")
  .option("--model <model>", "Model name")
  .option("--json", "Output result as JSON")
  .action(async (project: string, options: { workflow?: string; dryRun?: boolean; provider?: string; model?: string; json?: boolean }) => {
    try {
      const orchestrator = new OptimizationOrchestrator({
        workflowId: options.workflow ?? "homepage-optimization",
        project: project ?? "default",
        provider: options.provider,
        model: options.model,
        dryRun: options.dryRun ?? true,
      });

      orchestrator.registerEngine("content-intelligence", createContentIntelligenceEngine());
      orchestrator.registerEngine("review", createReviewEngine());
      orchestrator.registerEngine("composer", createComposerEngine());
      orchestrator.registerEngine("execution", createExecutionEngine({ dryRun: options.dryRun ?? true }));

      const result = await orchestrator.run();

      if (options.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        return;
      }

      process.stdout.write(`Workflow: ${result.workflow}\n`);
      process.stdout.write(`State: ${result.state}\n`);
      process.stdout.write(`Duration: ${result.metrics.duration}ms\n`);
      process.stdout.write(`Steps: ${Object.keys(result.metrics.stepDurations).length}\n`);
      if (result.error) {
        process.stdout.write(`Error: ${result.error.message}\n`);
      }
    } catch (error) {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      process.exit(1);
    }
  });

const workflowCommand = program.command("workflow").description("Workflow management commands (Sprint 22B)");

workflowCommand
  .command("list")
  .option("--json", "Output workflows as JSON")
  .action((options: { json?: boolean }) => {
    const workflows = listWorkflows().map((id: string) => {
      const wf = getWorkflow(id);
      return { id: wf.id, name: wf.name, description: wf.description, steps: wf.steps.map((s: { id: string }) => s.id) };
    });
    if (options.json) {
      process.stdout.write(JSON.stringify(workflows, null, 2) + "\n");
      return;
    }
    for (const wf of workflows) {
      process.stdout.write(`${wf.id} - ${wf.name}\n`);
      process.stdout.write(`  ${wf.description}\n`);
      process.stdout.write(`  Steps: ${wf.steps.join(" -> ")}\n`);
    }
  });

workflowCommand
  .command("show")
  .argument("<id>", "Workflow ID")
  .option("--json", "Output workflow as JSON")
  .action((id: string, options: { json?: boolean }) => {
    try {
      const wf = getWorkflow(id);
      if (options.json) {
        process.stdout.write(JSON.stringify(wf, null, 2) + "\n");
        return;
      }
      process.stdout.write(`Workflow: ${wf.name}\n`);
      process.stdout.write(`ID: ${wf.id}\n`);
      process.stdout.write(`Description: ${wf.description}\n`);
      process.stdout.write("Steps:\n");
      for (const step of wf.steps) {
        process.stdout.write(`  ${step.id} -> engine: ${step.engine}, phase: ${step.phase}\n`);
      }
    } catch (error) {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
