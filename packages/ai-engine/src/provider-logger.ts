export interface LogEntry {
  readonly provider: string;
  readonly model: string;
  readonly tokens: number;
  readonly latency: number;
  readonly costEstimate?: number;
  readonly error?: string;
  readonly retryCount: number;
  readonly timestamp: string;
}

/**
 * Logs every AI request.
 * Stores: provider, model, tokens, latency, cost estimate, errors, retry count, timestamp.
 * Never stores API keys.
 */
export class ProviderLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs: number;

  constructor(maxLogs = 10000) {
    this.maxLogs = maxLogs;
  }

  log(entry: Omit<LogEntry, "timestamp">): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);

    // Trim old logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(): readonly LogEntry[] {
    return this.logs;
  }

  getLogsByProvider(provider: string): LogEntry[] {
    return this.logs.filter((l) => l.provider === provider);
  }

  getLogsByTimeRange(start: Date, end: Date): LogEntry[] {
    return this.logs.filter((l) => {
      const ts = new Date(l.timestamp);
      return ts >= start && ts <= end;
    });
  }

  clear(): void {
    this.logs = [];
  }

  /**
   * Query logs with optional filters.
   */
  query(opts: { provider?: string; limit?: number }): LogEntry[] {
    let filtered = this.logs;
    if (opts.provider) filtered = filtered.filter((l) => l.provider === opts.provider);
    const limit = opts.limit ?? filtered.length;
    return filtered.slice(-limit);
  }

  getStats(): {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    errorRate: number;
    avgLatency: number;
  } {
    if (this.logs.length === 0) {
      return { totalRequests: 0, totalTokens: 0, totalCost: 0, errorRate: 0, avgLatency: 0 };
    }

    const totalRequests = this.logs.length;
    const totalTokens = this.logs.reduce((s, l) => s + l.tokens, 0);
    const totalCost = this.logs.reduce((s, l) => s + (l.costEstimate ?? 0), 0);
    const errors = this.logs.filter((l) => l.error).length;
    const totalLatency = this.logs.reduce((s, l) => s + l.latency, 0);

    return {
      totalRequests,
      totalTokens,
      totalCost,
      errorRate: errors / totalRequests,
      avgLatency: totalLatency / totalRequests,
    };
  }
}