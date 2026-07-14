// @forge/logger
// Structured logging with log levels and configuration.
// No business logic.

import type { LogEntry, LogLevel } from "@forge/core";
import process from "node:process";

export type { LogLevel, LogEntry };

/**
 * Logger configuration.
 */
export interface LoggerConfig {
  /** Minimum level to emit. Default: "info" */
  readonly level: LogLevel;
  /** Whether to include timestamps. Default: true */
  readonly timestamps: boolean;
  /** Output stream. Default: stdout */
  readonly output: "stdout" | "stderr";
}

const defaultConfig: LoggerConfig = {
  level: "info",
  timestamps: true,
  output: "stdout",
};

const levelOrder = new Map<LogLevel, number>([
  ["debug", 0],
  ["info", 1],
  ["warn", 2],
  ["error", 3],
]);

/**
 * Structured logger for Forge.
 *
 * Every log includes timestamp, level, component, and message.
 * Never use console.log — use this logger.
 */
export class Logger {
  private readonly component: string;
  private config: LoggerConfig;

  constructor(component: string, config?: Partial<LoggerConfig>) {
    this.component = component;
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Updates logger configuration at runtime.
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.emit("debug", message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.emit("info", message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.emit("warn", message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    this.emit("error", message, meta);
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const levelValue = levelOrder.get(level);
    const thresholdValue = levelOrder.get(this.config.level);

    if (levelValue === undefined || thresholdValue === undefined) {
      return;
    }

    if (levelValue < thresholdValue) {
      return;
    }

    const entry: LogEntry = {
      timestamp: this.config.timestamps ? new Date().toISOString() : "",
      level,
      component: this.component,
      message,
      ...(meta ?? {}),
    };

    const stream: NodeJS.WriteStream =
      this.config.output === "stderr" ? process.stderr : process.stdout;

    stream.write(JSON.stringify(entry) + "\n");
  }
}
