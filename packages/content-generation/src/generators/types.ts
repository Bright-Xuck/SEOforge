// @forge/content-generation
// Shared input contract for all section generators.

import type { AIEngine } from "@forge/ai-engine";
import type { PromptRegistry } from "@forge/prompt-registry";
import type { KnowledgeGraph, MemorySummaryLike, ProjectProfile } from "@forge/knowledge-engine";
import type { MissionContext } from "@forge/mission-engine";
import type { AudienceProfile, PageDNA, SearchIntent, SectionInfo } from "@forge/content-intelligence";
import type { BrandProfile } from "@forge/core";
import type { ProjectContext } from "../types.js";

/**
 * Input passed to every section generator.
 */
export interface SectionGeneratorInput {
  readonly project: string;
  readonly pageDna: PageDNA;
  readonly section: SectionInfo;
  readonly projectContext: ProjectContext;
  readonly knowledge: KnowledgeGraph;
  readonly memory: MemorySummaryLike;
  readonly profile: ProjectProfile;
  readonly missionContext?: MissionContext;
  readonly brand: BrandProfile;
  readonly targetKeyword: string;
  readonly intent: SearchIntent;
  readonly audience: AudienceProfile;
  readonly engine: AIEngine;
  readonly registry: PromptRegistry;
}
