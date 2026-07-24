// @forge/content-generation
// Deterministic quality scorer — no AI, no providers.
// Produces quality scores from validation results.

import type { SEOValidationReport } from "../validator/seo.js";

/**
 * Content quality scores for generated content.
 */
export interface ContentQualityReport {
  readonly seoScore: number;
  readonly readabilityScore: number;
  readonly naturalnessScore: number;
  readonly brandVoiceScore: number;
  readonly overallScore: number;
}

/**
 * Score generated content quality from validation results.
 */
export function scoreContent(
  seo: SEOValidationReport,
): ContentQualityReport {
  const seoScore = seo.score;
  const readabilityScore = estimateReadability(seo.wordCount);
  const naturalnessScore = estimateNaturalness(seo);
  const brandVoiceScore = 0.8;
  const overallScore = Math.round(
    (seoScore * 0.35 + readabilityScore * 0.25 + naturalnessScore * 0.2 + brandVoiceScore * 0.2),
  );

  return {
    seoScore,
    readabilityScore,
    naturalnessScore,
    brandVoiceScore,
    overallScore,
  };
}

function estimateReadability(wordCount: number): number {
  if (wordCount === 0) return 0;
  if (wordCount < 100) return 30;
  if (wordCount < 300) return 60;
  if (wordCount < 600) return 80;
  return 90;
}

function estimateNaturalness(seo: SEOValidationReport): number {
  let score = 70;
  if (seo.keywordCoverage > 0.3) score += 10;
  if (seo.wordCount > 200) score += 10;
  if (seo.issues.length === 0) score += 10;
  return Math.min(100, score);
}