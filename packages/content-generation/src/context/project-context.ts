// @forge/content-generation
// Aggregates project context from knowledge + memory engines.
// The generator asks these engines; it never loads JSON directly (ADR-0032).

import type { KnowledgeGraph, MemorySummaryLike, ProjectProfile } from "@forge/knowledge-engine";
import type { MissionContext } from "@forge/mission-engine";
import type { ProjectContext } from "../types.js";

/**
 * Build a ProjectContext from knowledge + memory + optional mission context.
 * Pure aggregation — no file I/O, no network.
 */
export function buildProjectContext(input: {
  readonly project: string;
  readonly profile: ProjectProfile;
  readonly knowledge: KnowledgeGraph;
  readonly memory: MemorySummaryLike;
  readonly recentOptimizations?: string[];
  readonly missionContext?: MissionContext;
}): ProjectContext {
  const { project, profile, knowledge, memory, recentOptimizations = [], missionContext } = input;
  return {
    project,
    profile,
    knowledge,
    memory,
    recentOptimizations,
    brandVoice: knowledge.brandVoice ?? "",
    preferredTone: knowledge.brandVoice ?? "neutral",
    competitors: knowledge.competitors ?? [],
    targetAudience: knowledge.targetAudience ?? "",
    missionGoal: missionContext?.missionTemplateId ?? "",
  };
}
