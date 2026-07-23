import { createHash } from "node:crypto";

export interface PromptExecution {
  readonly promptVersion: string;
  readonly provider: string;
  readonly model: string;
  readonly renderedVariables: Record<string, unknown>;
  readonly tokenUsage: {
    readonly prompt: number;
    readonly completion: number;
    readonly total: number;
  };
  readonly latency: number;
  readonly resultChecksum: string;
  readonly timestamp: string;
}

/**
 * Persists prompt executions in memory.
 * In production, this would write to projects/<project>/prompts/.
 */
export class PromptHistory {
  private executions: PromptExecution[] = [];
  private readonly maxExecutions: number;

  constructor(maxExecutions = 10000) {
    this.maxExecutions = maxExecutions;
  }

  record(execution: Omit<PromptExecution, "timestamp" | "resultChecksum"> & { result?: string }): void {
    const resultChecksum = execution.result
      ? createHash("sha256").update(execution.result).digest("hex")
      : "";

    const record: PromptExecution = {
      ...execution,
      resultChecksum,
      timestamp: new Date().toISOString(),
    };

    this.executions.push(record);

    if (this.executions.length > this.maxExecutions) {
      this.executions = this.executions.slice(-this.maxExecutions);
    }
  }

  getHistory(): readonly PromptExecution[] {
    return this.executions;
  }

  getHistoryByProvider(provider: string): PromptExecution[] {
    return this.executions.filter((e) => e.provider === provider);
  }

  getHistoryByPromptVersion(version: string): PromptExecution[] {
    return this.executions.filter((e) => e.promptVersion === version);
  }

  /**
   * Query executions with optional filters.
   */
  query(opts: { project?: string; limit?: number }): PromptExecution[] {
    let filtered = this.executions;
    if (opts.project) filtered = filtered.filter((e) => e.renderedVariables?.project === opts.project || false);
    const limit = opts.limit ?? filtered.length;
    return filtered.slice(-limit);
  }

  clear(): void {
    this.executions = [];
  }
}