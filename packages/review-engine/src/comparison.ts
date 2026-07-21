// @forge/review-engine
// Pure deterministic comparison engine. No LLM, no network, no randomness.

import type { ReviewComparison } from "./types.js";

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

function tokenizeKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
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

function estimateReadability(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const sentences = splitSentences(text).length || 1;
  if (words === 0) return 0;
  // Simple Flesch-style heuristic: higher = easier to read.
  const wordsPerSentence = words / sentences;
  return Math.max(0, Math.min(100, 100 - (wordsPerSentence - 10) * 4));
}

/**
 * Compare two content strings and produce a structured, deterministic delta.
 * Pure function: identical inputs always yield identical output.
 */
export function compareContent(before: string, after: string): ReviewComparison {
  const beforeWords = before.trim().split(/\s+/).filter(Boolean);
  const afterWords = after.trim().split(/\s+/).filter(Boolean);

  const beforeWordSet = new Set(beforeWords);
  const afterWordSet = new Set(afterWords);

  const wordAdditions = afterWords.filter((word) => !beforeWordSet.has(word)).length;
  const wordRemovals = beforeWords.filter((word) => !afterWordSet.has(word)).length;

  const beforeSentences = splitSentences(before);
  const afterSentences = splitSentences(after);
  const beforeSentenceSet = new Set(beforeSentences);
  const afterSentenceSet = new Set(afterSentences);

  const sentenceAdditions = afterSentences.filter((sentence) => !beforeSentenceSet.has(sentence)).length;
  const sentenceRemovals = beforeSentences.filter((sentence) => !afterSentenceSet.has(sentence)).length;

  const beforeKeywords = new Set(tokenizeKeywords(before));
  const afterKeywords = new Set(tokenizeKeywords(after));
  const keywordAdditions = [...afterKeywords].filter((keyword) => !beforeKeywords.has(keyword));
  const keywordRemovals = [...beforeKeywords].filter((keyword) => !afterKeywords.has(keyword));

  const beforeHeadings = (before.match(/^#{1,6}\s/gm) ?? []).length;
  const afterHeadings = (after.match(/^#{1,6}\s/gm) ?? []).length;
  const headingChanges = afterHeadings - beforeHeadings;

  const beforeEntities = new Set(extractEntities(before));
  const afterEntities = new Set(extractEntities(after));
  const entityAdditions = [...afterEntities].filter((entity) => !beforeEntities.has(entity));
  const entityRemovals = [...beforeEntities].filter((entity) => !afterEntities.has(entity));

  const readabilityDelta = estimateReadability(after) - estimateReadability(before);
  const seoDelta = estimateSeoScore(after) - estimateSeoScore(before);

  return {
    wordAdditions,
    wordRemovals,
    sentenceAdditions,
    sentenceRemovals,
    readabilityDelta,
    seoDelta,
    keywordAdditions,
    keywordRemovals,
    headingChanges,
    entityAdditions,
    entityRemovals,
  };
}
