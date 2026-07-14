// @forge/core
// Core domain models, interfaces, and base contracts.
// Platform-independent. No runtime dependencies.

/**
 * A discriminated result type for operations that may fail.
 * Either contains a success value or an error.
 */
export type Result<T, E = ForgeError> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E = ForgeError> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Creates a successful result.
 */
export function success<T>(value: T): Success<T> {
  return { ok: true, value };
}

/**
 * Creates a failed result.
 */
export function failure<E>(error: E): Failure<E> {
  return { ok: false, error };
}

/**
 * Base error type for Forge.
 * Wraps low-level errors with context for higher layers.
 */
export class ForgeError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "ForgeError";
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Log levels supported by Forge.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * A structured log entry.
 */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly component: string;
  readonly message: string;
  readonly executionId?: string;
  readonly websiteId?: string;
  readonly taskId?: string;
}
