// @forge/content-generation
// Deterministic brand compliance validator.
// No AI, no providers.

import type { BrandProfile } from "@forge/core";
import { checkProhibitedWords } from "../brand/prohibited.js";

export interface ComplianceValidationReport {
  readonly valid: boolean;
  readonly toneMatch: number;
  readonly prohibitedWordsFound: string[];
  readonly ctaPresent: boolean;
  readonly issues: string[];
}

export function validateCompliance(
  content: string,
  brand: BrandProfile,
): ComplianceValidationReport {
  const issues: string[] = [];
  const toneMatch = estimateToneMatch(content, brand.tone);
  const prohibited = checkProhibitedWords(content, brand.forbiddenWords);
  const ctaPresent = checkCtaPresence(content);

  if (toneMatch < 0.5) issues.push(`Tone does not match brand style (${brand.tone})`);
  if (prohibited.found.length > 0) issues.push(`Prohibited words found: ${prohibited.found.join(", ")}`);
  if (!ctaPresent && brand.ctaStyle !== "none") issues.push("No CTA detected");

  return {
    valid: issues.length === 0,
    toneMatch,
    prohibitedWordsFound: prohibited.found,
    ctaPresent,
    issues,
  };
}

function estimateToneMatch(content: string, expectedTone: string): number {
  const lower = content.toLowerCase();
  const toneKeywords: Record<string, string[]> = {
    formal: ["therefore", "consequently", "furthermore", "nevertheless"],
    neutral: ["provides", "offers", "includes", "features"],
    casual: ["hey", "awesome", "cool", "stuff", "guy"],
    professional: ["solution", "enterprise", "industry", "business"],
    conversational: ["you", "your", "we", "our", "let's"],
    minimalist: ["simple", "clean", "essential", "core"],
    authoritative: ["expert", "leading", "proven", "definitive"],
  };

  const keywords = toneKeywords[expectedTone.toLowerCase()] ?? toneKeywords.neutral;
  if (!keywords) {
    return 0;
  }
  const matches = keywords.filter((kw) => lower.includes(kw)).length;
  return Math.min(1, matches / keywords.length);
}

function checkCtaPresence(content: string): boolean {
  const ctaPatterns = [
    /learn more/i,
    /get started/i,
    /sign up/i,
    /contact us/i,
    /buy now/i,
    /try now/i,
    /subscribe/i,
    /register/i,
    /get in touch/i,
  ];
  return ctaPatterns.some((pattern) => pattern.test(content));
}
