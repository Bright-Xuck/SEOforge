#!/usr/bin/env node

// @forge/cli
// Forge command-line interface.

import { Command } from "commander";
import { FORGE_NAME, FORGE_VERSION } from "@forge/shared";
import { createWordPressProvider, WORDPRESS_PROVIDER_METADATA } from "@forge/providers-wordpress";
import { WebsiteReadError } from "@forge/core";
import { loadKnowledge, createProjectProfile, detectChanges } from "@forge/knowledge-engine";
import { loadMemory } from "@forge/memory-engine";
import { resolveProject } from "@forge/project-resolver";
import { ContextBuilder } from "@forge/context-builder";
import { AIEngine, OpenAIProvider, AnthropicProvider, GeminiProvider, OpenRouterProvider, OllamaProvider } from "@forge/ai-engine";
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

const program = new Command();
const skillRegistry = new SkillRegistry();
const contextBuilder = new ContextBuilder();

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
]) {
  skillRegistry.register(skill);
}

function createProvider(providerId?: string): AIEngine {
  const provider =
    providerId === "anthropic"
      ? AnthropicProvider
      : providerId === "gemini"
        ? GeminiProvider
        : providerId === "openrouter"
          ? OpenRouterProvider
          : providerId === "ollama"
            ? OllamaProvider
            : OpenAIProvider;
  return new AIEngine(provider);
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
program
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
          provider: options.provider,
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

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
