import { RetryExhaustedError, RateLimitError, AuthenticationError, InvalidRequestError } from "./errors.js";

export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

/**
 * Determines if an error is retryable.
 * Retry only for: 429, 503, timeouts, connection failures.
 * Never retry validation failures (400, 401, 403).
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof AuthenticationError) return false;
  if (error instanceof InvalidRequestError) return false;

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true; // Network/connection failure
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return true; // Timeout
  }

  // Check for HTTP status codes in error messages
  const msg = String(error);
  if (msg.includes("429") || msg.includes("503")) return true;
  if (msg.includes("400") || msg.includes("401") || msg.includes("403")) return false;

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter.
 */
export function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_CONFIG): number {
  const exponential = config.baseDelay * Math.pow(2, attempt);
  const capped = Math.min(exponential, config.maxDelay);
  const jitter = Math.random() * 0.1 * capped; // 10% jitter
  return Math.floor(capped + jitter);
}

/**
 * Execute a function with deterministic retry logic.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_CONFIG,
  providerName = "unknown",
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt >= config.maxRetries) {
        break;
      }

      const delay = calculateDelay(attempt, config);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new RetryExhaustedError(providerName, config.maxRetries, lastError);
}