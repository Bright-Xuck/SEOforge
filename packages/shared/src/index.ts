// @forge/shared
// Reusable utilities, constants, and small helper functions.
// No business logic, providers, capabilities, or AI.

/**
 * Current version of Forge.
 */
export const FORGE_VERSION = "0.1.0";

/**
 * Application name for display purposes.
 */
export const FORGE_NAME = "Forge";

/**
 * Supported log level names.
 */
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

/**
 * Creates a deferred promise that can be resolved or rejected externally.
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  return Promise.withResolvers<T>();
}

/**
 * Sleeps for the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncates a string to the given length, appending ellipsis if truncated.
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength).trimEnd() + "...";
}
