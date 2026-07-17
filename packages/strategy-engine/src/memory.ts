import type { MemoryEvent, MemoryStore } from "@forge/memory-engine";
import type { Strategy } from "./types.js";

export function strategyToMemoryEvent(strategy: Strategy, type: MemoryEvent["type"]): MemoryEvent {
  return {
    id: strategy.metadata.id,
    type,
    project: strategy.goal.id,
    timestamp: strategy.metadata.createdAt,
    payload: {
      strategyId: strategy.metadata.id,
      status: strategy.metadata.status,
      riskLevel: strategy.riskLevel,
      selectedPipelines: strategy.selectedPipelines,
      selectedSkills: strategy.selectedSkills,
      estimatedTokens: strategy.estimatedTokens,
      estimatedDurationMs: strategy.estimatedDurationMs,
    },
  };
}

export function recordStrategyEvent(store: MemoryStore, strategy: Strategy, type: MemoryEvent["type"]): void {
  store.append(strategyToMemoryEvent(strategy, type));
}
