// @forge/content-generation
// Deterministic confidence estimation.
// No AI, no providers.

export interface ConfidenceReport {
  readonly score: number;
  readonly basis: string;
  readonly factors: {
    readonly seoScore: number;
    readonly readabilityScore: number;
    readonly lengthScore: number;
    readonly brandVoiceScore: number;
  };
}

export function estimateConfidence(
  seoScore: number,
  readabilityScore: number,
  wordCount: number,
  brandVoiceScore: number,
): ConfidenceReport {
  const lengthScore = wordCount < 50 ? 0.2 : wordCount < 150 ? 0.5 : wordCount < 300 ? 0.8 : 1;
  const factors = { seoScore: seoScore / 100, readabilityScore: readabilityScore / 100, lengthScore, brandVoiceScore: brandVoiceScore / 100 };
  const score = Math.min(1, (factors.seoScore * 0.3 + factors.readabilityScore * 0.25 + factors.lengthScore * 0.2 + factors.brandVoiceScore * 0.25));
  const basis = deriveBasis(factors);

  return { score, basis, factors };
}

function deriveBasis(factors: { seoScore: number; readabilityScore: number; lengthScore: number; brandVoiceScore: number }): string {
  const parts: string[] = [];
  if (factors.seoScore > 0.7) parts.push("strong SEO");
  if (factors.readabilityScore > 0.7) parts.push("readable");
  if (factors.lengthScore > 0.7) parts.push("adequate length");
  if (factors.brandVoiceScore > 0.7) parts.push("brand-aligned");
  if (parts.length === 0) return "low confidence: multiple quality gaps";
  return `high confidence: ${parts.join(", ")}`;
}
