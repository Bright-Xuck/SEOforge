// @forge/ai-engine/token-budget
// Token Budget Manager — tracks token consumption per request, session, and project.
// Prevents exceeding configured token limits and provides quota management.

export interface TokenBudgetConfig {
  readonly maxTokensPerRequest: number;
  readonly maxTokensPerSession: number;
  readonly maxTokensPerProject: number;
  readonly maxTokensPerDay: number;
  readonly warnAtPercent: number; // e.g. 0.8 = warn at 80%
}

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly timestamp: string;
}

export interface TokenBudgetStatus {
  readonly usage: number;
  readonly limit: number;
  readonly remaining: number;
  readonly percentUsed: number;
  readonly isExceeded: boolean;
  readonly shouldWarn: boolean;
}

export class TokenBudgetManager {
  private config: TokenBudgetConfig;
  private sessionTokens: Map<string, TokenUsage[]> = new Map();
  private projectTokens: Map<string, TokenUsage[]> = new Map();
  private dailyTokens: TokenUsage[] = [];

  constructor(config?: Partial<TokenBudgetConfig>) {
    this.config = {
      maxTokensPerRequest: config?.maxTokensPerRequest ?? 4096,
      maxTokensPerSession: config?.maxTokensPerSession ?? 32000,
      maxTokensPerProject: config?.maxTokensPerProject ?? 100000,
      maxTokensPerDay: config?.maxTokensPerDay ?? 500000,
      warnAtPercent: config?.warnAtPercent ?? 0.8,
    };
  }

  /**
   * Record token usage for a request, session, and project.
   */
  record(usage: TokenUsage, sessionId?: string, projectId?: string): void {
    this.dailyTokens.push(usage);

    if (sessionId) {
      const existing = this.sessionTokens.get(sessionId) ?? [];
      existing.push(usage);
      this.sessionTokens.set(sessionId, existing);
    }

    if (projectId) {
      const existing = this.projectTokens.get(projectId) ?? [];
      existing.push(usage);
      this.projectTokens.set(projectId, existing);
    }
  }

  /**
   * Get budget status for a session.
   */
  getSessionStatus(sessionId: string): TokenBudgetStatus {
    const usages = this.sessionTokens.get(sessionId) ?? [];
    const total = usages.reduce((sum, u) => sum + u.totalTokens, 0);
    return this.createStatus(total, this.config.maxTokensPerSession);
  }

  /**
   * Get budget status for a project.
   */
  getProjectStatus(projectId: string): TokenBudgetStatus {
    const usages = this.projectTokens.get(projectId) ?? [];
    const total = usages.reduce((sum, u) => sum + u.totalTokens, 0);
    return this.createStatus(total, this.config.maxTokensPerProject);
  }

  /**
   * Get budget status for daily usage.
   */
  getDailyStatus(): TokenBudgetStatus {
    const total = this.dailyTokens.reduce((sum, u) => sum + u.totalTokens, 0);
    return this.createStatus(total, this.config.maxTokensPerDay);
  }

  /**
   * Check if a request with the given token count would exceed any limits.
   */
  wouldExceed(tokens: number, sessionId?: string, projectId?: string): { wouldExceed: boolean; reason?: string } {
    if (tokens > this.config.maxTokensPerRequest) {
      return { wouldExceed: true, reason: `Request exceeds max tokens per request (${tokens} > ${this.config.maxTokensPerRequest})` };
    }

    if (sessionId) {
      const sessionTotal = (this.sessionTokens.get(sessionId) ?? []).reduce((s, u) => s + u.totalTokens, 0);
      if (sessionTotal + tokens > this.config.maxTokensPerSession) {
        return { wouldExceed: true, reason: "Session token limit would be exceeded" };
      }
    }

    if (projectId) {
      const projectTotal = (this.projectTokens.get(projectId) ?? []).reduce((s, u) => s + u.totalTokens, 0);
      if (projectTotal + tokens > this.config.maxTokensPerProject) {
        return { wouldExceed: true, reason: "Project token limit would be exceeded" };
      }
    }

    const dailyTotal = this.dailyTokens.reduce((s, u) => s + u.totalTokens, 0);
    if (dailyTotal + tokens > this.config.maxTokensPerDay) {
      return { wouldExceed: true, reason: "Daily token limit would be exceeded" };
    }

    return { wouldExceed: false };
  }

  /**
   * Reset daily token tracking.
   */
  resetDaily(): void {
    this.dailyTokens = [];
  }

  /**
   * Clear all tracked usage.
   */
  clear(): void {
    this.sessionTokens.clear();
    this.projectTokens.clear();
    this.dailyTokens = [];
  }

  private createStatus(usage: number, limit: number): TokenBudgetStatus {
    const percentUsed = limit > 0 ? usage / limit : 0;
    return {
      usage,
      limit,
      remaining: Math.max(0, limit - usage),
      percentUsed,
      isExceeded: usage >= limit,
      shouldWarn: percentUsed >= this.config.warnAtPercent,
    };
  }
}