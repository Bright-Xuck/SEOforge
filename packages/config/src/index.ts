// @forge/config
// Configuration loading, environment validation, and feature flags.
// No business logic.

import process from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ForgeError } from "@forge/core";
import { FORGE_NAME } from "@forge/shared";

export type { ForgeError };

/**
 * Result of loading a dotenv file.
 *
 * The result intentionally reports variable *names* only. Values (which may be
 * API keys or application passwords) are never returned or logged.
 */
export interface EnvFileLoadResult {
  /** Absolute path that was inspected. */
  readonly path: string;
  /** Whether the file existed and was read successfully. */
  readonly loaded: boolean;
  /** Variables applied because they were not already present in the process. */
  readonly applied: string[];
  /** Variables skipped because the shell/process environment already had them. */
  readonly preserved: string[];
  /** Parse/read errors, with line numbers but never secret values. */
  readonly errors: string[];
}

export interface ParsedEnvFile {
  readonly values: Map<string, string>;
  readonly errors: string[];
}

/**
 * Load a dotenv file without overriding variables that already exist.
 *
 * Precedence is deliberately: real environment > `.env` file. This lets a
 * developer or CI system override a local file without editing it, and avoids
 * a checked-out `.env` silently changing a production shell environment.
 */
export function loadEnvFile(path = ".env"): EnvFileLoadResult {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    return { path: absolutePath, loaded: false, applied: [], preserved: [], errors: [] };
  }

  let raw: string;
  try {
    raw = readFileSync(absolutePath, "utf8");
  } catch (error) {
    return {
      path: absolutePath,
      loaded: false,
      applied: [],
      preserved: [],
      errors: [`Could not read ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const parsed = parseEnvFile(raw);
  const applied: string[] = [];
  const preserved: string[] = [];
  for (const [key, value] of parsed.values) {
    if (process.env[key] !== undefined) {
      preserved.push(key);
      continue;
    }
    process.env[key] = value;
    applied.push(key);
  }

  return {
    path: absolutePath,
    loaded: true,
    applied,
    preserved,
    errors: parsed.errors,
  };
}

/**
 * Parse dotenv syntax (KEY=VALUE) without reading or mutating the environment.
 *
 * Supported: comments, blank lines, optional `export`, single/double quotes,
 * escaped newlines/tabs in double-quoted values, and `#` comments after
 * unquoted values. Multiline values are not supported and produce an error
 * rather than being guessed.
 */
export function parseEnvFile(content: string): ParsedEnvFile {
  const values = new Map<string, string>();
  const errors: string[] = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const declaration = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
    const equals = declaration.indexOf("=");
    if (equals <= 0) {
      errors.push(`Line ${lineNumber}: expected KEY=VALUE.`);
      continue;
    }

    const key = declaration.slice(0, equals).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      errors.push(`Line ${lineNumber}: invalid variable name.`);
      continue;
    }

    const parsedValue = parseValue(declaration.slice(equals + 1).trim(), lineNumber);
    if (parsedValue.error) {
      errors.push(parsedValue.error);
      continue;
    }
    values.set(key, parsedValue.value);
  }

  return { values, errors };
}

function parseValue(raw: string, lineNumber: number): { value: string; error?: string } {
  if (raw.startsWith('"')) {
    const closing = findClosingDoubleQuote(raw);
    if (closing === -1) {
      return { value: "", error: `Line ${lineNumber}: unterminated double-quoted value.` };
    }
    const trailingError = validateTrailingCharacters(raw, closing, lineNumber, "double-quoted");
    if (trailingError) return { value: "", error: trailingError };
    const body = raw.slice(1, closing);
    const value = body
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    return { value };
  }

  if (raw.startsWith("'")) {
    const closing = raw.indexOf("'", 1);
    if (closing === -1) {
      return { value: "", error: `Line ${lineNumber}: unterminated single-quoted value.` };
    }
    const trailingError = validateTrailingCharacters(raw, closing, lineNumber, "single-quoted");
    if (trailingError) return { value: "", error: trailingError };
    return { value: raw.slice(1, closing) };
  }

  const commentIndex = raw.search(/\s#/);
  return { value: (commentIndex >= 0 ? raw.slice(0, commentIndex) : raw).trimEnd() };
}

function findClosingDoubleQuote(raw: string): number {
  for (let index = 1; index < raw.length; index += 1) {
    if (raw[index] === "\\") {
      index += 1;
      continue;
    }
    if (raw[index] === '"') return index;
  }
  return -1;
}

function validateTrailingCharacters(
  raw: string,
  closingIndex: number,
  lineNumber: number,
  kind: string,
): string | undefined {
  const trailing = raw.slice(closingIndex + 1).trim();
  if (trailing === "" || trailing.startsWith("#")) return undefined;
  return `Line ${lineNumber}: unexpected characters after ${kind} value.`;
}

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
  readonly zaiApiKey?: string;
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
    zaiApiKey: envOptional("ZAI_API_KEY"),
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
