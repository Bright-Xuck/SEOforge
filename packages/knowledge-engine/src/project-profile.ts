import type { KnowledgeGraph } from "./types.js";
export interface MemorySummaryLike {
  readonly project: string;
  readonly total: number;
  readonly byType: Record<string, number>;
  readonly lastEventAt?: string;
}

export interface ProjectProfile {
  readonly project: string;
  readonly knowledge: KnowledgeGraph;
  readonly memorySummary: MemorySummaryLike;
}

export function createProjectProfile(knowledge: KnowledgeGraph, memorySummary: MemorySummaryLike): ProjectProfile {
  return {
    project: knowledge.project,
    knowledge,
    memorySummary,
  };
}
