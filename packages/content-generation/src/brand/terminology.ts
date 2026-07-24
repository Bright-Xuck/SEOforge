// @forge/content-generation
// Deterministic terminology extraction from BrandProfile + Knowledge.
// No AI, no providers.

import type { BrandProfile } from "@forge/core";
import type { KnowledgeGraph } from "@forge/knowledge-engine";

export interface TerminologyResult {
  readonly preferred: string[];
  readonly prohibited: string[];
}

export function extractTerminology(brand: BrandProfile, knowledge: KnowledgeGraph): TerminologyResult {
  const preferred = [...brand.preferredVocabulary];
  const prohibited = [...brand.forbiddenWords];

  if (knowledge.primaryKeywords?.length) {
    preferred.push(...knowledge.primaryKeywords);
  }
  if (knowledge.secondaryKeywords?.length) {
    preferred.push(...knowledge.secondaryKeywords);
  }

  return {
    preferred: [...new Set(preferred)].filter(Boolean),
    prohibited: [...new Set(prohibited)].filter(Boolean),
  };
}
