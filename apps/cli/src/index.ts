#!/usr/bin/env node

// @forge/cli
// Forge command-line interface.

import { Command } from "commander";
import { FORGE_NAME, FORGE_VERSION } from "@forge/shared";
import { readWebsite } from "@forge/tools/website-reader";
import { analyzeHomepage } from "@forge/capabilities/homepage";
import { generateRecommendations } from "@forge/recommendation-engine";
import { generateExecutionPlan } from "@forge/action-engine";
import type { Action } from "@forge/action-engine";
import { WebsiteReadError } from "@forge/core";

const program = new Command();

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
      process.stdout.write("Reading...\n");
      const snapshot = await readWebsite(url);

      process.stdout.write("✓ Downloaded\n");
      process.stdout.write("✓ Parsed\n");
      process.stdout.write("✓ Snapshot Created\n\n");

      if (options.json) {
        // Omit rawHtml for security
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { rawHtml: _rawHtml, ...jsonSnapshot } = snapshot;
        process.stdout.write(JSON.stringify(jsonSnapshot, null, 2) + "\n");
        return;
      }

      process.stdout.write("Summary:\n");
      process.stdout.write(`  Title:        ${snapshot.pageTitle}\n`);
      process.stdout.write(`  Description:  ${snapshot.metaDescription}\n`);
      process.stdout.write(
        `  H1 Count:     ${snapshot.headings.filter((h) => h.level === 1).length}\n`,
      );
      process.stdout.write(`  Links:        ${snapshot.links.length}\n`);
      process.stdout.write(`  Images:       ${snapshot.images.length}\n`);
      process.stdout.write(`  Canonical:    ${snapshot.canonicalUrl || "(none)"}\n`);
      process.stdout.write(`  Response:     ${snapshot.statusCode}\n`);
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
      process.stdout.write("Reading...\n");
      const snapshot = await readWebsite(url);

      process.stdout.write("✓ Downloaded\n");
      process.stdout.write("✓ Parsed\n");
      process.stdout.write("Analyzing...\n");

      const report = analyzeHomepage(snapshot);

      process.stdout.write("✓ Analysis Complete\n\n");

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
      process.stdout.write("Reading...\n");
      const snapshot = await readWebsite(url);

      process.stdout.write("✓ Downloaded\n");
      process.stdout.write("✓ Parsed\n");
      process.stdout.write("Analyzing...\n");

      const report = analyzeHomepage(snapshot);

      process.stdout.write("Generating Recommendations...\n");

      const recReport = generateRecommendations(report);

      process.stdout.write("✓ Recommendations Generated\n\n");

      process.stdout.write("Priority Summary:\n");
      process.stdout.write(`  Critical: ${recReport.priorityBreakdown.critical}\n`);
      process.stdout.write(`  High:     ${recReport.priorityBreakdown.high}\n`);
      process.stdout.write(`  Medium:   ${recReport.priorityBreakdown.medium}\n`);
      process.stdout.write(`  Low:      ${recReport.priorityBreakdown.low}\n`);
      process.stdout.write(`\nEstimated Fix Time: ${recReport.estimatedEffort}\n\n`);

      if (options.json) {
        process.stdout.write(JSON.stringify(recReport, null, 2) + "\n");
        return;
      }

      for (const rec of recReport.recommendations) {
        process.stdout.write(`\n[${rec.priority.toUpperCase()}] ${rec.title}\n`);
        process.stdout.write(`  ${rec.description}\n`);
        process.stdout.write(`  Time: ${rec.estimatedTime} | Impact: ${rec.expectedImpact}\n`);
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
  .command("plan")
  .argument("<url>", "Website URL to generate execution plan for")
  .option("--json", "Output execution plan as JSON")
  .description("Generate execution plan from website analysis")
  .action(async (url: string, options: { json?: boolean }) => {
    try {
      process.stdout.write("Reading...\n");
      const snapshot = await readWebsite(url);

      process.stdout.write("✓ Downloaded\n");
      process.stdout.write("✓ Parsed\n");
      process.stdout.write("Analyzing...\n");

      const report = analyzeHomepage(snapshot);

      process.stdout.write("Generating Recommendations...\n");
      const recReport = generateRecommendations(report);

      process.stdout.write("Generating Execution Plan...\n");
      const plan = generateExecutionPlan(recReport);

      process.stdout.write("✓ Execution Plan Generated\n\n");

      process.stdout.write("Risk Summary:\n");
      process.stdout.write(`  Safe:     ${plan.riskSummary.safe}\n`);
      process.stdout.write(`  Moderate: ${plan.riskSummary.moderate}\n`);
      process.stdout.write(`  High:     ${plan.riskSummary.high}\n`);
      process.stdout.write(`  Critical: ${plan.riskSummary.critical}\n\n`);

      process.stdout.write(`Actions: ${plan.summary.total}\n`);
      process.stdout.write(`  Automatable:     ${plan.summary.automatable}\n`);
      process.stdout.write(`  Requires Approval: ${plan.summary.requiresApproval}\n`);
      process.stdout.write(`\nEstimated Duration: ${plan.estimatedDuration}\n\n`);

      if (options.json) {
        process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
        return;
      }

      if (plan.approvalQueue.length > 0) {
        process.stdout.write("Actions Requiring Approval:\n");
        for (const actionId of plan.approvalQueue) {
          const action = plan.actions.find((a: Action) => a.id === actionId);
          if (action) {
            process.stdout.write(`\n[${action.risk.toUpperCase()}] ${action.title}\n`);
            process.stdout.write(`  ${action.description}\n`);
          }
        }
      }
    } catch (error) {
      const wre = error instanceof WebsiteReadError ? error : null;
      process.stderr.write(
        `Error: ${wre?.kind === "invalid-url" ? "Invalid URL" : error instanceof Error ? error.message : "Unknown error"}\n`,
      );
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}