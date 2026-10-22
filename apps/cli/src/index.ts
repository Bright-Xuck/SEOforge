#!/usr/bin/env node

// @forge/cli
// Forge command-line interface.

import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { FORGE_NAME, FORGE_VERSION } from "@forge/shared";
import { loadEnvFile } from "@forge/config";
import { createWordPressProvider, WORDPRESS_PROVIDER_METADATA } from "@forge/providers-wordpress";
import { WebsiteReadError } from "@forge/core";
import { readWebsite } from "@forge/tools/website-reader";
import { loadKnowledge, createProjectProfile, detectChanges, updateKnowledgeGraph } from "@forge/knowledge-engine";
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
import { AIEngine, ProviderFactory, ProviderUnavailableError } from "@forge/ai-engine";
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
import type { RollbackOperation } from "@forge/execution-engine";
import { HomepageAnalyzer, HomepageDetector, HomepagePlanner, createReviewSessionFromHomepage } from "@forge/homepage-engine";
import type { HomepageOptimizationPlan, HomepagePreviewItem } from "@forge/homepage-engine";
import { decideItem, generateReport, computeMetrics, completeSession, createReviewSession, saveReviewSession, loadReviewSession, listReviewSessions, REVIEW_POLICIES, type ReviewSession, type ReviewPolicyName } from "@forge/review-engine";
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
import { buildUniversalPage, applyContentPatch } from "@forge/dom-engine";
import { createElementorBridge, ElementorBridgeError } from "./elementor/bridge.js";
import type { ElementorRollbackPayload, ElementorPatchInput, ElementorPreviewResult, ElementorWriteResult, ElementorRollbackResult } from "./elementor/bridge.js";
import {
  createElementorWriteMemoryEvent,
  createElementorRollbackMemoryEvent,
  recordElementorWriteEvent,
  recordElementorRollbackEvent,
} from "./elementor/memory.js";
import { generateContent, buildProjectContext, registerContentPrompts } from "@forge/content-generation";
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
  createSiteIntelligenceEngine,
  createContentGenerationEngine,
  createReviewEngine,
  createComposerEngine,
  createExecutionEngine,
  buildExecutionPlanFromReview,
} from "@forge/optimization-orchestrator";
import { deriveElementorSections, pageUrlFor } from "./optimize/elementor-sections.js";

// Load a local `.env` before any command reads process.env. Values already in
// the shell/CI environment take precedence; the loader never logs values.
const envFileResult = loadEnvFile(process.env.FORGE_ENV_FILE ?? ".env");
if (envFileResult.errors.length > 0) {
  for (const error of envFileResult.errors) {
    process.stderr.write(`Warning: ${error}\n`);
  }
}

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
    { id: "zai", name: "Z.ai" },
    { id: "ollama", name: "Ollama" },
  ],
  exists: (id: string) => ["openai", "anthropic", "gemini", "openrouter", "zai", "ollama"].includes(id),
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
  const provider = ProviderFactory.create({ provider: resolveAiProviderId(providerId) as never });
  return new AIEngine(provider);
}

const AI_PROVIDER_IDS = ["openai", "anthropic", "gemini", "openrouter", "zai", "ollama"] as const;
const AI_PROVIDER_ENV: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  zai: "ZAI_API_KEY",
  ollama: "OLLAMA_BASE_URL",
};

function requireConfigValue(value: string | undefined, label: string): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing configuration: ${label} is required. Add it to .env (copy .env.example) or pass the matching flag. Run "forge doctor" to check your setup.`,
    );
  }
  return value.trim();
}

function validateSiteUrl(value: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `${label} must be an absolute URL, for example http://127.0.0.1:8080.`,
    );
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} must use http or https.`);
  }
  return value.replace(/\/+$/, "");
}

function resolveWordPressConnection(options: {
  url?: string;
  username?: string;
  appPassword?: string;
} = {}): { siteUrl: string; username: string; applicationPassword: string } {
  return {
    siteUrl: validateSiteUrl(
      requireConfigValue(
        options.url ?? process.env.FORGE_WP_SITE_URL,
        "WordPress site URL (FORGE_WP_SITE_URL or --url)",
      ),
      "WordPress site URL",
    ),
    username: requireConfigValue(
      options.username ?? process.env.FORGE_WP_USERNAME,
      "WordPress username (FORGE_WP_USERNAME or --username)",
    ),
    applicationPassword: requireConfigValue(
      options.appPassword ?? process.env.FORGE_WP_APPLICATION_PASSWORD,
      "WordPress application password (FORGE_WP_APPLICATION_PASSWORD or --app-password)",
    ),
  };
}

function createWordPressProviderFromEnv() {
  return createWordPressProvider(resolveWordPressConnection());
}

function resolveHomepageUrl(): string {
  const raw = process.env.FORGE_HOME_URL ?? process.env.FORGE_WP_SITE_URL;
  return validateSiteUrl(
    requireConfigValue(raw, "site URL (FORGE_HOME_URL or FORGE_WP_SITE_URL)"),
    "Forge site URL",
  );
}

function resolveAiProviderId(providerArg?: string, providerOption?: string): string {
  if (providerArg && providerOption && providerArg !== providerOption) {
    throw new Error(
      `Conflicting AI providers: positional "${providerArg}" and --provider "${providerOption}". Pass only one.`,
    );
  }
  const providerId =
    providerOption ??
    providerArg ??
    process.env.DEFAULT_PROVIDER ??
    detectConfiguredAiProvider() ??
    "ollama";
  if (!AI_PROVIDER_IDS.includes(providerId as (typeof AI_PROVIDER_IDS)[number])) {
    throw new Error(
      `Unknown AI provider "${providerId}". Supported providers: ${AI_PROVIDER_IDS.join(", ")}.`,
    );
  }
  return providerId;
}

function aiProviderSetupMessage(providerId: string, error: unknown): string {
  if (!(error instanceof ProviderUnavailableError)) {
    return error instanceof Error ? error.message : String(error);
  }
  if (providerId === "ollama") {
    return `AI provider "ollama" is not reachable. Start Ollama and confirm OLLAMA_BASE_URL (currently ${process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}), then run "forge ai test ollama".`;
  }
  const envVar = AI_PROVIDER_ENV[providerId];
  if (envVar && !aiProviderConfigured(providerId)) {
    return `AI provider "${providerId}" is not configured. Set ${envVar} in .env or your environment, then run "forge ai test ${providerId}".`;
  }
  return `AI provider "${providerId}" is configured but unavailable. Check the credentials/model and run "forge ai test ${providerId}".`;
}

function failAiCommand(providerId: string, error: unknown, json?: boolean): void {
  const message = aiProviderSetupMessage(providerId, error);
  if (json) {
    process.stdout.write(
      JSON.stringify(
        {
          provider: providerId,
          error: {
            code: error instanceof ProviderUnavailableError ? "AI_PROVIDER_UNAVAILABLE" : "AI_COMMAND_FAILED",
            message,
          },
        },
        null,
        2,
      ) + "\n",
    );
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
  process.exitCode = 1;
}

async function loadHomepageProjectContext(project: string) {
  const { resolved, rootDir, knowledge, memory, profile } = await loadProjectContext(project, "homepage");
  const siteUrl = resolveHomepageUrl();
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
      process.exitCode = 1;
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
      process.exitCode = 1;
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
      process.exitCode = 1;
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
      process.exitCode = 1;
    }
  });

// Sprint 29: offline configuration/onboarding check. No network calls; live
// checks stay in `forge ai test` and `forge wp elementor doctor`.
program
  .command("doctor")
  .description("Check local Forge configuration (offline; no network calls)")
  .option("--json", "Output result as JSON")
  .action((options: { json?: boolean }) => {
    const checks: {
      id: string;
      status: "pass" | "warn" | "fail";
      label: string;
      detail: string;
    }[] = [];
    const add = (id: string, status: "pass" | "warn" | "fail", label: string, detail: string) => {
      checks.push({ id, status, label, detail });
    };

    const nodeMajor = Number(process.versions.node.split(".")[0]);
    if (nodeMajor >= 20) {
      add("node", "pass", "Node.js", `v${process.versions.node}`);
    } else {
      add("node", "fail", "Node.js", `v${process.versions.node} is too old; Forge requires Node.js 20 or newer.`);
    }

    if (envFileResult.errors.length > 0) {
      add("env-file", "fail", "Environment file", envFileResult.errors.join(" "));
    } else if (envFileResult.loaded) {
      add(
        "env-file",
        "pass",
        "Environment file",
        `Loaded ${envFileResult.applied.length} variable(s) from ${envFileResult.path}; ${envFileResult.preserved.length} shell value(s) preserved.`,
      );
    } else {
      add(
        "env-file",
        "warn",
        "Environment file",
        `No .env found at ${envFileResult.path}. Copy .env.example to .env or use shell environment variables.`,
      );
    }

    const siteUrl = process.env.FORGE_WP_SITE_URL;
    if (!siteUrl) {
      add("wp-site", "fail", "WordPress site", "FORGE_WP_SITE_URL is not set. Add it to .env (copy .env.example).");
    } else {
      try {
        validateSiteUrl(siteUrl, "FORGE_WP_SITE_URL");
        add("wp-site", "pass", "WordPress site", siteUrl);
      } catch (error) {
        add("wp-site", "fail", "WordPress site", error instanceof Error ? error.message : String(error));
      }
    }

    const username = process.env.FORGE_WP_USERNAME;
    if (!username) {
      add("wp-username", "fail", "WordPress user", "FORGE_WP_USERNAME is not set.");
    } else {
      add("wp-username", "pass", "WordPress user", username);
    }

    const applicationPassword = process.env.FORGE_WP_APPLICATION_PASSWORD;
    const applicationPasswordLooksValid =
      typeof applicationPassword === "string" &&
      /^[A-Za-z0-9]{24}$/.test(applicationPassword.replace(/\s+/g, ""));
    if (!applicationPassword) {
      add(
        "wp-password",
        "fail",
        "WordPress application password",
        "FORGE_WP_APPLICATION_PASSWORD is not set. Never commit this value.",
      );
    } else if (!/^[A-Za-z0-9]{24}$/.test(applicationPassword.replace(/\s+/g, ""))) {
      add(
        "wp-password",
        "warn",
        "WordPress application password",
        "set, but it does not look like a WordPress application password " +
          "(24 letters/digits, optionally grouped with spaces). It may be a normal login " +
          "password, which the REST API rejects. Create one under Users -> Profile -> " +
          "Application Passwords. (Value never displayed.)",
      );
    } else {
      add(
        "wp-password",
        "pass",
        "WordPress application password",
        "set (24-character application-password format; value never displayed)",
      );
    }

    const homeUrl = process.env.FORGE_HOME_URL;
    if (homeUrl) {
      try {
        validateSiteUrl(homeUrl, "FORGE_HOME_URL");
        add("home-url", "pass", "Homepage URL override", homeUrl);
      } catch (error) {
        add("home-url", "fail", "Homepage URL override", error instanceof Error ? error.message : String(error));
      }
    }

    const configuredProviders = AI_PROVIDER_IDS.filter(
      (providerId) => providerId !== "ollama" && aiProviderConfigured(providerId),
    );
    if (configuredProviders.length > 0) {
      add("ai", "pass", "AI providers", `Configured: ${configuredProviders.join(", ")}`);
    } else {
      add(
        "ai",
        "warn",
        "AI providers",
        "No API key configured. AI section generation is disabled; deterministic metadata-only optimization still works.",
      );
    }

    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    try {
      const parsed = new URL(ollamaBaseUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protocol");
      add("ollama-url", "pass", "Ollama URL", ollamaBaseUrl);
    } catch {
      add("ollama-url", "fail", "Ollama URL", `OLLAMA_BASE_URL is not a valid http(s) URL: ${ollamaBaseUrl}`);
    }

    try {
      const rootDir = "projects";
      mkdirSync(rootDir, { recursive: true });
      const probe = `${rootDir}/.forge-doctor-probe`;
      writeFileSync(probe, "ok", "utf8");
      unlinkSync(probe);
      add("projects", "pass", "Runtime storage", `${rootDir} is writable`);
    } catch (error) {
      add(
        "projects",
        "fail",
        "Runtime storage",
        `Cannot write to projects/: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const errors = checks.filter((check) => check.status === "fail");
    const warnings = checks.filter((check) => check.status === "warn");
    const ok = errors.length === 0;
    const writeConfigPresent =
      ok &&
      Boolean(siteUrl) &&
      Boolean(username) &&
      applicationPasswordLooksValid;

    if (options.json) {
      process.stdout.write(
        JSON.stringify(
          {
            ok,
            writeConfigPresent,
            liveChecksRequired: true,
            node: process.versions.node,
            cwd: process.cwd(),
            envFile: {
              path: envFileResult.path,
              loaded: envFileResult.loaded,
              applied: envFileResult.applied.length,
              preserved: envFileResult.preserved.length,
              errors: envFileResult.errors.length,
            },
            checks,
          },
          null,
          2,
        ) + "\n",
      );
      if (!ok) process.exitCode = 1;
      return;
    }

    for (const check of checks) {
      const marker = check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗";
      process.stdout.write(`${marker} ${check.label}: ${check.detail}\n`);
    }
    process.stdout.write(
      `\n${ok ? "Configuration looks usable." : "Configuration has errors."} Write credentials configured: ${writeConfigPresent ? "yes" : "no"}. ` +
        `${warnings.length} warning(s), ${errors.length} error(s).\n`,
    );
    process.stdout.write(
      "Live access is not checked by this offline command. " +
        'Next: "forge ai test <provider>" and "forge wp elementor doctor <page>".\n',
    );
    if (!ok) process.exitCode = 1;
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
            process.exitCode = 1;
          }
        } catch (error) {
          process.stderr.write(
            `Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
          );
          process.exitCode = 1;
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
          process.exitCode = 1;
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
          process.exitCode = 1;
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
      process.exitCode = 1;
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
      process.exitCode = 1;
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

// ─── Sprint 25/26: Elementor/WordPress write bridge ─────────────────────────
// Requires the optional forge-elementor-bridge companion plugin (0.3.0) on the
// site. All commands are safe by default: preview/validate/apply default to
// dry-run (zero remote mutations). Only `apply --apply` performs a
// provider-backed write, which is then re-read and verified structurally.

function loadElementorPatchFromFile(path: string): ElementorPatchInput {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const patch = Array.isArray(parsed) ? (parsed[0] as Record<string, unknown>) : parsed;
  return {
    id: typeof patch.id === "string" ? patch.id : undefined,
    currentContent: typeof patch.currentContent === "string" ? patch.currentContent : undefined,
    proposedContent: typeof patch.proposedContent === "string" ? patch.proposedContent : "",
    target: patch.target && (patch.target as { format?: string }).format === "elementor"
      ? (patch.target as { format: "elementor"; elementId: string; settingsKey: string })
      : undefined,
    semanticIntent: patch.semanticIntent as { kind: string; value?: string; sectionKind?: string } | undefined,
    sourceFingerprint: typeof patch.sourceFingerprint === "string" ? patch.sourceFingerprint : undefined,
    expectedWidgetType: typeof patch.expectedWidgetType === "string" ? patch.expectedWidgetType : undefined,
  };
}

/**
 * Elementor command credentials: positional args (legacy explicit form) or
 * environment variables (FORGE_WP_SITE_URL / FORGE_WP_USERNAME /
 * FORGE_WP_APPLICATION_PASSWORD) so `forge wp elementor inspect <page>` works
 * against a configured site. Credentials are never printed.
 */
function resolveElementorCredentials(
  site: string | undefined,
  username: string | undefined,
  password: string | undefined,
): { siteUrl: string; username: string; applicationPassword: string } {
  const siteUrl = site ?? process.env.FORGE_WP_SITE_URL;
  const user = username ?? process.env.FORGE_WP_USERNAME;
  const applicationPassword = password ?? process.env.FORGE_WP_APPLICATION_PASSWORD;
  const missing: string[] = [];
  if (!siteUrl) missing.push("site URL (positional <site> or FORGE_WP_SITE_URL)");
  if (!user) missing.push("username (positional <username> or FORGE_WP_USERNAME)");
  if (!applicationPassword) missing.push("application password (positional <password> or FORGE_WP_APPLICATION_PASSWORD)");
  if (missing.length > 0) {
    throw new Error(`Missing WordPress credentials: provide ${missing.join(", ")}.`);
  }
  return { siteUrl: siteUrl as string, username: user as string, applicationPassword: applicationPassword as string };
}

/**
 * Elementor positional-argument normalization: Commander fills arguments
 * positionally, so callers may either pass all four legacy positionals
 * (<site> <username> <password> <page>) or just the page (credentials via
 * FORGE_WP_* environment variables). Any other count is ambiguous and refused
 * with an explanation.
 */
function normalizeElementorArgs(args: { site?: string; username?: string; password?: string; page?: string }): {
  page: { site?: string; username?: string; password?: string; page: string };
} {
  const provided = [args.site, args.username, args.password, args.page].filter((value) => value !== undefined);
  if (provided.length === 4) {
    return { page: { site: args.site, username: args.username, password: args.password, page: args.page as string } };
  }
  if (provided.length === 1) {
    return { page: { page: provided[0] as string } };
  }
  throw new Error(
    "Ambiguous arguments: pass either just the page (credentials via the FORGE_WP_SITE_URL, FORGE_WP_USERNAME and FORGE_WP_APPLICATION_PASSWORD environment variables) " +
      "or all of <site> <username> <password> <page>.",
  );
}

/**
 * Print a typed, actionable error and exit non-zero. Raw provider/HTTP errors
 * are never the primary CLI error surface (Sprint 26).
 */
function fail(error: unknown): void {
  if (error instanceof ElementorBridgeError) {
    process.stderr.write(`Error [${error.code}]: ${error.message}\n`);
  } else {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }
  process.exitCode = 1;
}

async function resolveElementorPageId(provider: ReturnType<typeof createWordPressProvider>, pageArg: string): Promise<number> {
  const trimmed = pageArg.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const slug = trimmed.replace(/\/+$/, "").split("/").filter(Boolean).at(-1) ?? trimmed;
  const pages = await provider.getPages({ search: slug, perPage: 1 });
  const found = pages.data[0];
  if (!found) {
    throw new Error(`Could not resolve page "${pageArg}" to a WordPress page id. Pass a numeric post id or a page URL.`);
  }
  return found.id;
}

async function fetchRenderedPageHtml(provider: ReturnType<typeof createWordPressProvider>, pageId: number): Promise<string | undefined> {
  try {
    const page = await provider.getPage(pageId);
    if (!page?.link) return undefined;
    const response = await fetch(page.link);
    if (!response.ok) return undefined;
    return await response.text();
  } catch {
    return undefined;
  }
}

function writeRollbackOutput(output: string | undefined, rollbackPayload: ElementorRollbackPayload): void {
  const json = JSON.stringify(rollbackPayload, null, 2) + "\n";
  if (output) {
    writeFileSync(output, json);
    process.stdout.write(`Rollback payload written to ${output}\n`);
  } else {
    process.stdout.write("\nRollback payload (save this to restore later):\n");
    process.stdout.write(json);
  }
}

const elementorCommand = wpCommand.command("elementor").description("Elementor document commands (requires the forge-elementor-bridge companion plugin v0.3.0)")
  .addHelpText("after", `
Safety model:
  inspect   read-only. Shows exactly what SEO Forge sees (fingerprint, widgets, editable controls).
  preview   SAFE — full local resolution + proposed mutation. Zero remote writes.
  validate  SAFE — resolution, compatibility and mutation checks. Zero remote writes.
  apply     DRY-RUN by default (zero writes). With --apply it MUTATES the remote site,
            then re-reads and verifies the result. A write is only reported as applied
            when the structural fingerprint of the re-read document matches.
  rollback  Restores the exact original document from a rollback payload. Refuses to
            overwrite a document that changed since the apply (use --force to override).

Stale documents are rejected (fingerprint + content checks). Unsupported widgets and
undeclared settings are refused, never patched best-effort.

Credentials: pass <site> <username> <password> positionally, or configure the
FORGE_WP_SITE_URL, FORGE_WP_USERNAME and FORGE_WP_APPLICATION_PASSWORD environment
variables and pass only the page. Credentials are never printed.`);

elementorCommand
  .command("doctor")
  .argument("[site]", "WordPress site URL (or set FORGE_WP_SITE_URL)")
  .argument("[username]", "WordPress username (or set FORGE_WP_USERNAME)")
  .argument("[password]", "WordPress application password (or set FORGE_WP_APPLICATION_PASSWORD)")
  .argument("[page]", "Page ID or URL (optional: also checks the target document)")
  .option("--json", "Output result as JSON")
  .description("Check WordPress/Elementor health: reachability, auth, Elementor availability/version, target document writability")
  .action(async (site: string | undefined, username: string | undefined, password: string | undefined, pageArg: string | undefined, options: { json?: boolean }) => {
    try {
      // Doctor accepts the same calling conventions as the other Elementor
      // commands: four positionals, or page-only + FORGE_WP_* environment
      // variables, or environment variables only (site-wide health check).
      // Sprint 26 fix: without this normalization, `doctor <page>` treated the
      // page id as the site URL and reported a false ELEMENTOR_NOT_INSTALLED.
      const provided = [site, username, password, pageArg].filter((value) => value !== undefined);
      const pageValue = provided.length === 0
        ? { site, username, password, page: undefined }
        // Preserve the historical `doctor <site>` form for a site-wide check.
        // A single non-URL positional is still the page form (`doctor 42`).
        : provided.length === 1 && /^https?:\/\//i.test(provided[0] as string)
          ? { site: provided[0] as string, username, password, page: undefined }
          : normalizeElementorArgs({ site, username, password, page: pageArg }).page;
      const credentials = resolveElementorCredentials(pageValue.site, pageValue.username, pageValue.password);
      const provider = createWordPressProvider(credentials);
      const bridge = createElementorBridge(provider);
      let postId: number | undefined;
      if (pageValue.page !== undefined) {
        postId = await resolveElementorPageId(provider, pageValue.page);
      }
      const health = await bridge.checkHealth(postId);
      if (options.json) {
        process.stdout.write(JSON.stringify(health, null, 2) + "\n");
        if (!health.ok) process.exitCode = 1;
        return;
      }
      process.stdout.write(`Forge Elementor health check${postId !== undefined ? ` (page ${postId})` : ""}:\n`);
      for (const check of health.checks) {
        const mark = check.ok ? "✓" : "✗";
        const detail = check.detail ? ` — ${check.detail}` : "";
        const code = !check.ok && check.code ? ` [${check.code}]` : "";
        process.stdout.write(`  ${mark} ${check.label}${detail}${code}\n`);
      }
      if (health.site) {
        process.stdout.write(`  Supported widgets: ${health.site.supportedWidgets.join(", ")}\n`);
        process.stdout.write(`  Unsupported widgets: ${health.site.unsupportedWidgets.join(", ")}\n`);
      }
      if (!health.ok) process.exitCode = 1;
    } catch (error) {
      fail(error);
    }
  });

elementorCommand
  .command("inspect")
  .argument("[site]", "WordPress site URL (or set FORGE_WP_SITE_URL)")
  .argument("[username]", "WordPress username (or set FORGE_WP_USERNAME)")
  .argument("[password]", "WordPress application password (or set FORGE_WP_APPLICATION_PASSWORD)")
  .argument("[page]", "Page ID or URL")
  .option("--html <file>", "Rendered HTML file for UniversalPage mapping (defaults to live fetch)")
  .option("--json", "Output result as JSON (machine-readable; no raw document unless --raw)")
  .option("--raw", "Include the full raw _elementor_data JSON (verbose mode)")
  .description("Inspect an Elementor document: version, fingerprint, builder detection, sections, widgets, editable/unsupported controls")
  .action(async (site: string | undefined, username: string | undefined, password: string | undefined, pageArg: string | undefined, options: { html?: string; json?: boolean; raw?: boolean }) => {
    try {
      const { page: pageValue } = normalizeElementorArgs({ site, username, password, page: pageArg });
      const credentials = resolveElementorCredentials(pageValue.site, pageValue.username, pageValue.password);
      const provider = createWordPressProvider(credentials);
      const pageId = await resolveElementorPageId(provider, pageValue.page as string);
      const bridge = createElementorBridge(provider);
      const renderedHtml = options.html && existsSync(options.html) ? readFileSync(options.html, "utf8") : await fetchRenderedPageHtml(provider, pageId);
      const result = await bridge.inspect(pageId, renderedHtml);
      if (options.json) {
        const payload = options.raw
          ? result
          : { ...result, document: { ...result.document, rawData: "<omitted — pass --raw to include the full _elementor_data JSON>" } };
        process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
        return;
      }
      process.stdout.write(`Page: ${result.title} (id ${result.postId})${result.pageUrl ? `\nURL: ${result.pageUrl}` : ""}\n`);
      process.stdout.write(`Elementor version: ${result.elementorVersion ?? "unknown"} | edit mode: ${result.editMode ?? "unknown"}\n`);
      process.stdout.write(`Document fingerprint: ${result.fingerprint}${result.modified ? ` | modified: ${result.modified}` : ""}\n`);
      process.stdout.write(`Builder: ${result.support.supported ? "Elementor (supported)" : `Elementor (refused: ${result.support.reason})`}\n`);
      process.stdout.write(`Sections/layout: ${result.inventory.layouts.join(", ")}\n`);
      process.stdout.write(`Widgets: ${result.inventory.widgetCount} (${result.inventory.supportedWidgetCount} patchable)\n`);
      process.stdout.write("Inventory:\n");
      for (const widget of result.inventory.widgets) {
        const mark = widget.supported ? "✓" : "✗";
        const reason = widget.unsupportedReason ? ` — ${widget.unsupportedReason}` : "";
        process.stdout.write(`  ${mark} ${widget.elementId} ${widget.widgetType}${reason}\n`);
        for (const field of widget.supportedFields) {
          const kind = field.richText ? "rich text" : "plain text";
          const preview = field.normalizedText.length > 60 ? `${field.normalizedText.slice(0, 57)}...` : field.normalizedText;
          process.stdout.write(`      ${field.settingsKey} (${kind}) = "${preview}" [${field.locator}]\n`);
        }
        if (widget.unsupportedFields.length > 0) {
          process.stdout.write(`      unsupported fields: ${widget.unsupportedFields.join(", ")}\n`);
        }
      }
      if (result.universalMapping) {
        process.stdout.write(`Universal mapping: ${result.universalMapping.entries.length} matched, ${result.universalMapping.unmatchedBlocks.length} unmatched\n`);
      }
      if (!options.raw) {
        process.stdout.write("(raw document omitted — pass --raw to dump the full _elementor_data JSON)\n");
      } else {
        process.stdout.write(`\nRaw _elementor_data:\n${result.document.rawData}\n`);
      }
    } catch (error) {
      fail(error);
    }
  });

elementorCommand
  .command("preview")
  .argument("[site]", "WordPress site URL (or set FORGE_WP_SITE_URL)")
  .argument("[username]", "WordPress username (or set FORGE_WP_USERNAME)")
  .argument("[password]", "WordPress application password (or set FORGE_WP_APPLICATION_PASSWORD)")
  .argument("[page]", "Page ID or URL")
  .option("--patch <file>", "Patch JSON file")
  .option("--json", "Output result as JSON")
  .description("Preview the exact Elementor change for a patch — SAFE, performs zero remote writes")
  .action(async (site: string | undefined, username: string | undefined, password: string | undefined, pageArg: string | undefined, options: { patch?: string; json?: boolean }) => {
    try {
      if (!options.patch) throw new Error("--patch <file> is required");
      const { page: pageValue } = normalizeElementorArgs({ site, username, password, page: pageArg });
      const credentials = resolveElementorCredentials(pageValue.site, pageValue.username, pageValue.password);
      const provider = createWordPressProvider(credentials);
      const pageId = await resolveElementorPageId(provider, pageValue.page as string);
      const bridge = createElementorBridge(provider);
      const patch = loadElementorPatchFromFile(options.patch);
      const preview = await bridge.preview(pageId, patch);
      if (options.json) {
        process.stdout.write(JSON.stringify(preview, null, 2) + "\n");
        if (!preview.compatible) process.exitCode = 1;
        return;
      }
      const page = await provider.getPage(pageId);
      // WordPress REST returns title as { rendered: "..." } even though the
      // shared WordPressPage type declares string. Normalize at the display
      // boundary so the preview never prints "[object Object]".
      const rawTitle = page?.title as unknown;
      const pageTitle =
        typeof rawTitle === "string"
          ? rawTitle
          : typeof (rawTitle as { rendered?: unknown } | undefined)?.rendered === "string"
            ? ((rawTitle as { rendered: string }).rendered)
            : `Page ${pageId}`;
      process.stdout.write(renderElementorPreview(pageTitle, preview));
      if (!preview.compatible) process.exitCode = 1;
    } catch (error) {
      fail(error);
    }
  });

elementorCommand
  .command("validate")
  .argument("[site]", "WordPress site URL (or set FORGE_WP_SITE_URL)")
  .argument("[username]", "WordPress username (or set FORGE_WP_USERNAME)")
  .argument("[password]", "WordPress application password (or set FORGE_WP_APPLICATION_PASSWORD)")
  .argument("[page]", "Page ID or URL")
  .option("--patch <file>", "Patch JSON file")
  .option("--json", "Output result as JSON")
  .description("Validate a patch: target resolution, compatibility, mutation validity — SAFE, zero remote writes")
  .action(async (site: string | undefined, username: string | undefined, password: string | undefined, pageArg: string | undefined, options: { patch?: string; json?: boolean }) => {
    try {
      if (!options.patch) throw new Error("--patch <file> is required");
      const { page: pageValue } = normalizeElementorArgs({ site, username, password, page: pageArg });
      const credentials = resolveElementorCredentials(pageValue.site, pageValue.username, pageValue.password);
      const provider = createWordPressProvider(credentials);
      const pageId = await resolveElementorPageId(provider, pageValue.page as string);
      const bridge = createElementorBridge(provider);
      const patch = loadElementorPatchFromFile(options.patch);
      const result = await bridge.validate(pageId, patch);
      if (options.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        if (!result.compatible) process.exitCode = 1;
        return;
      }
      process.stdout.write(renderElementorValidation(result));
      if (!result.compatible) process.exitCode = 1;
    } catch (error) {
      fail(error);
    }
  });

elementorCommand
  .command("apply")
  .argument("[site]", "WordPress site URL (or set FORGE_WP_SITE_URL)")
  .argument("[username]", "WordPress username (or set FORGE_WP_USERNAME)")
  .argument("[password]", "WordPress application password (or set FORGE_WP_APPLICATION_PASSWORD)")
  .argument("[page]", "Page ID or URL")
  .option("--patch <file>", "Patch JSON file")
  .option("--apply", "Apply for real (MUTATES the remote site; default is dry-run with zero writes)")
  .option("--output <file>", "Write rollback payload to this file")
  .option("--json", "Output result as JSON")
  .description("Apply a patch to an Elementor document (dry-run by default; real writes are re-read and verified structurally)")
  .action(async (site: string | undefined, username: string | undefined, password: string | undefined, pageArg: string | undefined, options: { patch?: string; apply?: boolean; output?: string; json?: boolean }) => {
    try {
      if (!options.patch) throw new Error("--patch <file> is required");
      const { page: pageValue } = normalizeElementorArgs({ site, username, password, page: pageArg });
      const credentials = resolveElementorCredentials(pageValue.site, pageValue.username, pageValue.password);
      const provider = createWordPressProvider(credentials);
      const pageId = await resolveElementorPageId(provider, pageValue.page as string);
      const bridge = createElementorBridge(provider);
      const patch = loadElementorPatchFromFile(options.patch);
      const dryRun = !options.apply;
      if (dryRun) {
        process.stdout.write("Dry-run mode: no remote mutation. Pass --apply to write for real.\n");
      }
      const result = await bridge.apply(pageId, patch, { dryRun });
      if (options.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        // --output is a file side effect, not human output: honor it in JSON
        // mode too (without appending a message that would corrupt stdout).
        if (options.output && result.rollbackPayload) {
          writeFileSync(options.output, JSON.stringify(result.rollbackPayload, null, 2) + "\n");
        }
      } else {
        process.stdout.write(result.message + "\n");
        if (result.mutation) {
          for (const diff of result.mutation.diffs) {
            process.stdout.write(`  ${diff.elementId}.${diff.settingsKey}: ${JSON.stringify(diff.before)} → ${JSON.stringify(diff.after)}\n`);
          }
        }
        if (result.fingerprintBefore && result.fingerprintAfter) {
          process.stdout.write(`  fingerprint: ${result.fingerprintBefore} → ${result.fingerprintAfter}\n`);
        }
        if (result.verification && !result.verification.ok) {
          process.stdout.write("Verification errors:\n");
          for (const error of result.verification.errors) process.stdout.write(`  - ${error}\n`);
        }
        if (result.rollbackPayload) writeRollbackOutput(options.output, result.rollbackPayload);
      }
      // Observability through the existing memory system (no secrets stored).
      await recordElementorWriteEvent(
        createElementorWriteMemoryEvent({
          result: result as ElementorWriteResult,
          provider: provider.id,
          patchIds: patch.id ? [patch.id] : [],
          siteUrl: credentials.siteUrl,
        }),
      );
      // Use exitCode rather than an abrupt process.exit(): a dry-run exits
      // non-zero by contract, but the HTTP keep-alive sockets and memory
      // handles must be allowed to close or Node 24 can abort while tearing
      // down a still-open handle (observed as a libuv assertion).
      if (!result.applied) process.exitCode = 1;
    } catch (error) {
      fail(error);
    }
  });

elementorCommand
  .command("rollback")
  .argument("[site]", "WordPress site URL (or set FORGE_WP_SITE_URL)")
  .argument("[username]", "WordPress username (or set FORGE_WP_USERNAME)")
  .argument("[password]", "WordPress application password (or set FORGE_WP_APPLICATION_PASSWORD)")
  .argument("[page]", "Page ID or URL")
  .option("--original <file>", "Rollback payload JSON file (from apply --output)")
  .option("--force", "Overwrite even when the remote document changed since the original apply (default: refuse + explain)")
  .option("--json", "Output result as JSON")
  .description("Restore the exact original Elementor document from a rollback payload (refuses to overwrite newer changes by default)")
  .action(async (site: string | undefined, username: string | undefined, password: string | undefined, pageArg: string | undefined, options: { original?: string; force?: boolean; json?: boolean }) => {
    try {
      if (!options.original) throw new Error("--original <file> is required (the rollback payload from apply --output)");
      const { page: pageValue } = normalizeElementorArgs({ site, username, password, page: pageArg });
      const credentials = resolveElementorCredentials(pageValue.site, pageValue.username, pageValue.password);
      const provider = createWordPressProvider(credentials);
      const bridge = createElementorBridge(provider);
      const payload = JSON.parse(readFileSync(options.original, "utf8")) as ElementorRollbackPayload;
      if (pageValue.page !== undefined) {
        const pageId = await resolveElementorPageId(provider, pageValue.page);
        if (String(payload.postId) !== String(pageId)) {
          throw new Error(`Rollback payload targets post ${payload.postId}, not ${pageId}. Refusing to restore the wrong page.`);
        }
      }
      const result = await bridge.rollback(payload, { force: options.force });
      if (options.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      } else {
        process.stdout.write(result.message + "\n");
        if (result.finalFingerprint) process.stdout.write(`Final fingerprint: ${result.finalFingerprint}\n`);
      }
      // Observability through the existing memory system (no secrets stored).
      await recordElementorRollbackEvent(
        createElementorRollbackMemoryEvent({
          payload,
          result: result as ElementorRollbackResult,
          provider: provider.id,
          siteUrl: credentials.siteUrl,
        }),
      );
      if (!result.restored) process.exitCode = 1;
    } catch (error) {
      fail(error);
    }
  });

function renderElementorPreview(title: string, preview: ElementorPreviewResult): string {
  if (!preview.resolution.ok) {
    return `Page: ${title}\nTarget: ${preview.message}${preview.errorCode ? ` [${preview.errorCode}]` : ""}\n`;
  }
  const lines: string[] = [`Page: ${title}`];
  lines.push(`Affected widgets: ${preview.targets.length}`);
  for (const target of preview.targets) {
    lines.push(`Section: ${target.elementPath.join(" → ")}`);
    lines.push(`Element: ${target.widgetType ?? target.elType} widget`);
    lines.push(`Elementor ID: ${target.elementId}`);
    lines.push(`Widget: ${target.widgetType ?? "n/a"}`);
    lines.push(`Control: ${target.settingsKey}${target.richText ? " (rich text)" : ""}`);
    lines.push(`Current: ${JSON.stringify(target.currentValue)}`);
    lines.push(`Proposed: ${JSON.stringify(target.proposedValue)}`);
    if (preview.mutation) {
      for (const diff of preview.mutation.diffs) {
        if (diff.elementId === target.elementId && diff.settingsKey === target.settingsKey) {
          lines.push(`Diff: ${JSON.stringify(diff.before)} → ${JSON.stringify(diff.after)}`);
        }
      }
    }
  }
  if (preview.problems.length > 0) {
    lines.push("Validation problems:");
    for (const problem of preview.problems) lines.push(`  - ${problem}`);
  }
  lines.push(`Impact: ${preview.compatible ? "safe deterministic text patch (preview only — nothing was written)" : "INCOMPATIBLE — review required"}`);
  return lines.join("\n") + "\n";
}

function renderElementorValidation(result: ElementorPreviewResult): string {
  if (!result.resolution.ok) {
    return `Invalid${result.errorCode ? ` [${result.errorCode}]` : ""}: ${result.message}\n`;
  }
  const lines = [`Valid: ${result.compatible ? "patch resolves and is compatible" : "patch resolves but has compatibility problems"}`];
  lines.push(`Affected widgets: ${result.targets.map((target) => `${target.elementId} (${target.widgetType ?? target.elType})`).join(", ") || "none"}`);
  for (const problem of result.problems) lines.push(`  - ${problem}`);
  return lines.join("\n") + "\n";
}

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
  .option("--from <file>", "Rollback artifact written by optimize")
  .option("--url <url>", "Site URL (defaults to FORGE_WP_SITE_URL)")
  .option("--username <user>", "WordPress username (defaults to FORGE_WP_USERNAME)")
  .option("--app-password <password>", "WordPress application password (defaults to FORGE_WP_APPLICATION_PASSWORD)")
  .option("--resource-type <type>", "Resource type", "page")
  .option("--resource-id <id>", "Resource ID", "1")
  .option("--revision-id <id>", "Revision ID")
  .option("--field <field>", "Field name", "title")
  .option("--value <value>", "Original value", "Rolled back value")
  .option("--json", "Output result as JSON")
  .action(async (options: { project?: string; from?: string; url?: string; username?: string; appPassword?: string; resourceType?: string; resourceId?: string; revisionId?: string; field?: string; value?: string; json?: boolean }) => {
    try {
      const provider = createWordPressProvider(
        resolveWordPressConnection({
          url: options.url,
          username: options.username,
          appPassword: options.appPassword,
        }),
      );

      if (options.from) {
        const artifact = JSON.parse(readFileSync(options.from, "utf8")) as {
          url?: string;
          pageUrl?: string;
          project?: string;
          dryRun?: boolean;
          execution?: { rollbackPlan?: unknown[] };
          rollbackPlan?: unknown[];
        };
        if (artifact.dryRun === true) {
          throw new Error(
            `Artifact ${options.from} is a dry-run preview and contains no original values to restore.`,
          );
        }
        const operations = artifact.execution?.rollbackPlan ?? artifact.rollbackPlan ?? [];
        if (!Array.isArray(operations) || operations.length === 0) {
          throw new Error("Rollback artifact contains no rollback operations.");
        }

        // Undo in reverse order (last write first) so later operations cannot
        // overwrite the restored state of earlier ones.
        const result = await rollbackExecution(
          {
            url: artifact.pageUrl ?? artifact.url ?? artifact.project ?? "default",
            executedAt: new Date().toISOString(),
            completedActions: [],
            failedActions: [],
            skippedActions: [],
            rollbackPlan: [...operations].reverse() as RollbackOperation[],
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
        process.stdout.write(`Rollback from ${options.from}: ${result.rollbackPlan.length} operation(s) restored\n`);
        return;
      }

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
    } catch (error) {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      process.exitCode = 1;
    }
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
        process.exitCode = 1;
        return;
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
      process.exitCode = 1;
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
      process.exitCode = 1;
      return;
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
  const siteUrl = resolveHomepageUrl();
  const snapshot = await readWebsite(siteUrl);
  const $ = (await import("cheerio")).load(snapshot.rawHtml || "");
  return { resolved, siteUrl, snapshot, $ };
}

// Sprint 24: Site-level content intelligence — crawl a bounded set of internal
// pages and build a Universal Page Model for each (dom-engine is the canonical
// parser). Site Content Intelligence consumes these snapshots + structures.
async function loadSiteContext(project: string, options: { depth?: number; limit?: number } = {}) {
  const { resolved, knowledge, memory } = await loadProjectContext(project, "content:site");
  const siteUrl = resolveHomepageUrl();
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
  const siteUrl = resolveHomepageUrl();
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
  .option("--url <url>", "Site URL (defaults to FORGE_WP_SITE_URL)")
  .option("--username <user>", "WordPress username (defaults to FORGE_WP_USERNAME)")
  .option("--app-password <password>", "WordPress application password (defaults to FORGE_WP_APPLICATION_PASSWORD)")
  .option("--apply", "Write changes (default is dry-run)")
  .option("--dry-run", "Force dry-run even with --apply")
  .option("--json", "Output result as JSON")
  .action(async (sessionId: string, options: { project?: string; url?: string; username?: string; appPassword?: string; apply?: boolean; dryRun?: boolean; json?: boolean }) => {
    const rootDir = resolveRootDir();
    const session = await loadReviewSession(rootDir, options.project ?? "default", sessionId);
    if (!session) {
      process.stderr.write(`Review session not found: ${sessionId}\n`);
      return;
    }
    // DECISION 2: verify completion + policy before handing off to Execution Engine.
    if (session.status !== "completed") {
      process.stderr.write(`Cannot apply: review session ${sessionId} is not completed (status: ${session.status}). Use "forge review complete ${sessionId}".\n`);
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
    const approved = session.items.filter((item) => item.decision === "APPROVE" || item.decision === "EDIT");
    const connection = resolveWordPressConnection({
      url: options.url,
      username: options.username,
      appPassword: options.appPassword,
    });
    const siteUrl = connection.siteUrl;
    const provider = createWordPressProvider(connection);
    const executionPlan = buildExecutionPlanFromReview(session, {
      url: siteUrl,
      pageId: inferPageIdFromSession(session),
    });
    if (executionPlan.actions.length === 0) {
      process.stderr.write("No executable actions: session has no elementor or Rank Math targets.\n");
      return;
    }
    const dryRun = !options.apply || options.dryRun === true;
    const result = await executeExecution(executionPlan, provider, {
      dryRun,
      stopOnBlocked: true,
      domEngine: {
        resolve: async (rawContent, patch) => {
          const applied = await applyContentPatch(rawContent, patch as never);
          if (!applied.success) throw new Error(applied.warnings.join("; ") || "patch resolution failed");
          return applied.patchedContent;
        },
      },
      fetchResource: async (resourceType, resourceId) => {
        if (resourceType === "elementor-document") {
          return (await provider.readElementorDocument(resourceId)).data;
        }
        throw new Error(`No raw content resolver for resource type "${resourceType}".`);
      },
    });

    const dir = `projects/${options.project ?? "default"}/execution`;
    mkdirSync(dir, { recursive: true });
    const rollbackFile = `${dir}/${Date.now()}-rollback.json`;
    writeFileSync(
      rollbackFile,
      JSON.stringify(
        {
          project: options.project ?? "default",
          siteUrl,
          sessionId,
          dryRun,
          executedAt: new Date().toISOString(),
          execution: result,
        },
        null,
        2,
      ),
      "utf8",
    );

    if (options.json) {
      process.stdout.write(JSON.stringify({ result, rollbackFile }, null, 2) + "\n");
      return;
    }
    process.stdout.write(
      `Applied review session ${sessionId} (${approved.length} approved items) ${dryRun ? "dry-run" : "for real"}.\n`,
    );
    process.stdout.write(`Rollback artifact: ${rollbackFile}\n`);
  });

reviewCommand
  .command("complete")
  .description("Mark a review session complete so it can be applied")
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
    const pending = session.items.filter((item) => item.decision === undefined);
    if (pending.length > 0) {
      process.stderr.write(`Cannot complete: ${pending.length} item(s) still undecided. Decide them first.\n`);
      return;
    }
    const completed = completeSession(session);
    await saveReviewSession(rootDir, completed);
    if (options.json) {
      process.stdout.write(JSON.stringify(completed, null, 2) + "\n");
      return;
    }
    process.stdout.write(`Review session ${sessionId} marked completed.\n`);
  });

reviewCommand
  .command("rollback")
  .description("Roll back a previously applied review session using its persisted execution artifact")
  .argument("<sessionId>", "Review session ID")
  .option("--project <project>", "Project ID", "default")
  .option("--from <file>", "Explicit execution artifact (defaults to the latest apply for this session)")
  .option("--url <url>", "Site URL (defaults to FORGE_WP_SITE_URL)")
  .option("--username <user>", "WordPress username (defaults to FORGE_WP_USERNAME)")
  .option("--app-password <password>", "WordPress application password (defaults to FORGE_WP_APPLICATION_PASSWORD)")
  .option("--json", "Output result as JSON")
  .action(async (sessionId: string, options: { project?: string; from?: string; url?: string; username?: string; appPassword?: string; json?: boolean }) => {
    try {
      const project = options.project ?? "default";
      const file = options.from ?? findRollbackArtifact(project, sessionId);
      if (!file) {
        throw new Error(
          `No applied execution artifact found for review session ${sessionId}. Pass --from <file> or run \"forge review apply ... --apply\" first.`,
        );
      }

      const artifact = JSON.parse(readFileSync(file, "utf8")) as {
        dryRun?: boolean;
        execution?: { rollbackPlan?: RollbackOperation[] };
      };
      if (artifact.dryRun === true) {
        throw new Error(`Artifact ${file} is a dry-run preview and contains no original values to restore.`);
      }
      const operations = artifact.execution?.rollbackPlan ?? [];
      if (operations.length === 0) {
        throw new Error(`Artifact ${file} contains no rollback operations.`);
      }

      const provider = createWordPressProvider(
        resolveWordPressConnection({
          url: options.url,
          username: options.username,
          appPassword: options.appPassword,
        }),
      );

      const result = await rollbackExecution(
        {
          url: options.url ?? project,
          executedAt: new Date().toISOString(),
          completedActions: [],
          failedActions: [],
          skippedActions: [],
          rollbackPlan: [...operations].reverse(),
          executionTime: "0ms",
          rollbackGroups: [],
          rollbackRequired: true,
        },
        provider,
      );

      if (options.json) {
        process.stdout.write(JSON.stringify({ file, result }, null, 2) + "\n");
        return;
      }
      process.stdout.write(
        `Rolled back review session ${sessionId} from ${file}: ${result.rollbackPlan.length} operation(s) restored.\n`,
      );
    } catch (error) {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      process.exitCode = 1;
    }
  });

function findRollbackArtifact(project: string, sessionId: string): string | undefined {
  const dir = `projects/${project}/execution`;
  if (!existsSync(dir)) return undefined;
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .reverse();

  for (const name of files) {
    const file = `${dir}/${name}`;
    try {
      const artifact = JSON.parse(readFileSync(file, "utf8")) as {
        sessionId?: string;
        dryRun?: boolean;
        execution?: { rollbackPlan?: unknown[] };
      };
      if (
        artifact.sessionId === sessionId &&
        artifact.dryRun !== true &&
        (artifact.execution?.rollbackPlan?.length ?? 0) > 0
      ) {
        return file;
      }
    } catch {
      // Ignore unreadable artifacts and keep looking.
    }
  }
  return undefined;
}

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
  return createReviewSession({ projectId: project, createdBy: "cli", patches, policy: REVIEW_POLICIES[policyName] });
}

function inferPageIdFromSession(session: ReviewSession): number | undefined {
  for (const item of session.items) {
    const target = item.patch.target;
    if (!target) continue;
    if ((target.format === "elementor" || target.format === "rank-math") && typeof target.pageId === "number") {
      return target.pageId;
    }
  }
  return undefined;
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
  .description("Show model/capability information for a provider")
  .argument("[provider]", "Provider ID (default: configured default)")
  .option("--provider <provider>", "Provider ID (alias for [provider])")
  .option("--json", "Output as JSON")
  .action(async (providerId: string | undefined, options: { provider?: string; json?: boolean }) => {
    let resolvedProvider = providerId ?? options.provider ?? "unknown";
    try {
      resolvedProvider = resolveAiProviderId(providerId, options.provider);
      const provider = ProviderFactory.create({ provider: resolvedProvider as never });
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
        process.stdout.write(JSON.stringify({ provider: resolvedProvider, ...matrix }, null, 2) + "\n");
        return;
      }
      process.stdout.write(`Provider: ${resolvedProvider}\n`);
      process.stdout.write(`Streaming: ${matrix.supportsStreaming}\n`);
      process.stdout.write(`JSON mode: ${matrix.supportsJSON}\n`);
      process.stdout.write(`Vision: ${matrix.supportsVision}\n`);
      process.stdout.write(`Max tokens: ${matrix.maxOutputTokens}\n`);
    } catch (error) {
      failAiCommand(resolvedProvider, error, options.json);
    }
  });

aiCommand
  .command("test")
  .description("Test an AI provider connection")
  .argument("[provider]", "Provider ID (default: configured default)")
  .option("--provider <provider>", "Provider ID (alias for [provider])")
  .option("--model <model>", "Model name")
  .option("--json", "Output as JSON")
  .action(async (providerId: string | undefined, options: { provider?: string; model?: string; json?: boolean }) => {
    let resolvedProvider = providerId ?? options.provider ?? "unknown";
    try {
      resolvedProvider = resolveAiProviderId(providerId, options.provider);
      const provider = ProviderFactory.create({ provider: resolvedProvider as never, model: options.model });
      const engine = new AIEngine(provider);
      const healthy = await engine.health();
      if (options.json) {
        process.stdout.write(
          JSON.stringify(
            healthy
              ? { provider: resolvedProvider, healthy }
              : {
                  provider: resolvedProvider,
                  healthy,
                  error: {
                    code: "AI_PROVIDER_UNAVAILABLE",
                    message: aiProviderSetupMessage(
                      resolvedProvider,
                      new ProviderUnavailableError(resolvedProvider),
                    ),
                  },
                },
            null,
            2,
          ) + "\n",
        );
        if (!healthy) process.exitCode = 1;
        return;
      }
      if (!healthy) {
        process.stderr.write(
          `Error: ${aiProviderSetupMessage(resolvedProvider, new ProviderUnavailableError(resolvedProvider))}\n`,
        );
        process.exitCode = 1;
        return;
      }
      process.stdout.write(`Provider ${resolvedProvider}: ✓ healthy\n`);
    } catch (error) {
      failAiCommand(resolvedProvider, error, options.json);
    }
  });

aiCommand
  .command("benchmark")
  .description("Run a quick benchmark against a provider")
  .argument("[provider]", "Provider ID (default: configured default)")
  .option("--provider <provider>", "Provider ID (alias for [provider])")
  .option("--model <model>", "Model name")
  .option("--json", "Output as JSON")
  .action(async (providerId: string | undefined, options: { provider?: string; model?: string; json?: boolean }) => {
    let resolvedProvider = providerId ?? options.provider ?? "unknown";
    try {
      resolvedProvider = resolveAiProviderId(providerId, options.provider);
      const provider = ProviderFactory.create({ provider: resolvedProvider as never, model: options.model });
      const engine = new AIEngine(provider);
      const start = Date.now();
      const healthy = await engine.health();
      const latency = Date.now() - start;
      if (options.json) {
        process.stdout.write(
          JSON.stringify(
            healthy
              ? { provider: resolvedProvider, healthy, latencyMs: latency }
              : {
                  provider: resolvedProvider,
                  healthy,
                  latencyMs: latency,
                  error: {
                    code: "AI_PROVIDER_UNAVAILABLE",
                    message: aiProviderSetupMessage(
                      resolvedProvider,
                      new ProviderUnavailableError(resolvedProvider),
                    ),
                  },
                },
            null,
            2,
          ) + "\n",
        );
        if (!healthy) process.exitCode = 1;
        return;
      }
      process.stdout.write(`Provider ${resolvedProvider}: ${healthy ? "✓" : "✗"} (${latency}ms)\n`);
      if (!healthy) process.exitCode = 1;
    } catch (error) {
      failAiCommand(resolvedProvider, error, options.json);
    }
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
  .option("--url <url>", "Site URL (defaults to FORGE_WP_SITE_URL)")
  .option("--page <id>", "WordPress page/post ID to optimize")
  .option("--username <user>", "WordPress username (defaults to FORGE_WP_USERNAME)")
  .option("--app-password <password>", "WordPress application password (defaults to FORGE_WP_APPLICATION_PASSWORD)")
  .option("--brand <name>", "Brand name for generation context")
  .option("--industry <industry>", "Industry for generation context")
  .option("--keyword <term>", "Primary keyword for this page")
  .option("--audience <audience>", "Primary audience")
  .option("--policy <name>", "Review policy: strict, balanced, automatic, enterprise", "balanced")
  .option("--provider <provider>", "AI provider (openai, anthropic, gemini, openrouter, zai, ollama)")
  .option("--model <model>", "Model name")
  .option("--apply", "Approve reviewed items and write them to the site")
  .option("--dry-run", "Force simulation even with --apply")
  .option("--rollback-file <path>", "Where to write the rollback artifact")
  .option("--json", "Output result as JSON")
  .action(async (
    projectArg: string,
    options: {
      workflow?: string;
      url?: string;
      page?: string;
      username?: string;
      appPassword?: string;
      brand?: string;
      industry?: string;
      keyword?: string;
      audience?: string;
      policy?: string;
      provider?: string;
      model?: string;
      apply?: boolean;
      dryRun?: boolean;
      rollbackFile?: string;
      json?: boolean;
    },
  ) => {
    try {
      const project = projectArg ?? "default";
      const pageId = Number(options.page);
      if (!Number.isInteger(pageId) || pageId <= 0) {
        throw new Error("A WordPress page id is required: pass --page <id>.");
      }
      const connection = resolveWordPressConnection({
        url: options.url,
        username: options.username,
        appPassword: options.appPassword,
      });
      const { siteUrl } = connection;

      const apply = options.apply === true;
      const dryRun = !apply || options.dryRun === true;
      const pageUrl = pageUrlFor(siteUrl, pageId);

      const provider = createWordPressProvider(connection);

      // 1) Read the real rendered page (public HTML) and the real Elementor
      //    source document. Section targets come from the document, not from
      //    heuristics, so every generated patch has a writable destination.
      const snapshot = await readWebsite(pageUrl);
      const bridge = createElementorBridge(provider);
      const inspect = await bridge.inspect(pageId, snapshot.rawHtml);
      const derived = deriveElementorSections(inspect);

      // 2) Read current Rank Math metadata (when the companion endpoint is
      //    installed). This makes metadata patches skip no-op writes.
      let seoMeta: { title?: string; description?: string } = {};
      try {
        const current = await provider.readSeoMeta(pageId);
        seoMeta = {
          title: current.fields.title ?? undefined,
          description: current.fields.description ?? undefined,
        };
      } catch (error) {
        process.stderr.write(
          `Warning: Rank Math metadata could not be read (${error instanceof Error ? error.message : "unknown error"}). Metadata writes will be skipped.\n`,
        );
      }

      // 3) Build real brand/knowledge context. CLI flags override stored
      //    knowledge; nothing is invented by the workflow.
      const rootDir = "projects";
      const baseKnowledge = await loadKnowledge(rootDir, project);
      const knowledge = updateKnowledgeGraph(baseKnowledge, {
        brand: options.brand ?? baseKnowledge.brand,
        industry: options.industry ?? baseKnowledge.industry,
        targetAudience: options.audience ?? baseKnowledge.targetAudience,
        primaryKeywords: options.keyword ? [options.keyword] : baseKnowledge.primaryKeywords,
      });
      const memory = await loadMemory(rootDir, project);
      const memorySummary = memory.summarize(project);
      const profile = createProjectProfile(knowledge, memorySummary);
      const brand = buildBrandProfile({ knowledge, memory: memorySummary, projectId: project });

      // 4) Configure AI only when a key actually exists. Without one, the run
      //    is metadata-only — never fake section content.
      const explicitProvider = options.provider;
      const providerId = explicitProvider ?? detectConfiguredAiProvider();
      const hasAi = providerId ? aiProviderConfigured(providerId) : false;
      if (explicitProvider && !hasAi) {
        throw new Error(
          `AI provider "${explicitProvider}" is selected but no credentials are configured. Set the provider API key or omit --provider to run metadata-only.`,
        );
      }

      let aiEngine: AIEngine | undefined;
      let registry: PromptRegistry | undefined;
      if (hasAi && providerId) {
        aiEngine = new AIEngine(
          ProviderFactory.create({ provider: providerId as never, model: options.model }),
        );
        registry = new PromptRegistry();
        registerContentPrompts(registry);
      } else {
        process.stderr.write(
          "No AI provider credentials found: running deterministic metadata-only optimization (no section copy is generated).\n",
        );
      }

      const workflowId = options.workflow ?? "homepage-optimization";
      const orchestrator = new OptimizationOrchestrator({
        workflowId,
        project,
        provider: providerId ?? "",
        model: options.model,
        dryRun,
        apply,
        configuration: { model: options.model },
        initialContext: {
          siteUrl,
          pageUrl,
          pageId,
          pageType: "page",
          target: {
            pageUrl,
            pageId,
            title: inspect.title,
            keyword: options.keyword ?? knowledge.primaryKeywords[0],
          },
          websiteSnapshot: snapshot,
          websiteSnapshots: [snapshot],
          universalPages: [buildUniversalPage(snapshot.rawHtml, pageUrl, inspect.title)],
          documentSections: derived.sections,
          sectionTargets: derived.targets,
          knowledge,
          memory: memorySummary,
          brandProfile: brand,
          seoMeta,
          aiProvider: providerId,
        },
      });

      orchestrator.registerEngine("site-intelligence", createSiteIntelligenceEngine());
      orchestrator.registerEngine("content-intelligence", createContentIntelligenceEngine());
      orchestrator.registerEngine(
        "content-generation",
        createContentGenerationEngine({
          engine: aiEngine,
          registry,
          knowledge,
          memory: memorySummary,
          profile,
          brand,
          skipAi: !hasAi,
        }),
      );
      orchestrator.registerEngine(
        "review",
        createReviewEngine({
          policy: (options.policy as ReviewPolicyName) ?? "balanced",
          createdBy: "cli:optimize",
          rootDir,
          autoApproveAll: apply,
          complete: apply,
        }),
      );
      orchestrator.registerEngine("composer", createComposerEngine());
      orchestrator.registerEngine(
        "execution",
        createExecutionEngine({
          provider,
          dryRun,
          domEngine: {
            resolve: async (rawContent, patch) => {
              const result = await applyContentPatch(rawContent, patch as never);
              if (!result.success) {
                const detail = result.warnings.length > 0 ? result.warnings.join("; ") : "patch resolution failed";
                throw new Error(detail);
              }
              return result.patchedContent;
            },
          },
          fetchResource: async (resourceType, resourceId) => {
            if (resourceType === "elementor-document") {
              const document = await provider.readElementorDocument(resourceId);
              return document.data;
            }
            throw new Error(`No raw content resolver for resource type "${resourceType}".`);
          },
        }),
      );

      const result = await orchestrator.run();
      const context = orchestrator.getContext();

      const reviewSession = context.reviewSession as ReviewSession | undefined;
      const executionResult = context.executionResult as
        | {
            completedActions: string[];
            failedActions: string[];
            skippedActions: string[];
            rollbackPlan: unknown[];
            errors?: Array<{ actionId: string; message: string }>;
          }
        | undefined;

      // 5) Persist the rollback artifact whenever anything was attempted, so a
      //    later `execution rollback --from` can restore the exact prior state.
      let rollbackFile: string | undefined;
      if (executionResult) {
        const dir = `projects/${project}/execution`;
        mkdirSync(dir, { recursive: true });
        rollbackFile =
          options.rollbackFile ?? `${dir}/${Date.now()}-rollback.json`;
        writeFileSync(
          rollbackFile,
          JSON.stringify(
            {
              project,
              siteUrl,
              pageUrl,
              pageId,
              workflow: workflowId,
              dryRun,
              executedAt: new Date().toISOString(),
              reviewSessionId: reviewSession?.sessionId,
              metadataProposal: context.metadataProposal,
              execution: executionResult,
            },
            null,
            2,
          ),
          "utf8",
        );
      }

      if (options.json) {
        process.stdout.write(
          JSON.stringify(
            {
              result,
              pageId,
              pageUrl,
              dryRun,
              hasAi,
              provider: providerId ?? null,
              reviewSession,
              execution: executionResult,
              metadataProposal: context.metadataProposal,
              pagePriorities: context.pagePriorities,
              internalLinkOpportunities: context.internalLinkOpportunities,
              rollbackFile,
            },
            null,
            2,
          ) + "\n",
        );
        return;
      }

      process.stdout.write(`Workflow: ${result.workflow}\n`);
      process.stdout.write(`State: ${result.state}\n`);
      process.stdout.write(`Target: page ${pageId} (${pageUrl})\n`);
      process.stdout.write(`Mode: ${dryRun ? "preview (no writes)" : "APPLY"}\n`);
      process.stdout.write(`Content: ${hasAi ? `AI (${providerId})` : "metadata-only"}\n`);
      process.stdout.write(`Duration: ${result.metrics.duration}ms\n`);

      if (reviewSession) {
        const approved = reviewSession.items.filter((item) => item.decision === "APPROVE").length;
        const pending = reviewSession.items.filter((item) => item.decision === undefined).length;
        process.stdout.write(
          `Review: ${reviewSession.sessionId} — ${reviewSession.items.length} item(s), ${approved} approved, ${pending} pending\n`,
        );
      }

      if (executionResult) {
        process.stdout.write(
          `Execution: ${executionResult.completedActions.length} completed, ${executionResult.failedActions.length} failed, ${executionResult.skippedActions.length} skipped\n`,
        );
        for (const failure of executionResult.errors ?? []) {
          process.stdout.write(`  FAILED ${failure.actionId}: ${failure.message}\n`);
        }
      }

      if (rollbackFile) process.stdout.write(`Rollback artifact: ${rollbackFile}\n`);
      if (result.error) process.stdout.write(`Error: ${result.error.message}\n`);
    } catch (error) {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      process.exitCode = 1;
    }
  });

function detectConfiguredAiProvider(): string | undefined {
  const candidates = ["openai", "anthropic", "gemini", "openrouter", "zai"] as const;
  return candidates.find((candidate) => aiProviderConfigured(candidate));
}

function aiProviderConfigured(providerId: string): boolean {
  switch (providerId) {
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "gemini":
      return Boolean(process.env.GEMINI_API_KEY);
    case "openrouter":
      return Boolean(process.env.OPENROUTER_API_KEY);
    case "zai":
      return Boolean(process.env.ZAI_API_KEY);
    case "ollama":
      return true;
    default:
      return false;
  }
}

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
      process.exitCode = 1;
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
