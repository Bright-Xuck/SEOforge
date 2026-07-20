// @forge/content-generation
// Builds a SectionDiff between current and generated section content.

import type { SectionDiff } from "./types.js";

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim().length > 0);
}

function extractEntities(text: string): string[] {
  const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) ?? [];
  return [...new Set(matches)];
}

function estimateSeoScore(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const headings = (text.match(/^#{1,6}\s/gm) ?? []).length;
  const keywordHits = (text.match(/\b(best|top|guide|review|how to|vs)\b/gi) ?? []).length;
  let score = 0;
  if (words >= 40 && words <= 400) score += 40;
  else if (words > 0) score += 20;
  if (headings >= 1) score += 20;
  score += Math.min(40, keywordHits * 10);
  return Math.min(100, score);
}

/**
 * Build a structured diff between the current and generated section content.
 */
export function buildSectionDiff(sectionId: string, current: string, generated: string): SectionDiff {
  const currentSentences = splitSentences(current);
  const generatedSentences = splitSentences(generated);
  const currentSet = new Set(currentSentences);
  const generatedSet = new Set(generatedSentences);

  const changedSentences = generatedSentences.filter((sentence) => !currentSet.has(sentence));
  const addedEntities = extractEntities(generated).filter((entity) => !extractEntities(current).includes(entity));
  const removedEntities = extractEntities(current).filter((entity) => !generatedSet.has(entity));

  const seoScoreDelta = estimateSeoScore(generated) - estimateSeoScore(current);

  return {
    sectionId,
    current,
    generated,
    changedSentences,
    addedEntities,
    removedEntities,
    seoScoreDelta,
  };
}
