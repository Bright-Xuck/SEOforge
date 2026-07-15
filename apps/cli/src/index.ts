#!/usr/bin/env node

// @forge/cli
// Forge command-line interface.

import { Command } from "commander";
import { FORGE_NAME, FORGE_VERSION } from "@forge/shared";
import { readWebsite } from "@forge/tools/website-reader";
import { WebsiteReadError } from "@forge/core";

const program = new Command();

program
  .name(FORGE_NAME.toLowerCase())
  .description(`${FORGE_NAME} CLI — AI Operating System for Websites`)
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
        `  H1 Count:     ${snapshot.headings.filter((h: { level: number }) => h.level === 1).length}\n`,
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

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
