// @forge/content-generation
// Deterministic quality validator.
// No AI, no providers.

export interface QualityValidationReport {
  readonly valid: boolean;
  readonly duplicatePhrases: string[];
  readonly placeholders: string[];
  readonly brandTermsUsed: string[];
  readonly issues: string[];
}

const PLACEHOLDER_PATTERN = /\{\{[^}]+\}\}|\{\{|\}\}/;
const DUPLICATE_PHRASE_MIN_LENGTH = 4;

export function validateQuality(
  content: string,
  brandTerms: string[] = [],
  prohibitedTerms: string[] = [],
): QualityValidationReport {
  const issues: string[] = [];
  const duplicatePhrases = findDuplicatePhrases(content);
  const placeholders = findPlaceholders(content);
  const brandTermsUsed = findBrandTerms(content, brandTerms);
  const prohibitedFound = findProhibitedTerms(content, prohibitedTerms);

  if (duplicatePhrases.length > 0) {
    issues.push(`Duplicate phrases detected: ${duplicatePhrases.join(", ")}`);
  }
  if (placeholders.length > 0) {
    issues.push(`Unresolved placeholders: ${placeholders.join(", ")}`);
  }
  if (prohibitedFound.length > 0) {
    issues.push(`Prohibited terms found: ${prohibitedFound.join(", ")}`);
  }

  return {
    valid: issues.length === 0,
    duplicatePhrases,
    placeholders,
    brandTermsUsed,
    issues,
  };
}

function findDuplicatePhrases(content: string): string[] {
  const words = content.split(/\s+/);
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length >= DUPLICATE_PHRASE_MIN_LENGTH && content.split(phrase).length > 2) {
      phrases.push(phrase);
    }
  }
  return [...new Set(phrases)];
}

function findPlaceholders(content: string): string[] {
  const matches = content.match(PLACEHOLDER_PATTERN);
  return matches ?? [];
}

function findBrandTerms(content: string, terms: string[]): string[] {
  const lower = content.toLowerCase();
  return terms.filter((term) => term && lower.includes(term.toLowerCase()));
}

function findProhibitedTerms(content: string, terms: string[]): string[] {
  const lower = content.toLowerCase();
  return terms.filter((term) => term && lower.includes(term.toLowerCase()));
}
