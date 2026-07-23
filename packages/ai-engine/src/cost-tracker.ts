export interface CostRecord {
  readonly provider: string;
  readonly projectId?: string;
  readonly missionId?: string;
  readonly month: string; // YYYY-MM
  readonly cost: number;
  readonly tokens: number;
  readonly requests: number;
}

interface MutableCostRecord {
  provider: string;
  projectId?: string;
  missionId?: string;
  month: string;
  cost: number;
  tokens: number;
  requests: number;
}

/**
 * Tracks estimated costs per provider, project, mission, and month.
 * Stores locally in memory.
 */
export class CostTracker {
  private records: MutableCostRecord[] = [];

  /**
   * Record a cost entry.
   */
  record(entry: Omit<CostRecord, "month"> & { timestamp?: string }): void {
    const date = entry.timestamp ? new Date(entry.timestamp) : new Date();
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const existing = this.records.find(
      (r) =>
        r.provider === entry.provider &&
        r.projectId === entry.projectId &&
        r.missionId === entry.missionId &&
        r.month === month,
    );

    if (existing) {
      existing.cost += entry.cost;
      existing.tokens += entry.tokens;
      existing.requests += entry.requests;
    } else {
      this.records.push({
        provider: entry.provider,
        projectId: entry.projectId,
        missionId: entry.missionId,
        month,
        cost: entry.cost,
        tokens: entry.tokens,
        requests: entry.requests,
      });
    }
  }

  /**
   * Get costs for a specific provider.
   */
  getCostsByProvider(provider: string): CostRecord[] {
    return this.records.filter((r) => r.provider === provider);
  }

  /**
   * Get costs for a specific project.
   */
  getCostsByProject(projectId: string): CostRecord[] {
    return this.records.filter((r) => r.projectId === projectId);
  }

  /**
   * Get costs for a specific mission.
   */
  getCostsByMission(missionId: string): CostRecord[] {
    return this.records.filter((r) => r.missionId === missionId);
  }

  /**
   * Get costs for a specific month.
   */
  getCostsByMonth(month: string): CostRecord[] {
    return this.records.filter((r) => r.month === month);
  }

  /**
   * Get total cost across all records.
   */
  getTotalCost(): number {
    return this.records.reduce((s, r) => s + r.cost, 0);
  }

  /**
   * Get all cost records.
   */
  getAllRecords(): readonly CostRecord[] {
    return this.records.map((r) => ({ ...r }));
  }

  /**
   * Get a summary of costs, optionally filtered.
   */
  getSummary(provider?: string, projectId?: string, month?: string): { totalCost: number; totalRequests: number; totalTokens: number } {
    let filtered = this.records;
    if (provider) filtered = filtered.filter((r) => r.provider === provider);
    if (projectId) filtered = filtered.filter((r) => r.projectId === projectId);
    if (month) filtered = filtered.filter((r) => r.month === month);
    return {
      totalCost: filtered.reduce((s, r) => s + r.cost, 0),
      totalRequests: filtered.reduce((s, r) => s + r.requests, 0),
      totalTokens: filtered.reduce((s, r) => s + r.tokens, 0),
    };
  }

  /**
   * Clear all records.
   */
  clear(): void {
    this.records = [];
  }
}

/**
 * Estimate cost based on provider, model, and token usage.
 * Returns cost in USD.
 */
export function estimateCost(
  provider: string,
  _model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  // Approximate per-token costs (USD)
  const rates: Record<string, { prompt: number; completion: number }> = {
    openai: { prompt: 0.00001, completion: 0.00003 },
    anthropic: { prompt: 0.000015, completion: 0.000075 },
    gemini: { prompt: 0.000005, completion: 0.000015 },
    openrouter: { prompt: 0.00001, completion: 0.00003 },
    ollama: { prompt: 0, completion: 0 },
  };

  const rate = rates[provider] ?? { prompt: 0.00001, completion: 0.00003 };
  return promptTokens * rate.prompt + completionTokens * rate.completion;
}