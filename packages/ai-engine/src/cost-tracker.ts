// @forge/ai-engine/cost-tracker
// Tracks estimated costs per provider, project, mission, category, section, month, etc.
// Stores locally in memory.

import type { CostEntry, CostSummary } from "./types.js";

interface MutableCostEntry {
  id: string;
  provider: string;
  model: string;
  projectId?: string;
  missionId?: string;
  sessionId?: string;
  category?: string;
  section?: string;
  tokens: number;
  estimatedCost: number;
  timestamp: number;
}

/**
 * Tracks estimated costs with daily, monthly, yearly, section, and category granularity.
 */
export class CostTracker {
  private entries: MutableCostEntry[] = [];

  /**
   * Record a cost entry.
   */
  record(entry: CostEntry): void {
    const mutable: MutableCostEntry = {
      id: entry.id,
      provider: entry.provider,
      model: entry.model,
      projectId: entry.projectId,
      missionId: entry.missionId,
      sessionId: entry.sessionId,
      category: entry.category,
      section: entry.section,
      tokens: entry.tokens,
      estimatedCost: entry.estimatedCost,
      timestamp: entry.timestamp,
    };
    this.entries.push(mutable);
  }

  /**
   * Get costs for a specific provider.
   */
  getCostsByProvider(provider: string): CostEntry[] {
    return this.entries.filter((e) => e.provider === provider).map(toReadonly);
  }

  /**
   * Get costs for a specific project.
   */
  getCostsByProject(projectId: string): CostEntry[] {
    return this.entries.filter((e) => e.projectId === projectId).map(toReadonly);
  }

  /**
   * Get costs for a specific mission.
   */
  getCostsByMission(missionId: string): CostEntry[] {
    return this.entries.filter((e) => e.missionId === missionId).map(toReadonly);
  }

  /**
   * Get costs for a specific category.
   */
  getCostsByCategory(category: string): CostEntry[] {
    return this.entries.filter((e) => e.category === category).map(toReadonly);
  }

  /**
   * Get costs for a specific section.
   */
  getCostsBySection(section: string): CostEntry[] {
    return this.entries.filter((e) => e.section === section).map(toReadonly);
  }

  /**
   * Get costs for a specific month (YYYY-MM).
   */
  getCostsByMonth(month: string): CostEntry[] {
    return this.entries
      .filter((e) => {
        const d = new Date(e.timestamp);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return m === month;
      })
      .map(toReadonly);
  }

  /**
   * Get costs for a specific day (YYYY-MM-DD).
   */
  getCostsByDay(day: string): CostEntry[] {
    return this.entries
      .filter((e) => {
        const d = new Date(e.timestamp);
        const dd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dd === day;
      })
      .map(toReadonly);
  }

  /**
   * Get costs for a specific year (YYYY).
   */
  getCostsByYear(year: string): CostEntry[] {
    return this.entries
      .filter((e) => new Date(e.timestamp).getFullYear().toString() === year)
      .map(toReadonly);
  }

  /**
   * Get total cost across all records.
   */
  getTotalCost(): number {
    return this.entries.reduce((s, e) => s + e.estimatedCost, 0);
  }

  /**
   * Get all cost entries.
   */
  getAllEntries(): readonly CostEntry[] {
    return this.entries.map(toReadonly);
  }

  /**
   * Get a summary of costs over a period.
   */
  getSummary(
    startTime?: number,
    endTime?: number,
  ): CostSummary {
    let filtered = this.entries;
    if (startTime !== undefined) {
      filtered = filtered.filter((e) => e.timestamp >= startTime);
    }
    if (endTime !== undefined) {
      filtered = filtered.filter((e) => e.timestamp <= endTime);
    }

    const byProvider: Record<string, number> = {};
    const byProject: Record<string, number> = {};
    const byMission: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const bySection: Record<string, number> = {};
    let totalCost = 0;
    let totalTokens = 0;

    for (const entry of filtered) {
      totalCost += entry.estimatedCost;
      totalTokens += entry.tokens;
      byProvider[entry.provider] = (byProvider[entry.provider] ?? 0) + entry.estimatedCost;
      if (entry.projectId) {
        byProject[entry.projectId] = (byProject[entry.projectId] ?? 0) + entry.estimatedCost;
      }
      if (entry.missionId) {
        byMission[entry.missionId] = (byMission[entry.missionId] ?? 0) + entry.estimatedCost;
      }
      if (entry.category) {
        byCategory[entry.category] = (byCategory[entry.category] ?? 0) + entry.estimatedCost;
      }
      if (entry.section) {
        bySection[entry.section] = (bySection[entry.section] ?? 0) + entry.estimatedCost;
      }
    }

    const now = Date.now();
    const dailyTotal = this.getCostsByDay(formatDate(now)).reduce((s, e) => s + e.estimatedCost, 0);
    const monthlyTotal = this.getCostsByMonth(formatMonth(now)).reduce((s, e) => s + e.estimatedCost, 0);
    const yearlyTotal = this.getCostsByYear(new Date(now).getFullYear().toString()).reduce((s, e) => s + e.estimatedCost, 0);

    return {
      totalCost,
      totalTokens,
      byProvider,
      byProject,
      byMission,
      byCategory,
      bySection,
      dailyTotal,
      monthlyTotal,
      yearlyTotal,
      currency: "USD",
      periodStart: startTime ?? 0,
      periodEnd: endTime ?? now,
    };
  }

  /**
   * Clear all records.
   */
  clear(): void {
    this.entries = [];
  }
}

function toReadonly(e: MutableCostEntry): CostEntry {
  return {
    id: e.id,
    provider: e.provider,
    model: e.model,
    projectId: e.projectId,
    missionId: e.missionId,
    sessionId: e.sessionId,
    category: e.category,
    section: e.section,
    tokens: e.tokens,
    estimatedCost: e.estimatedCost,
    timestamp: e.timestamp,
  };
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMonth(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
