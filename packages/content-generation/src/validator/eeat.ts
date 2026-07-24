// @forge/content-generation
// Deterministic EEAT validator.
// No AI, no providers.

export interface EEATValidationReport {
  readonly valid: boolean;
  readonly authorSignals: number;
  readonly citationQuality: number;
  readonly trustSignals: number;
  readonly expertiseIndicators: number;
  readonly issues: string[];
}

const AUTHOR_PATTERNS = [/written by/i, /author:/i, /expert:/i, /reviewed by/i];
const CITATION_PATTERNS = [/\[.*?\]\(.*?\)/, /https?:\/\//i];
const TRUST_PATTERNS = [/guarantee/i, /warranty/i, /certified/i, /award/i, /reviewed/i, /trusted/i];
const EXPERTISE_PATTERNS = [/years of experience/i, /specialist/i, /expert/i, /professional/i, /certified/i];

export function validateEEAT(content: string): EEATValidationReport {
  const issues: string[] = [];
  const authorSignals = countPatterns(content, AUTHOR_PATTERNS);
  const citationQuality = countPatterns(content, CITATION_PATTERNS);
  const trustSignals = countPatterns(content, TRUST_PATTERNS);
  const expertiseIndicators = countPatterns(content, EXPERTISE_PATTERNS);

  if (authorSignals === 0) issues.push("No author signals detected");
  if (citationQuality === 0) issues.push("No citations or external references detected");
  if (trustSignals === 0) issues.push("No trust signals detected");
  if (expertiseIndicators === 0) issues.push("No expertise indicators detected");

  return {
    valid: issues.length === 0,
    authorSignals,
    citationQuality,
    trustSignals,
    expertiseIndicators,
    issues,
  };
}

function countPatterns(content: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => {
    const matches = content.match(pattern);
    return count + (matches?.length ?? 0);
  }, 0);
}
