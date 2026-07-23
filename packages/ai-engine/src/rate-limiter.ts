import { RateLimitError } from "./errors.js";

interface RateLimitState {
  requests: number[];
  tokens: number[];
  concurrent: number;
}

/**
 * In-memory provider-aware rate limiter.
 * No external Redis. Tracks requests/minute, tokens/minute, concurrent requests.
 */
export class RateLimiter {
  private states: Map<string, RateLimitState> = new Map();
  private readonly maxRequestsPerMinute: number;
  private readonly maxTokensPerMinute: number;
  private readonly maxConcurrent: number;

  constructor(
    maxRequestsPerMinute = 60,
    maxTokensPerMinute = 100000,
    maxConcurrent = 5,
  ) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.maxTokensPerMinute = maxTokensPerMinute;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Acquire a slot for a request. Throws RateLimitError if limit exceeded.
   */
  async acquire(provider: string, estimatedTokens = 0): Promise<void> {
    const state = this.getOrCreateState(provider);
    const now = Date.now();

    // Clean old entries (older than 60 seconds)
    this.cleanOldEntries(state, now);

    // Check concurrent
    if (state.concurrent >= this.maxConcurrent) {
      throw new RateLimitError(provider);
    }

    // Check requests/minute
    if (state.requests.length >= this.maxRequestsPerMinute) {
      const oldest = state.requests[0] ?? now;
      const retryAfter = oldest + 60000 - now;
      throw new RateLimitError(provider, retryAfter);
    }

    // Check tokens/minute
    const totalTokens = state.tokens.reduce((a, b) => a + b, 0);
    if (totalTokens + estimatedTokens > this.maxTokensPerMinute) {
      throw new RateLimitError(provider);
    }

    state.requests.push(now);
    state.tokens.push(estimatedTokens);
    state.concurrent++;
  }

  /**
   * Release a slot after request completes.
   */
  release(provider: string): void {
    const state = this.states.get(provider);
    if (state) {
      state.concurrent = Math.max(0, state.concurrent - 1);
    }
  }

  private getOrCreateState(provider: string): RateLimitState {
    let state = this.states.get(provider);
    if (!state) {
      state = { requests: [], tokens: [], concurrent: 0 };
      this.states.set(provider, state);
    }
    return state;
  }

  private cleanOldEntries(state: RateLimitState, now: number): void {
    const cutoff = now - 60000;
    state.requests = state.requests.filter((t) => t > cutoff);
    state.tokens = state.tokens.slice(0, state.requests.length);
  }

  /**
   * Reset all rate limit states (useful for testing).
   */
  reset(): void {
    this.states.clear();
  }
}