// @forge/content-generation
// Deterministic quality sub-scoring.
// No AI, no providers.

export interface QualitySubScores {
  readonly seoScore: number;
  readonly readabilityScore: number;
  readonly naturalnessScore: number;
  readonly brandVoiceScore: number;
  readonly overallScore: number;
}

export function computeQualityScores(
  seoValidation: { score: number; wordCount: number; keywordCoverage: number; issues: { length: number } },
  readability: { fleschKincaidGrade: number },
  wordCount: number,
): QualitySubScores {
  const seoScore = seoValidation.score;
  const readabilityScore = estimateReadabilityScore(readability.fleschKincaidGrade, wordCount);
  const naturalnessScore = estimateNaturalness(seoValidation);
  const brandVoiceScore = 0.8;
  const overallScore = Math.round(seoScore * 0.35 + readabilityScore * 0.25 + naturalnessScore * 0.2 + brandVoiceScore * 0.2);

  return {
    seoScore,
    readabilityScore,
    naturalnessScore,
    brandVoiceScore,
    overallScore: Math.max(0, Math.min(100, overallScore)),
  };
}

function estimateReadabilityScore(grade: number, wordCount: number): number {
  if (wordCount === 0) return 0;
  let score = 100;
  if (grade > 12) score -= 20;
  else if (grade > 10) score -= 10;
  if (wordCount < 100) score -= 20;
  else if (wordCount < 300) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function estimateNaturalness(seoValidation: { keywordCoverage: number; issues: { length: number } }): number {
  let score = 70;
  if (seoValidation.keywordCoverage > 0.3) score += 10;
  if (seoValidation.issues.length === 0) score += 10;
  return Math.min(100, score);
}
