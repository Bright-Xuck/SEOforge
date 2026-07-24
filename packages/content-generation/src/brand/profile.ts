// @forge/content-generation
// Deterministic BrandProfile builder from Knowledge + Memory.
// No AI, no providers.

import type { BrandProfile } from "@forge/core";
import type { KnowledgeGraph, MemorySummaryLike } from "@forge/knowledge-engine";

export interface BrandProfileInput {
  readonly knowledge: KnowledgeGraph;
  readonly memory: MemorySummaryLike;
  readonly projectId: string;
}

export function buildBrandProfile({ knowledge, memory: _memory, projectId }: BrandProfileInput): BrandProfile {
  const now = new Date().toISOString();
  const brandName = knowledge.brand ?? projectId;
  const industry = knowledge.industry ?? "general";
  const audiences = knowledge.targetAudience ? [knowledge.targetAudience] : ["general"];
  const tone = inferTone(knowledge);
  const writingStyle = inferWritingStyle(knowledge);

  return {
    id: `brand-${projectId}`,
    projectId,
    companyName: brandName,
    industry,
    subIndustry: undefined,
    companyType: "business",
    products: knowledge.products,
    services: knowledge.services,
    categories: knowledge.contentCategories,
    primaryTopics: knowledge.primaryKeywords,
    secondaryTopics: knowledge.secondaryKeywords,
    entities: [],
    competitors: knowledge.competitors,
    locations: [],
    targetCountries: [],
    languages: knowledge.languages,
    audiences,
    buyerPersonas: [],
    customerJourney: ["awareness", "consideration", "decision"],
    goals: knowledge.businessGoals,
    conversionGoals: [],
    uniqueSellingPoints: [],
    trustSignals: [],
    writingStyle,
    tone,
    readingLevel: "grade-8",
    forbiddenWords: [],
    preferredVocabulary: [],
    ctaStyle: "learn-more",
    createdAt: now,
    updatedAt: now,
  };
}

function inferTone(knowledge: KnowledgeGraph): string {
  if (knowledge.brandVoice) return knowledge.brandVoice.toLowerCase();
  if (knowledge.industry === "legal" || knowledge.industry === "finance") return "formal";
  if (knowledge.industry === "technology") return "professional";
  return "neutral";
}

function inferWritingStyle(knowledge: KnowledgeGraph): string {
  if (knowledge.industry === "legal" || knowledge.industry === "finance") return "formal";
  if (knowledge.industry === "technology") return "technical";
  return "conversational";
}
