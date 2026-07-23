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
 * AI provider configuration loaded from environment variables.
 */
export interface AIProviderConfig {
  readonly openaiApiKey?: string;
  readonly anthropicApiKey?: string;
  readonly geminiApiKey?: string;
  readonly openrouterApiKey?: string;
  readonly ollamaBaseUrl: string;
  readonly ollamaModel: string;
  readonly defaultProvider: string;
  readonly defaultModel: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly retryDelay: number;
}

/**
 * Load AI provider configuration from environment variables.
 */
export function loadAIProviderConfig(): AIProviderConfig {
  return {
    openaiApiKey: envOptional("OPENAI_API_KEY"),
    anthropicApiKey: envOptional("ANTHROPIC_API_KEY"),
    geminiApiKey: envOptional("GEMINI_API_KEY"),
    openrouterApiKey: envOptional("OPENROUTER_API_KEY"),
    ollamaBaseUrl: env("OLLAMA_BASE_URL", "http://localhost:11434"),
    ollamaModel: env("OLLAMA_MODEL", "llama3"),
    defaultProvider: env("DEFAULT_PROVIDER", "ollama"),
    defaultModel: env("DEFAULT_MODEL", "llama3"),
    temperature: parseFloat(env("TEMPERATURE", "0.7")),
    maxTokens: parseInt(env("MAX_TOKENS", "4096"), 10),
    timeout: parseInt(env("TIMEOUT", "30000"), 10),
    maxRetries: parseInt(env("MAX_RETRIES", "3"), 10),
    retryDelay: parseInt(env("RETRY_DELAY", "1000"), 10),
  };
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
 * Reads an optional environment variable. Returns undefined if not set.
 */
function envOptional(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return undefined;
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
