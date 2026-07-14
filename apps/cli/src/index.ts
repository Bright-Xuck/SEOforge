#!/usr/bin/env node

// @forge/cli
// Forge command-line interface.

import { Command } from "commander";
import { FORGE_NAME, FORGE_VERSION } from "@forge/shared";

const program = new Command();

program
  .name(FORGE_NAME.toLowerCase())
  .description(`${FORGE_NAME} CLI — AI Operating System for Websites`)
  .version(FORGE_VERSION);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
