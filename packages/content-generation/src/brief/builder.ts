// @forge/content-generation
// Deterministic ContentBrief builder — no AI, no providers.
// Consumes PageDNA + BrandProfile + KnowledgeGraph + MemoryStore.

import type { PageDNA, Entity, Topic } from "@forge/content-intelligence";
import type { BrandProfile } from "@forge/core";
import type { KnowledgeGraph, MemorySummaryLike } from "@forge/knowledge-engine";

/**
 * Content brief for a single section generation.
 */
export interface ContentBrief {
  readonly primaryKeyword: string;
  readonly secondaryKeywords: string[];
  readonly searchIntent: "informational" | "navigational" | "commercial" | "transactional";
  readonly audience: string;
  readonly tone: string;
  readonly readingLevel: string;
  readonly wordCountTarget: number;
  readonly competitors: string[];
  readonly pageGoal: string;
  readonly userQuestions: string[];
  readonly requiredEntities: string[];
  readonly internalLinks: string[];
  readonly ctaGoal: string;
  readonly brand: BrandProfile;
}

/**
 * Build a deterministic ContentBrief from available project data.
 */
export function buildContentBrief(
  pageDNA: PageDNA,
  brand: BrandProfile,
  knowledge: KnowledgeGraph,
  memory: MemorySummaryLike,
  targetKeyword?: string,
): ContentBrief {
  const intentPrimary = pageDNA.intent?.primary || "informational";
  const questions = extractUserQuestions(memory, "");

  return {
    primaryKeyword: targetKeyword || "",
    secondaryKeywords: extractSecondaryKeywords(pageDNA, knowledge),
    searchIntent: intentPrimary as ContentBrief["searchIntent"],
    audience: (brand.audiences?.[0] as unknown as string) || pageDNA.audience?.level || "general",
    tone: (brand.tone as unknown as string) || "professional",
    readingLevel: brand.readingLevel as string || pageDNA.readingLevel || "grade-8",
    wordCountTarget: estimateWordCount(intentPrimary),
    competitors: brand.competitors || [],
    pageGoal: `Optimize for ${intentPrimary} intent`,
    userQuestions: questions,
    requiredEntities: extractRequiredEntities(pageDNA, brand),
    internalLinks: [],
    ctaGoal: brand.ctaStyle || "learn-more",
    brand,
  };
}

function extractSecondaryKeywords(pageDNA: PageDNA, _knowledge: KnowledgeGraph): string[] {
  const fromDNA: string[] = (pageDNA.topics || []).map((t: Topic) => t.term).slice(0, 5);
  return fromDNA;
}

function extractUserQuestions(_memory: MemorySummaryLike, _keyword: string): string[] {
  return [];
}

function extractRequiredEntities(pageDNA: PageDNA, brand: BrandProfile): string[] {
  const fromBrand = brand.entities || [];
  const fromDNA: string[] = (pageDNA.entities || []).map((e: Entity) => e.value);
  return [...new Set([...fromBrand, ...fromDNA])].filter(Boolean);
}

function estimateWordCount(intent: string): number {
  const map: Record<string, number> = {
    informational: 1200,
    commercial: 1500,
    transactional: 800,
    navigational: 500,
  };
  return map[intent] || 1000;
}
