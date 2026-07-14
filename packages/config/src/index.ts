// @forge/config
// Configuration loading, environment validation, and feature flags.
// No business logic.

import process from "node:process";
import { ForgeError } from "@forge/core";
import { FORGE_NAME } from "@forge/shared";

export type { ForgeError };

/**
 * Runtime configuration for Forge.
 */
export interface ForgeConfig {
  /** Log level. Default: "info" */
  readonly logLevel: string;
  /** Whether timestamps are enabled in logs. Default: true */
  readonly logTimestamps: boolean;
  /** Log output target. Default: "stdout" */
  readonly logOutput: "stdout" | "stderr";
}

/**
 * Read configuration from environment variables.
 */
export function loadConfig(): ForgeConfig {
  return {
    logLevel: env("FORGE_LOG_LEVEL", "info"),
    logTimestamps: env("FORGE_LOG_TIMESTAMPS", "true") === "true",
    logOutput: parseLogOutput(env("FORGE_LOG_OUTPUT", "stdout")),
  };
}

/**
 * Reads an environment variable with an optional default.
 */
function env(name: string, defaultValue?: string): string {
  const value = process.env[name];

  if (value === undefined || value === "") {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new ForgeError(
      "CONFIG_MISSING",
      `${FORGE_NAME} configuration error: ${name} is required but was not set.`,
    );
  }

  return value;
}

/**
 * Parses the log output setting with validation.
 */
function parseLogOutput(value: string): "stdout" | "stderr" {
  if (value === "stdout" || value === "stderr") {
    return value;
  }

  throw new ForgeError(
    "CONFIG_INVALID",
    `Invalid FORGE_LOG_OUTPUT value "${value}". Must be "stdout" or "stderr".`,
  );
}
